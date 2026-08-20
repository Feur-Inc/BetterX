import type { PluginStorageData } from "../../types/plugin.js";
import type { IStorage } from "../../types/storage.js";
import type { ThemeStorageState } from "../../types/theme.js";
import { BETTERX_VERSION } from "../../utils/constants.js";
import { logger } from "../../utils/logger.js";
import { proxyFetch } from "../../utils/proxy.js";
import type { BetterXContext, SettingsTab } from "../tab-registry.js";

// ─── Cloud Sync Tab ───────────────────────────────────────────────────────────

const DEFAULT_SERVER = "https://cloud.betterx.mopigames.dev";
const AUTO_SYNC_INTERVAL_MS = 30_000;

type CloudThemeState = ThemeStorageState & { themes: Record<string, string> };
type CloudConfig = {
  plugin_states: Record<string, PluginStorageData>;
  theme_state: CloudThemeState;
};

let autoSyncTimer: number | null = null;
let lastAutoSyncSnapshot = "";
let autoSyncRunning = false;

function normalizeServer(value: string): string {
  const url = new URL(value || DEFAULT_SERVER);
  const isLoopback =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error("Cloud server must use HTTPS (HTTP is allowed only on loopback)");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Cloud server must be an origin without a path");
  }
  return url.origin;
}

function isPluginState(value: unknown): value is PluginStorageData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.enabled === "boolean" &&
    !!state.settings &&
    typeof state.settings === "object" &&
    !Array.isArray(state.settings)
  );
}

function parseCloudConfig(value: unknown): CloudConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const config = value as Record<string, unknown>;
  if (
    !config.plugin_states ||
    typeof config.plugin_states !== "object" ||
    !config.theme_state ||
    typeof config.theme_state !== "object"
  )
    return null;

  const pluginStates = Object.fromEntries(
    Object.entries(config.plugin_states).filter((entry): entry is [string, PluginStorageData] =>
      isPluginState(entry[1])
    )
  );
  const themeState = config.theme_state as Record<string, unknown>;
  const themes =
    themeState.themes && typeof themeState.themes === "object"
      ? Object.fromEntries(
          Object.entries(themeState.themes).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string"
          )
        )
      : {};
  const ids = new Set(Object.keys(themes));
  const normalizeIds = (items: unknown): string[] =>
    Array.isArray(items)
      ? [
          ...new Set(
            items.filter(
              (id): id is string => typeof id === "string" && (ids.has(id) || id.endsWith(".css"))
            )
          ),
        ]
      : [];

  return {
    plugin_states: pluginStates,
    theme_state: {
      order: normalizeIds(themeState.order),
      active: normalizeIds(themeState.active),
      themes,
    },
  };
}

async function collectCloudConfig(storage: IStorage): Promise<CloudConfig> {
  const [pluginStates, themeState, themeIds] = await Promise.all([
    storage.getPluginStates(),
    storage.getThemeState(),
    storage.listThemes(),
  ]);
  const themes: Record<string, string> = {};
  for (const id of themeIds) themes[id] = await storage.readTheme(id);
  return { plugin_states: pluginStates, theme_state: { ...themeState, themes } };
}

async function applyCloudConfig(storage: IStorage, config: CloudConfig): Promise<void> {
  for (const [id, css] of Object.entries(config.theme_state.themes)) {
    await storage.writeTheme(id, css);
  }
  await storage.setPluginStates(config.plugin_states);
  await storage.setThemeState({
    order: config.theme_state.order,
    active: config.theme_state.active,
  });
}

async function pushCloudConfig(storage: IStorage, server: string): Promise<boolean> {
  const config = await collectCloudConfig(storage);
  const response = await proxyFetch(`${server}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
    credentials: "include",
  });
  return response.ok;
}

async function runAutoSync(ctx: BetterXContext): Promise<void> {
  if (autoSyncRunning || localStorage.getItem("bx_autosync") !== "true") return;
  autoSyncRunning = true;
  try {
    const config = await collectCloudConfig(ctx.storage);
    const snapshot = JSON.stringify(config);
    if (snapshot === lastAutoSyncSnapshot) return;
    const server = normalizeServer(localStorage.getItem("bx_cloud_server") || DEFAULT_SERVER);
    const response = await proxyFetch(`${server}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: snapshot,
      credentials: "include",
    });
    if (response.ok) lastAutoSyncSnapshot = snapshot;
  } catch (error) {
    logger.warn("Automatic cloud sync failed", error);
  } finally {
    autoSyncRunning = false;
  }
}

export function startCloudAutoSync(ctx: BetterXContext): void {
  if (autoSyncTimer !== null) window.clearInterval(autoSyncTimer);
  collectCloudConfig(ctx.storage)
    .then((config) => {
      lastAutoSyncSnapshot = JSON.stringify(config);
    })
    .catch((error) => logger.warn("Could not initialize automatic cloud sync", error));
  autoSyncTimer = window.setInterval(() => void runAutoSync(ctx), AUTO_SYNC_INTERVAL_MS);
}

// ─── Local JSON Config Helpers ──────────────────────────────────────────────

async function exportConfig(storage: IStorage): Promise<string> {
  const pluginStates = await storage.getPluginStates();
  const themeState = await storage.getThemeState();
  const themeIds = await storage.listThemes();
  const themes: Record<string, string> = {};
  for (const id of themeIds) {
    themes[id] = await storage.readTheme(id);
  }
  return JSON.stringify({ version: BETTERX_VERSION, pluginStates, themeState, themes }, null, 2);
}

async function importConfig(storage: IStorage, json: string, ctx: BetterXContext): Promise<void> {
  if (json.length > 5_000_000) throw new Error("Config file is too large");
  const raw = JSON.parse(json) as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid config");
  const data = raw as Record<string, unknown>;

  const pluginStates: Record<string, PluginStorageData> = {};
  const hasPluginStates = data.pluginStates !== undefined;
  if (hasPluginStates) {
    if (
      !data.pluginStates ||
      typeof data.pluginStates !== "object" ||
      Array.isArray(data.pluginStates)
    ) {
      throw new Error("Invalid plugin states");
    }
    const entries = Object.entries(data.pluginStates);
    if (entries.length > 250) throw new Error("Too many plugin states");
    for (const [name, state] of entries) {
      if (name.length > 100 || !isPluginState(state)) throw new Error("Invalid plugin state");
      pluginStates[name] = { enabled: state.enabled, settings: { ...state.settings } };
    }
  }

  const themes: Record<string, string> = {};
  if (data.themes !== undefined) {
    if (!data.themes || typeof data.themes !== "object" || Array.isArray(data.themes)) {
      throw new Error("Invalid themes");
    }
    const entries = Object.entries(data.themes);
    if (entries.length > 100) throw new Error("Too many themes");
    for (const [id, css] of entries) {
      if (
        !/^[a-zA-Z0-9._ -]+\.css$/.test(id) ||
        typeof css !== "string" ||
        css.length > 2_000_000
      ) {
        throw new Error("Invalid theme");
      }
      themes[id] = css;
    }
  }

  let themeState: ThemeStorageState | undefined;
  if (data.themeState !== undefined) {
    if (!data.themeState || typeof data.themeState !== "object" || Array.isArray(data.themeState)) {
      throw new Error("Invalid theme state");
    }
    const candidate = data.themeState as Record<string, unknown>;
    const validIds = (value: unknown): value is string[] =>
      Array.isArray(value) &&
      value.length <= 100 &&
      value.every((id) => typeof id === "string" && /^[a-zA-Z0-9._ -]+\.css$/.test(id));
    if (!validIds(candidate.order) || !validIds(candidate.active)) {
      throw new Error("Invalid theme state");
    }
    themeState = { order: [...candidate.order], active: [...candidate.active] };
  }

  if (hasPluginStates) {
    const unavailable = new Set(
      ctx.pluginManager
        .getAll()
        .filter((p) => p.unavailable)
        .map((p) => p.name)
    );

    for (const [name, state] of Object.entries(pluginStates)) {
      if (unavailable.has(name)) {
        state.enabled = false;
      }
    }

    await storage.setPluginStates(pluginStates);
  }

  if (themeState) {
    await storage.setThemeState(themeState);
  }

  if (Object.keys(themes).length > 0) {
    for (const [id, css] of Object.entries(themes)) {
      await storage.writeTheme(id, css);
    }
  }

  ctx.notifications.showSuccess("Config imported - reload the page to apply changes.");
}

function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function refreshStatus(container: HTMLElement, ctx: BetterXContext) {
  const statusVal = container.querySelector("#cloud-status") as HTMLElement;
  const statusDot = container.querySelector("#cloud-status-dot") as HTMLElement;
  const loginBtn = container.querySelector("#cloud-login-btn") as HTMLElement;
  const logoutBtn = container.querySelector("#cloud-logout-btn") as HTMLElement;
  const userInfo = container.querySelector("#cloud-user-info") as HTMLElement;
  const userPfp = container.querySelector("#cloud-user-pfp") as HTMLImageElement;
  const userName = container.querySelector("#cloud-user-name") as HTMLElement;
  const serverInput = container.querySelector("#cloud-server-url") as HTMLInputElement;

  const setStatus = (label: string, color: string) => {
    statusVal.textContent = label;
    statusVal.style.color = color;
    statusDot.style.background = color;
  };

  const setDisconnected = (label: string) => {
    const color =
      label === "Not logged in" ? "var(--betterx-danger)" : "var(--betterx-textColorSecondary)";
    setStatus(label, color);
    loginBtn.style.display = "";
    logoutBtn.style.display = "none";
    userInfo.style.display = "none";
  };

  let server: string;
  try {
    server = normalizeServer(
      serverInput?.value || localStorage.getItem("bx_cloud_server") || DEFAULT_SERVER
    );
  } catch {
    setDisconnected("Invalid Server URL");
    return;
  }

  if (!server) {
    setDisconnected("Not Configured");
    return;
  }

  try {
    const res = await proxyFetch(`${server}/api/config`, { credentials: "include" });
    const data = parseCloudConfig(res.json);
    if (res.ok && data) {
      setStatus("Connected", "var(--betterx-success)");
      loginBtn.style.display = "none";
      logoutBtn.style.display = "";

      proxyFetch(`${server}/api/me`, { credentials: "include" })
        .then((meRes) => {
          const me = meRes.json as { username: string; profile_image_url: string | null } | null;
          if (!meRes.ok || !me) return;
          userName.textContent = `@${me.username}`;
          if (me.profile_image_url) {
            userPfp.src = me.profile_image_url.replace("_normal", "_bigger");
            userPfp.style.display = "";
          } else {
            userPfp.style.display = "none";
          }
          userInfo.style.display = "flex";
        })
        .catch(() => {});
    } else {
      setDisconnected("Not logged in");
    }
  } catch (e) {
    setDisconnected("Server Offline");
  }
}

async function setupEvents(container: HTMLElement, ctx: BetterXContext) {
  const loginBtn = container.querySelector("#cloud-login-btn") as HTMLButtonElement;
  const logoutBtn = container.querySelector("#cloud-logout-btn") as HTMLButtonElement;
  const pushBtn = container.querySelector("#cloud-push-btn") as HTMLButtonElement;
  const pullBtn = container.querySelector("#cloud-pull-btn") as HTMLButtonElement;
  const exportBtn = container.querySelector("#cloud-export-btn") as HTMLButtonElement;
  const importBtn = container.querySelector("#cloud-import-btn") as HTMLButtonElement;
  const autoSyncToggle = container.querySelector("#cloud-autosync-toggle") as HTMLInputElement;
  const serverInput = container.querySelector("#cloud-server-url") as HTMLInputElement;

  const getServer = () => normalizeServer(serverInput.value || DEFAULT_SERVER);

  serverInput.addEventListener("change", () => {
    try {
      localStorage.setItem("bx_cloud_server", getServer());
    } catch (error) {
      ctx.notifications.showError(
        error instanceof Error ? error.message : "Invalid cloud server URL"
      );
    }
    refreshStatus(container, ctx);
  });

  exportBtn.addEventListener("click", () => {
    exportConfig(ctx.storage)
      .then((json) => downloadJson(json, "betterx-config.json"))
      .catch((err) => {
        logger.error("Config export failed", err);
        ctx.notifications.showError("Failed to export config");
      });
  });

  importBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5_000_000) {
        ctx.notifications.showError("Config file is too large");
        return;
      }
      file
        .text()
        .then((text) => importConfig(ctx.storage, text, ctx))
        .catch((err) => {
          logger.error("Config import failed", err);
          ctx.notifications.showError("Failed to import config - invalid JSON?");
        });
    });
    input.click();
  });

  loginBtn.addEventListener("click", () => {
    const url = `${getServer()}/auth/twitter`;
    if (ctx.openOAuth) {
      ctx.openOAuth(url).catch(console.error);
    } else {
      window.open(url, "_blank");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await proxyFetch(`${getServer()}/auth/logout`, { credentials: "include" }).catch(() => {});
    refreshStatus(container, ctx);
  });

  pushBtn.addEventListener("click", async () => {
    pushBtn.disabled = true;
    pushBtn.textContent = "Pushing...";
    try {
      if (await pushCloudConfig(ctx.storage, getServer())) {
        ctx.notifications.showSuccess("Successfully pushed to cloud.");
      } else {
        ctx.notifications.showError("Failed to push to cloud — are you still logged in?");
      }
    } catch (e) {
      ctx.notifications.showError("Could not reach the cloud server.");
    } finally {
      pushBtn.disabled = false;
      pushBtn.textContent = "Push to Cloud ↑";
    }
  });

  pullBtn.addEventListener("click", async () => {
    pullBtn.disabled = true;
    pullBtn.textContent = "Pulling...";
    try {
      const res = await proxyFetch(`${getServer()}/api/config`, { credentials: "include" });
      if (res.ok) {
        const data = parseCloudConfig(res.json);
        if (!data) {
          ctx.notifications.showError("Unexpected response from server — try again.");
          return;
        }
        await applyCloudConfig(ctx.storage, data);
        ctx.notifications.showSuccess("Pulled from cloud. Reloading…");
        setTimeout(() => location.reload(), 1200);
      } else {
        ctx.notifications.showError(`Pull failed (${res.status}) — are you still logged in?`);
      }
    } catch (e) {
      ctx.notifications.showError(`Pull failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      pullBtn.disabled = false;
      pullBtn.textContent = "Pull from Cloud ↓";
    }
  });

  autoSyncToggle.checked = localStorage.getItem("bx_autosync") === "true";
  autoSyncToggle.addEventListener("change", () => {
    localStorage.setItem("bx_autosync", String(autoSyncToggle.checked));
    lastAutoSyncSnapshot = autoSyncToggle.checked ? "" : lastAutoSyncSnapshot;
    if (autoSyncToggle.checked) void runAutoSync(ctx);
  });
}

let _unsubOAuth: (() => void) | null = null;

function init(container: HTMLElement, ctx: BetterXContext): void {
  const savedServer = localStorage.getItem("bx_cloud_server") || DEFAULT_SERVER;

  container.innerHTML = `
    <div class="bx-cloud-grid">

      <!-- Account / Status -->
      <div class="bx-cloud-card bx-cloud-account-card">
        <div class="bx-cloud-card-title">Account</div>
        <div class="bx-cloud-status-row">
          <span id="cloud-status-dot" class="bx-cloud-status-dot"></span>
          <span id="cloud-status" class="bx-cloud-status-text">Checking…</span>
        </div>
        <div id="cloud-user-info" style="display:none;" class="bx-cloud-user-row">
          <img id="cloud-user-pfp" src="" alt="" class="bx-cloud-pfp">
          <span id="cloud-user-name" class="bx-cloud-username"></span>
        </div>
        <div class="bx-cloud-auth-actions">
          <button id="cloud-login-btn" class="betterx-button betterx-button-primary" style="display:none;">Login with Twitter</button>
          <button id="cloud-logout-btn" class="betterx-button betterx-button-danger" style="display:none;">Logout</button>
        </div>
      </div>

      <!-- Connection -->
      <div class="bx-cloud-card bx-cloud-connection-card">
        <div class="bx-cloud-card-title">Connection</div>
        <div class="bx-cloud-field">
          <label class="bx-cloud-field-label">Server URL</label>
          <div class="bx-cloud-field-desc">The URL of your BetterX cloud-sync instance.</div>
          <input type="text" id="cloud-server-url" class="betterx-input-text bx-cloud-url-input" placeholder="${DEFAULT_SERVER}">
        </div>
      </div>

      <!-- Ops row -->
      <div class="bx-cloud-ops-row">

        <div class="bx-cloud-card bx-cloud-op-card">
          <div class="bx-cloud-card-title">Cloud Sync</div>
          <p class="betterx-help-text">Overwrite cloud ↔ local settings.</p>
          <div class="bx-cloud-op-actions">
            <button id="cloud-push-btn" class="betterx-button betterx-button-primary bx-full-btn">Push to Cloud ↑</button>
            <button id="cloud-pull-btn" class="betterx-button bx-full-btn">Pull from Cloud ↓</button>
          </div>
        </div>

        <div class="bx-cloud-card bx-cloud-op-card">
          <div class="bx-cloud-card-title">Local Backup</div>
          <p class="betterx-help-text">Export or import settings as a JSON file.</p>
          <div class="bx-cloud-op-actions">
            <button id="cloud-export-btn" class="betterx-button bx-full-btn">Export JSON</button>
            <button id="cloud-import-btn" class="betterx-button bx-full-btn">Import JSON</button>
          </div>
        </div>

        <div class="bx-cloud-card bx-cloud-op-card">
          <div class="bx-cloud-card-title">Preferences</div>
          <div class="betterx-option" style="border:none;padding:0;margin-top:8px;">
            <div class="betterx-option-label-group">
              <div class="betterx-option-label">Auto-Sync</div>
              <div class="betterx-option-description">Automatically back up local changes to the cloud every 30 seconds.</div>
            </div>
            <div class="betterx-option-control">
              <label class="betterx-toggle">
                <input type="checkbox" id="cloud-autosync-toggle">
                <span class="betterx-toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  const serverInput = container.querySelector<HTMLInputElement>("#cloud-server-url");
  if (serverInput) serverInput.value = savedServer;

  setupEvents(container, ctx);
  refreshStatus(container, ctx);

  // Replace any previous listener so re-inits don't stack callbacks
  _unsubOAuth?.();
  _unsubOAuth = ctx.onOAuthComplete?.(() => refreshStatus(container, ctx)) ?? null;
}

export const CloudTab: SettingsTab = {
  id: "cloud",
  name: "Cloud Sync",
  priority: 35,

  initialize(container: HTMLElement, ctx: BetterXContext): void {
    init(container, ctx);
  },

  onActivate(container: HTMLElement, ctx: BetterXContext): void {
    refreshStatus(container, ctx);
  },
};
