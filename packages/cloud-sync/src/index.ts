import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { db } from "./db/schema.js";
import { SignJWT, jwtVerify } from "jose";

type Env = {
  Variables: {
    user: any;
  };
};

const app = new Hono<Env>();
const JWT_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "default_secret_change_me");

app.use("*", honoLogger());
app.use("*", cors({
  origin: (origin) => {
    if (!origin) return null;
    if (
      origin.startsWith("chrome-extension://") || 
      origin.startsWith("moz-extension://") || 
      origin === process.env.BASE_URL ||
      origin.includes("twitter.com") ||
      origin.includes("x.com")
    ) {
      return origin;
    }
    return null;
  },
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ─── Middleware for Auth ─────────────────────────────────────────────────────
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, "bx_session");
  const path = c.req.path;
  const isApi = path.startsWith("/api/");
  
  if (!token) {
    if (isApi) return c.json({ error: "Unauthorized", reason: "no_token" }, 401);
    return c.redirect("/auth/twitter");
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    c.set("user", payload);
    await next();
  } catch (e) {
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
const OAUTH_COOKIE = { httpOnly: true, maxAge: 600, path: "/", sameSite: "Lax" } as const;

app.get("/auth/twitter", async (c) => {
  const state = randomToken();
  const codeVerifier = randomToken();

  setCookie(c, "oauth_state", state, OAUTH_COOKIE);
  setCookie(c, "oauth_verifier", codeVerifier, OAUTH_COOKIE);

  const url = new URL(TWITTER_OAUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${process.env.BASE_URL}/auth/callback`);
  url.searchParams.set("scope", "tweet.read users.read offline.access");
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
      Authorization: `Basic ${btoa(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.BASE_URL}/auth/callback`,
      code_verifier: codeVerifier,
    }),
  });

  const data: any = await response.json();
  if (!data.access_token) return c.json(data, 400);

  // Get user info
  const userRes = await fetch(`${TWITTER_USER_URL}?user.fields=profile_image_url`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const userData: any = await userRes.json();
  const twitterUser = userData.data;

  if (!twitterUser?.id) {
    console.error("Twitter user fetch failed:", JSON.stringify(userData));
    return c.json({ error: "Failed to fetch Twitter user", details: userData }, 500);
  }

  // Sync with DB — update username + pfp on re-login
  db.run(`
    INSERT INTO users (id, twitter_id, username, profile_image_url)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      profile_image_url = excluded.profile_image_url
  `, [twitterUser.id, twitterUser.id, twitterUser.username, twitterUser.profile_image_url ?? null]);

  const token = await new SignJWT({ id: twitterUser.id, username: twitterUser.username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  setCookie(c, "bx_session", token, { httpOnly: true, maxAge: 30 * 24 * 3600, sameSite: "None", secure: true });
  return c.redirect("/");
});

app.get("/auth/logout", (c) => {
  deleteCookie(c, "bx_session");
  return c.redirect("/auth/twitter");
});

// ─── Validation Helpers ──────────────────────────────────────────────────────
function validateConfig(data: any): { plugin_states: any, theme_state: any } | null {
  if (!data || typeof data !== "object") return null;

  const plugin_states: Record<string, any> = {};
  if (data.plugin_states && typeof data.plugin_states === "object") {
    for (const [key, value] of Object.entries(data.plugin_states)) {
      if (typeof key !== "string" || !value || typeof value !== "object") continue;
      const v = value as any;
      // Accept both "settings" (actual app format) and "store" (legacy)
      const settings = (v.settings && typeof v.settings === "object") ? v.settings
        : (v.store && typeof v.store === "object") ? v.store
        : {};
      plugin_states[key] = {
        enabled: Boolean(v.enabled),
        settings,
      };
    }
  }

  const theme_state = {
    order: Array.isArray(data.theme_state?.order) ? data.theme_state.order.filter((i: any) => typeof i === "string") : [],
    active: Array.isArray(data.theme_state?.active) ? data.theme_state.active.filter((i: any) => typeof i === "string") : []
  };

  return { plugin_states, theme_state };
}

// ─── API Endpoints ───────────────────────────────────────────────────────────
app.get("/api/config", authMiddleware, (c) => {
  const user = c.get("user") as any;
  const config = db.query("SELECT * FROM configs WHERE user_id = ?").get(user.id) as any;
  return c.json(config ? {
    plugin_states: JSON.parse(config.plugin_states),
    theme_state: JSON.parse(config.theme_state)
  } : { plugin_states: {}, theme_state: { order: [], active: [] } });
});

app.get("/api/me", authMiddleware, (c) => {
  const user = c.get("user") as any;
  const row = db.query("SELECT username, profile_image_url FROM users WHERE id = ?").get(user.id) as any;
  return c.json({
    id: user.id,
    username: row?.username ?? user.username,
    profile_image_url: row?.profile_image_url ?? null,
  });
});

app.post("/api/config", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  let body: any;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const validated = validateConfig(body);
  if (!validated) return c.json({ error: "Invalid config format" }, 400);
  
  db.run(`
    INSERT INTO configs (user_id, plugin_states, theme_state, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      plugin_states = excluded.plugin_states,
      theme_state = excluded.theme_state,
      updated_at = CURRENT_TIMESTAMP
  `, [
    user.id,
    JSON.stringify(validated.plugin_states),
    JSON.stringify(validated.theme_state)
  ]);

  return c.json({ success: true });
});

// ─── Frontend SSR ────────────────────────────────────────────────────────────
app.get("/", authMiddleware, (c) => {
  const user = c.get("user") as any;
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
          <p>Logged in as <strong>@${user.username}</strong> &nbsp; <a href="/auth/logout" style="color:#f4212e;font-size:14px;">Logout</a></p>
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
