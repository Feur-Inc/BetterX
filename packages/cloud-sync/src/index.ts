import { Hono, type MiddlewareHandler } from "hono";
import { serveStatic } from "hono/bun";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db/schema.js";

type Env = {
  Variables: {
    user: { id: string; username?: string };
  };
};

function requiredEnv(name: string, minLength = 1): string {
  const value = process.env[name]?.trim();
  if (!value || value.length < minLength) {
    throw new Error(
      `${name} must be configured${minLength > 1 ? ` with at least ${minLength} characters` : ""}`
    );
  }
  return value;
}

const BASE_URL = new URL(requiredEnv("BASE_URL"));
if (
  BASE_URL.protocol !== "https:" &&
  BASE_URL.hostname !== "localhost" &&
  BASE_URL.hostname !== "127.0.0.1"
) {
  throw new Error("BASE_URL must use HTTPS outside local development");
}
const TWITTER_CLIENT_ID = requiredEnv("TWITTER_CLIENT_ID");
const TWITTER_CLIENT_SECRET = requiredEnv("TWITTER_CLIENT_SECRET");
const ALLOWED_ORIGINS = new Set([
  BASE_URL.origin,
  ...(process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);
const app = new Hono<Env>();
const JWT_SECRET = new TextEncoder().encode(requiredEnv("SESSION_SECRET", 32));
const MAX_CONFIG_BYTES = 5_000_000;
const MAX_PLUGINS = 250;
const MAX_THEMES = 100;
const MAX_THEME_BYTES = 2_000_000;
const MAX_SETTINGS_DEPTH = 20;
const MAX_SETTINGS_NODES = 10_000;

app.use("*", honoLogger());
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
  c.header(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  );
});
app.use(
  "*",
  cors({
    origin: (origin) => (origin && ALLOWED_ORIGINS.has(origin) ? origin : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── Middleware for Auth ─────────────────────────────────────────────────────
const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const token = getCookie(c, "bx_session");
  const path = c.req.path;
  const isApi = path.startsWith("/api/");

  if (!token) {
    if (isApi) return c.json({ error: "Unauthorized", reason: "no_token" }, 401);
    return c.redirect("/auth/twitter");
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: BASE_URL.origin,
      audience: "betterx-cloud",
    });
    if (typeof payload.id !== "string" || payload.id.length === 0) {
      throw new Error("Session is missing a user id");
    }
    const user = { id: payload.id } as { id: string; username?: string };
    if (typeof payload.username === "string") user.username = payload.username;
    c.set("user", user);
    await next();
  } catch {
    if (isApi) return c.json({ error: "Unauthorized", reason: "invalid_token" }, 401);
    return c.redirect("/auth/twitter");
  }
};

// ─── Twitter OAuth Flow ──────────────────────────────────────────────────────
const TWITTER_OAUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_USER_URL = "https://api.twitter.com/2/users/me";

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// 32 bytes -> 43 base64url chars, the minimum length RFC 7636 allows for a verifier
function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

// SameSite=Lax so the cookies survive Twitter's top-level GET redirect back to /auth/callback
const OAUTH_COOKIE = {
  httpOnly: true,
  maxAge: 600,
  path: "/",
  sameSite: "Lax",
  secure: BASE_URL.protocol === "https:",
} as const;

app.get("/auth/twitter", async (c) => {
  const state = randomToken();
  const codeVerifier = randomToken();

  setCookie(c, "oauth_state", state, OAUTH_COOKIE);
  setCookie(c, "oauth_verifier", codeVerifier, OAUTH_COOKIE);

  const url = new URL(TWITTER_OAUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", TWITTER_CLIENT_ID);
  url.searchParams.set("redirect_uri", `${BASE_URL.origin}/auth/callback`);
  url.searchParams.set("scope", "tweet.read users.read");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await pkceChallenge(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");

  return c.redirect(url.toString());
});

app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");
  const codeVerifier = getCookie(c, "oauth_verifier");

  if (!code || !storedState || state !== storedState) return c.text("Invalid state", 400);
  if (!codeVerifier) return c.text("Missing PKCE verifier", 400);

  // Single-use: don't leave them around for a replay of this callback
  deleteCookie(c, "oauth_state", { path: "/" });
  deleteCookie(c, "oauth_verifier", { path: "/" });

  // Exchange code for token
  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: `${BASE_URL.origin}/auth/callback`,
      code_verifier: codeVerifier,
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok || typeof data.access_token !== "string") {
    return c.json({ error: "Twitter token exchange failed" }, 400);
  }

  // Get user info
  const userRes = await fetch(`${TWITTER_USER_URL}?user.fields=profile_image_url`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const userData = (await userRes.json()) as { data?: Record<string, unknown> };
  const twitterUser = userData.data;

  if (!userRes.ok || typeof twitterUser?.id !== "string") {
    console.error(`Twitter user fetch failed (${userRes.status})`);
    return c.json({ error: "Failed to fetch Twitter user" }, 502);
  }

  // Sync with DB — update username + pfp on re-login
  const username = typeof twitterUser.username === "string" ? twitterUser.username : "unknown";
  const profileImageUrl =
    typeof twitterUser.profile_image_url === "string" ? twitterUser.profile_image_url : null;

  db.run(
    `
    INSERT INTO users (id, twitter_id, username, profile_image_url)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      profile_image_url = excluded.profile_image_url
  `,
    [twitterUser.id, twitterUser.id, username, profileImageUrl]
  );

  const token = await new SignJWT({ id: twitterUser.id, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(BASE_URL.origin)
    .setAudience("betterx-cloud")
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  const secure = BASE_URL.protocol === "https:";
  setCookie(c, "bx_session", token, {
    httpOnly: true,
    maxAge: 30 * 24 * 3600,
    path: "/",
    sameSite: secure ? "None" : "Lax",
    secure,
  });
  return c.redirect("/");
});

app.post("/auth/logout", (c) => {
  deleteCookie(c, "bx_session", { path: "/" });
  return c.redirect("/auth/twitter");
});

// ─── Validation Helpers ──────────────────────────────────────────────────────
type JsonObject = Record<string, unknown>;
type StoredConfig = {
  plugin_states: Record<string, { enabled: boolean; settings: JsonObject }>;
  theme_state: { order: string[]; active: string[]; themes: Record<string, string> };
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validThemeId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}\.css$/.test(value);
}

function isBoundedJsonValue(value: unknown): boolean {
  let remaining = MAX_SETTINGS_NODES;
  const visit = (candidate: unknown, depth: number): boolean => {
    if (--remaining < 0 || depth > MAX_SETTINGS_DEPTH) return false;
    if (candidate === null || typeof candidate === "string" || typeof candidate === "boolean") {
      return true;
    }
    if (typeof candidate === "number") return Number.isFinite(candidate);
    if (Array.isArray(candidate)) return candidate.every((item) => visit(item, depth + 1));
    if (!isObject(candidate)) return false;
    return Object.entries(candidate).every(
      ([key, item]) => key.length <= 200 && visit(item, depth + 1)
    );
  };
  return visit(value, 0);
}

function validateConfig(data: unknown): StoredConfig | null {
  if (!isObject(data)) return null;

  const pluginStates: StoredConfig["plugin_states"] = {};
  if (isObject(data.plugin_states)) {
    const entries = Object.entries(data.plugin_states);
    if (entries.length > MAX_PLUGINS) return null;
    for (const [key, value] of entries) {
      if (key.length === 0 || key.length > 100 || !isObject(value)) return null;
      const candidateSettings = isObject(value.settings)
        ? value.settings
        : isObject(value.store)
          ? value.store
          : {};
      if (!isBoundedJsonValue(candidateSettings)) return null;
      pluginStates[key] = {
        enabled: value.enabled === true,
        settings: candidateSettings,
      };
    }
  }

  const rawThemeState = isObject(data.theme_state) ? data.theme_state : {};
  const themes: Record<string, string> = {};
  if (isObject(rawThemeState.themes)) {
    const entries = Object.entries(rawThemeState.themes);
    if (entries.length > MAX_THEMES) return null;
    for (const [id, css] of entries) {
      if (!validThemeId(id) || typeof css !== "string" || css.length > MAX_THEME_BYTES) {
        return null;
      }
      themes[id] = css;
    }
  }

  const normalizeIds = (value: unknown): string[] =>
    Array.isArray(value) ? [...new Set(value.filter(validThemeId))].slice(0, MAX_THEMES) : [];

  return {
    plugin_states: pluginStates,
    theme_state: {
      order: normalizeIds(rawThemeState.order),
      active: normalizeIds(rawThemeState.active),
      themes,
    },
  };
}

function emptyConfig(): StoredConfig {
  return { plugin_states: {}, theme_state: { order: [], active: [], themes: {} } };
}

function readStoredConfig(row: unknown): StoredConfig {
  if (
    !isObject(row) ||
    typeof row.plugin_states !== "string" ||
    typeof row.theme_state !== "string"
  ) {
    return emptyConfig();
  }
  try {
    return (
      validateConfig({
        plugin_states: JSON.parse(row.plugin_states),
        theme_state: JSON.parse(row.theme_state),
      }) ?? emptyConfig()
    );
  } catch {
    return emptyConfig();
  }
}

// ─── API Endpoints ───────────────────────────────────────────────────────────
app.get("/api/config", authMiddleware, (c) => {
  const user = c.get("user");
  const config = db
    .query("SELECT plugin_states, theme_state FROM configs WHERE user_id = ?")
    .get(user.id);
  return c.json(readStoredConfig(config));
});

app.get("/api/me", authMiddleware, (c) => {
  const user = c.get("user");
  const row = db
    .query("SELECT username, profile_image_url FROM users WHERE id = ?")
    .get(user.id) as { username?: string; profile_image_url?: string } | null;
  return c.json({
    id: user.id,
    username: row?.username ?? user.username,
    profile_image_url: row?.profile_image_url ?? null,
  });
});

app.post("/api/config", authMiddleware, async (c) => {
  const user = c.get("user");
  const contentLength = Number(c.req.header("content-length") ?? 0);
  if (contentLength > MAX_CONFIG_BYTES) return c.json({ error: "Config is too large" }, 413);

  let body: unknown;
  try {
    const reader = c.req.raw.body?.getReader();
    if (!reader) return c.json({ error: "Missing request body" }, 400);
    const decoder = new TextDecoder();
    let total = 0;
    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_CONFIG_BYTES) {
        await reader.cancel();
        return c.json({ error: "Config is too large" }, 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    body = JSON.parse(raw) as unknown;
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const validated = validateConfig(body);
  if (!validated) return c.json({ error: "Invalid config format" }, 400);

  db.run(
    `
    INSERT INTO configs (user_id, plugin_states, theme_state, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      plugin_states = excluded.plugin_states,
      theme_state = excluded.theme_state,
      updated_at = CURRENT_TIMESTAMP
  `,
    [user.id, JSON.stringify(validated.plugin_states), JSON.stringify(validated.theme_state)]
  );

  return c.json({ success: true });
});

// ─── Frontend SSR ────────────────────────────────────────────────────────────
app.get("/", authMiddleware, (c) => {
  const user = c.get("user");
  const displayUsername = (user.username ?? "unknown")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>BetterX Cloud Sync</title>
        <style>
          body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6; background: #15202b; color: white; }
          .card { background: #1e2732; padding: 20px; border-radius: 12px; border: 1px solid #38444d; margin-bottom: 20px; }
          button { background: #1d9bf0; color: white; border: none; padding: 10px 20px; border-radius: 9999px; cursor: pointer; font-weight: bold; }
          button:hover { background: #1a8cd8; }
          button:disabled { opacity: 0.5; cursor: not-allowed; }
          pre { background: #000; padding: 10px; border-radius: 8px; overflow: auto; max-height: 300px; font-size: 12px; }
          input[type="file"] { background: #000; color: #71767b; border: 1px solid #38444d; border-radius: 8px; padding: 10px; width: 100%; box-sizing: border-box; }
        </style>
      </head>
      <body>
        <h1>BetterX Sync</h1>
        <div class="card">
          <p>Logged in as <strong>@${displayUsername}</strong></p>
          <form method="post" action="/auth/logout"><button type="submit">Logout</button></form>
          <h3>Export Config</h3>
          <p>Download your current cloud settings as a JSON file.</p>
          <button onclick="exportConfig()">Download betterx-config.json</button>
        </div>

        <div class="card">
          <h3>Import Config</h3>
          <p>Upload a JSON file to overwrite your cloud settings.</p>
          <input type="file" id="fileInput" accept=".json,application/json">
          <br><br>
          <button id="uploadBtn" onclick="importConfig()">Upload & Overwrite</button>
        </div>

        <script>
          async function exportConfig() {
            const res = await fetch('/api/config');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'betterx-config.json';
            a.click();
          }

          async function importConfig() {
            const fileInput = document.getElementById('fileInput');
            const uploadBtn = document.getElementById('uploadBtn');
            const file = fileInput.files[0];
            
            if (!file) {
              alert('Please select a file first');
              return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                const data = JSON.parse(e.target.result);
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';
                
                const res = await fetch('/api/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                
                const result = await res.json();
                if (res.ok) alert('Config imported and validated successfully!');
                else alert('Import failed: ' + (result.error || 'Unknown error'));
              } catch (err) {
                alert('Invalid JSON file');
              } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload & Overwrite';
              }
            };
            reader.readAsText(file);
          }
        </script>
      </body>
    </html>
  `);
});

export default {
  port: process.env.PORT || 4000,
  fetch: app.fetch,
};
