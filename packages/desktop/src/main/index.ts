import { app, BrowserWindow, ipcMain, session } from "electron";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { existsSync, watch } from "fs";
import { mkdir } from "fs/promises";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { logger } from "@betterx/core";

import {
  registerBetterxProtocol,
  handleBetterxProtocol,
  createMainWindow,
  setBundlePath,
  setAssetsPath,
} from "./window.js";
import { setupCSP } from "./security.js";
import { createTray } from "./tray.js";
import { registerThemeHandlers } from "./ipc/themes.js";
import { registerSettingsHandlers } from "./ipc/settings.js";
import { registerUpdateHandlers } from "./ipc/update.js";
import { registerCaptureHandlers } from "./ipc/capture.js";
import { registerDiscordRPCHandlers } from "./ipc/discord-rpc.js";
import { getSetting, setSetting, settingsStore } from "./services/settings.js";
import { initializeDiscordRPC, destroyDiscordRPC } from "./services/discord-rpc.js";
import {
  checkForBundleUpdate,
  applyBundleUpdate,
  readPersistedHash,
} from "./services/bundle-updater.js";

// ─── App Paths ────────────────────────────────────────────────────────────────

import { BETTERX_DIR } from "./paths.js";

// Default to the locally-built bundle; overridden by userData path once a remote update is applied
const BUNDLE_PATH = join(__dirname, "../bundle/bundle.iife.js");
// Where remote bundle updates are saved (userData, persists across app updates)
const SAVED_BUNDLE_PATH = join(BETTERX_DIR, "bundle.iife.js");

// ─── Wayland support ──────────────────────────────────────────────────────────

if (process.platform === "linux") {
  if (process.env.WAYLAND_DISPLAY) {
    app.commandLine.appendSwitch("ozone-platform", "wayland");
    app.commandLine.appendSwitch("enable-features", "WaylandWindowDecorations");
  }
  // Disable GBM video buffer allocation - YUV_420_BIPLANAR SCANOUT not
  // supported on many Mesa drivers, causing a spam of GPU errors.
  app.commandLine.appendSwitch("disable-gpu-memory-buffer-video-frames");
  app.commandLine.appendSwitch("disable-features", "UseChromeOSDirectVideoDecoder,VaapiVideoDecoder");
}

// ─── Single Instance Lock ─────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Register protocol BEFORE app is ready
registerBetterxProtocol();

// Register betterx:// as OS-level deep link protocol so x.com links can open in BetterX
// Usage: betterx://x.com/user/status/123 → navigates to https://x.com/user/status/123
app.setAsDefaultProtocolClient("betterx");

/**
 * Handle a deep link URL like betterx://x.com/path or betterx://twitter.com/path.
 * Converts to https:// and navigates the main window.
 */
function handleDeepLink(url: string): void {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    // Only handle x.com / twitter.com deep links
    if (host === "x.com" || host === "twitter.com") {
      const target = `https://${host}${parsed.pathname}${parsed.search}${parsed.hash}`;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(target);
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
      logger.info(`[BetterX] Deep link: ${target}`);
    }
  } catch {
    logger.warn("[BetterX] Invalid deep link URL:", url);
  }
}

// ─── App Ready ────────────────────────────────────────────────────────────────

// Check if the app was launched with a deep link URL (cold start)
const launchDeepLink = process.argv.find((arg) => arg.startsWith("betterx://"));

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(async () => {
  // Ensure BetterX directory exists
  await mkdir(BETTERX_DIR, { recursive: true });

  // Set up betterx:// protocol handler
  handleBetterxProtocol();

  // Set up CSP
  setupCSP();

  // Configure bundle path - fall back to local build if stored path no longer exists
  const storedPath = getSetting("bundlePath");
  const bundlePath = (storedPath && existsSync(storedPath)) ? storedPath : BUNDLE_PATH;
  setSetting("bundlePath", bundlePath);
  setBundlePath(bundlePath);
  setAssetsPath(join(__dirname, "../../assets"));

  // Check/update bundle
  if (getSetting("checkForUpdates")) {
    try {
      const currentHash = await readPersistedHash(SAVED_BUNDLE_PATH) ?? getSetting("currentHash");
      const result = await checkForBundleUpdate(currentHash);
      if (result.updateAvailable) {
        logger.info("BetterX bundle update available, downloading...");
        await applyBundleUpdate(SAVED_BUNDLE_PATH, result.remoteHash);
        setSetting("currentHash", result.remoteHash);
        logger.info("Bundle updated successfully");
      }
    } catch (err) {
      logger.warn("Bundle update check failed:", err);
      // Non-fatal: use existing bundle if available
    }
  }

  // Register IPC handlers
  registerThemeHandlers();
  registerSettingsHandlers();
  registerUpdateHandlers();
  registerDiscordRPCHandlers();
  ipcMain.on("app:restart", () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle("bx:oauth:open", async (_event, url: string) => {
    const oauthWindow = new BrowserWindow({
      width: 600,
      height: 800,
      show: true,
      autoHideMenuBar: true,
      ...(mainWindow ? { parent: mainWindow } : {}),
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await oauthWindow.loadURL(url);

    // Auto-close the modal when the OAuth callback completes
    // The server returns a page with window.close(), but as a fallback
    // we also detect navigation to the callback/success page
    oauthWindow.webContents.on("did-navigate", (_e, navUrl) => {
      try {
        const parsed = new URL(navUrl);
        // Close if we landed back on the server root or callback (auth completed)
        if (parsed.pathname === "/" || parsed.pathname === "/auth/callback") {
          setTimeout(() => {
            if (!oauthWindow.isDestroyed()) oauthWindow.close();
          }, 500);
        }
      } catch { /* ignore invalid URLs */ }
    });

    return new Promise<void>((resolve) => {
      oauthWindow.on("closed", () => {
        // Notify the renderer to refresh cloud sync status
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("bx:oauth:complete");
        }
        resolve();
      });
    });
  });

  // ─── Cloud Sync API Proxy ────────────────────────────────────────────────────
  // The renderer runs on https://x.com so it can't fetch localhost due to CSP.
  // We proxy cloud sync API calls through the main process instead.

  async function getCloudCookie(serverUrl: string): Promise<string> {
    const url = new URL(serverUrl);
    const cookies = await session.defaultSession.cookies.get({
      domain: url.hostname,
      name: "bx_session",
    });
    return cookies[0]?.value ? `bx_session=${cookies[0].value}` : "";
  }

  ipcMain.handle("bx:cloud:fetch", async (_event, serverUrl: string, path: string, options?: { method?: string; body?: string; headers?: Record<string, string> }) => {
    try {
      const cookie = await getCloudCookie(serverUrl);
      const headers: Record<string, string> = { ...options?.headers };
      if (cookie) headers["Cookie"] = cookie;
      if (options?.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
      const res = await fetch(`${serverUrl}${path}`, {
        method: options?.method ?? "GET",
        headers,
        body: options?.body ?? null,
        redirect: "manual",
      });

      // Sync Set-Cookie back into Electron's session cookie jar so logout
      // (which expires the cookie server-side) is reflected locally too.
      const setCookie = res.headers.get("set-cookie");
      if (setCookie?.includes("bx_session")) {
        const url = new URL(serverUrl);
        const maxAgeMatch = setCookie.match(/max-age=(\d+)/i);
        if (maxAgeMatch && parseInt(maxAgeMatch[1]!) === 0) {
          await session.defaultSession.cookies.remove(url.origin, "bx_session");
        } else {
          const valueMatch = setCookie.match(/bx_session=([^;]+)/);
          if (valueMatch?.[1]) {
            const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]!) : undefined;
            await session.defaultSession.cookies.set({
              url: url.origin,
              name: "bx_session",
              value: valueMatch[1],
              httpOnly: true,
              ...(maxAge ? { expirationDate: Math.floor(Date.now() / 1000) + maxAge } : {}),
            });
          }
        }
      }

      const text = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { /* not JSON */ }
      return { ok: res.ok, status: res.status, json, text };
    } catch {
      return { ok: false, status: 0, json: null, text: "Connection failed" };
    }
  });

  // Create main window
  const preloadPath = join(__dirname, "../preload/preload.js");
  const enableTransparency = getSetting("enableTransparency");
  mainWindow = createMainWindow(preloadPath, enableTransparency);

  registerCaptureHandlers(() => mainWindow);

  // Tray
  const iconPath = join(__dirname, "../../assets/icon.png");
  if (existsSync(iconPath)) {
    createTray(iconPath, mainWindow);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // If launched via deep link, navigate to the target URL
  if (launchDeepLink) {
    handleDeepLink(launchDeepLink);
  }

  // Start minimized?
  if (getSetting("startMinimized") && mainWindow) {
    mainWindow.minimize();
  }

  // Discord RPC
  if (getSetting("enableDiscordRPC")) {
    void initializeDiscordRPC();
  }

  settingsStore.onDidChange("enableDiscordRPC", (enabled) => {
    if (enabled) {
      void initializeDiscordRPC();
    } else {
      void destroyDiscordRPC();
    }
  });

  // ─── Bundle hot-reload ──────────────────────────────────────────────────────
  // Watch the bundle directory for changes (Vite does atomic renames, so
  // watching the file itself is unreliable - watch the dir instead).
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    watch(dirname(bundlePath), (_, filename) => {
      if (filename !== basename(bundlePath)) return;
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        reloadTimer = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.reload();
          logger.info("[BetterX] Bundle changed - reloading page");
        }
      }, 300);
    });
  } catch {
    // Non-fatal: bundle watching unavailable
  }
});

// Focus existing window on second instance; handle deep link URLs (Linux/Windows)
app.on("second-instance", (_event, argv) => {
  // On Linux/Windows, the deep link URL is passed as the last CLI argument
  const deepLink = argv.find((arg) => arg.startsWith("betterx://"));
  if (deepLink) {
    handleDeepLink(deepLink);
  } else if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Handle deep link URLs on macOS
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.on("before-quit", () => {
  (app as typeof app & { isQuitting: boolean }).isQuitting = true;
  void destroyDiscordRPC();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
    // Re-create window on macOS
  }
});
