import { lookup } from "node:dns/promises";
import { existsSync, watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { mkdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, app, ipcMain, session, shell } from "electron";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { logger } from "@betterx/core";

import { registerCaptureHandlers } from "./ipc/capture.js";
import { registerDiscordRPCHandlers } from "./ipc/discord-rpc.js";
import {
  assertTrustedSender,
  isPrivateAddress,
  parseCloudServerUrl,
  parsePublicProxyUrl,
  validateCloudRequest,
  validateProxyMethod,
} from "./ipc/security.js";
import { registerSettingsHandlers } from "./ipc/settings.js";
import { registerThemeHandlers } from "./ipc/themes.js";
import { destroyDiscordRPC, initializeDiscordRPC } from "./services/discord-rpc.js";
import { getSetting, settingsStore } from "./services/settings.js";
import { createTray } from "./tray.js";
import {
  createMainWindow,
  handleBetterxProtocol,
  invalidateBundleCache,
  loadOptionalRendererModule,
  registerBetterxProtocol,
  setAssetsPath,
  setBundlePath,
  setOptionalBundlePath,
} from "./window.js";

// ─── App Paths ────────────────────────────────────────────────────────────────

import { BETTERX_DIR } from "./paths.js";

// Default to the bundle packaged with the desktop application.
const BUNDLE_PATH = join(__dirname, "../bundle/bundle.iife.js");
const EDITOR_BUNDLE_PATH = join(__dirname, "../bundle/editor.iife.js");
const EMOJI_BUNDLE_PATH = join(__dirname, "../bundle/emoji.iife.js");
// Older releases downloaded executable bundles here. Never load that legacy path implicitly.
const LEGACY_SAVED_BUNDLE_PATH = join(BETTERX_DIR, "bundle.iife.js");
const PRELOAD_PATH = join(__dirname, "../preload/preload.js");
const MAX_PROXY_RESPONSE_BYTES = 10_000_000;

async function readLimitedText(response: Response, limit: number): Promise<string> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > limit) throw new Error("Response is too large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("Response is too large");
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join("");
}

async function assertPublicProxyHost(url: URL): Promise<void> {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private network proxy targets are not allowed");
  }
}

// ─── Wayland support ──────────────────────────────────────────────────────────

if (process.platform === "linux") {
  if (process.env.WAYLAND_DISPLAY) {
    app.commandLine.appendSwitch("ozone-platform", "wayland");
    app.commandLine.appendSwitch("enable-features", "WaylandWindowDecorations");
  }
  // Disable GBM video buffer allocation - YUV_420_BIPLANAR SCANOUT not
  // supported on many Mesa drivers, causing a spam of GPU errors.
  app.commandLine.appendSwitch("disable-gpu-memory-buffer-video-frames");
  app.commandLine.appendSwitch(
    "disable-features",
    "UseChromeOSDirectVideoDecoder,VaapiVideoDecoder"
  );
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
let bundleWatcher: FSWatcher | null = null;

app.whenReady().then(async () => {
  // Ensure BetterX directory exists
  await mkdir(BETTERX_DIR, { recursive: true });

  // Set up betterx:// protocol handler
  handleBetterxProtocol();

  // Use the packaged bundle unless the user explicitly selected a local development bundle.
  const storedPath = getSetting("bundlePath");
  const hasCustomBundle =
    !!storedPath &&
    storedPath !== BUNDLE_PATH &&
    storedPath !== LEGACY_SAVED_BUNDLE_PATH &&
    existsSync(storedPath);
  const bundlePath = hasCustomBundle ? storedPath : BUNDLE_PATH;
  setAssetsPath(join(__dirname, "../../assets"));
  setBundlePath(bundlePath);
  setOptionalBundlePath("editor", EDITOR_BUNDLE_PATH);
  setOptionalBundlePath("emoji", EMOJI_BUNDLE_PATH);

  // Register IPC handlers
  registerThemeHandlers();
  registerSettingsHandlers();
  registerDiscordRPCHandlers();
  ipcMain.handle("bx:renderer-module:load", async (event, name: unknown) => {
    assertTrustedSender(event);
    if (name !== "editor" && name !== "emoji") throw new Error("Invalid renderer module");
    await loadOptionalRendererModule(event.sender, name);
  });
  ipcMain.on("app:get-version", (event) => {
    assertTrustedSender(event);
    event.returnValue = app.getVersion();
  });
  ipcMain.on("app:restart", (event) => {
    assertTrustedSender(event);
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle("bx:oauth:open", async (event, url: string) => {
    assertTrustedSender(event);
    const requestedOAuthUrl = new URL(url);
    if (
      requestedOAuthUrl.pathname !== "/auth/twitter" ||
      requestedOAuthUrl.search ||
      requestedOAuthUrl.hash
    ) {
      throw new Error("Invalid OAuth URL");
    }
    const oauthUrl = new URL(
      "/auth/twitter",
      parseCloudServerUrl(requestedOAuthUrl.origin).origin
    ).toString();
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
        sandbox: true,
      },
    });

    oauthWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    oauthWindow.webContents.on("will-navigate", (event, navigationUrl) => {
      try {
        const target = new URL(navigationUrl);
        const allowed =
          target.protocol === "https:" &&
          (target.origin === new URL(oauthUrl).origin ||
            target.hostname === "twitter.com" ||
            target.hostname === "x.com");
        if (allowed) return;
        event.preventDefault();
        if (target.protocol === "https:" || target.protocol === "http:") {
          void shell.openExternal(target.toString());
        }
      } catch {
        event.preventDefault();
      }
    });

    await oauthWindow.loadURL(oauthUrl);

    // Auto-close the modal when the OAuth callback completes
    // The server returns a page with window.close(), but as a fallback
    // we also detect navigation to the callback/success page
    oauthWindow.webContents.on("did-navigate", (_e, navUrl) => {
      try {
        const parsed = new URL(navUrl);
        // Close if we landed back on the server root or callback (auth completed)
        if (
          parsed.origin === new URL(oauthUrl).origin &&
          (parsed.pathname === "/" || parsed.pathname === "/auth/callback")
        ) {
          setTimeout(() => {
            if (!oauthWindow.isDestroyed()) oauthWindow.close();
          }, 500);
        }
      } catch {
        /* ignore invalid URLs */
      }
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
    const url = parseCloudServerUrl(serverUrl);
    const cookies = await session.defaultSession.cookies.get({
      url: url.origin,
      name: "bx_session",
    });
    return cookies[0]?.value ? `bx_session=${cookies[0].value}` : "";
  }

  ipcMain.handle(
    "bx:cloud:fetch",
    async (
      event,
      serverUrl: string,
      path: string,
      options?: { method?: string; body?: string; headers?: Record<string, string> }
    ) => {
      try {
        assertTrustedSender(event);
        const server = parseCloudServerUrl(serverUrl);
        const request = validateCloudRequest(path, options?.method);
        if (options?.body && options.body.length > 2_000_000)
          throw new Error("Cloud request body is too large");
        const cookie = await getCloudCookie(server.origin);
        const headers: Record<string, string> = {};
        if (cookie) headers.Cookie = cookie;
        if (options?.body) headers["Content-Type"] = "application/json";
        const res = await fetch(new URL(request.path, server.origin), {
          method: request.method,
          headers,
          body: options?.body ?? null,
          redirect: "manual",
          signal: AbortSignal.timeout(20_000),
        });

        // Sync Set-Cookie back into Electron's session cookie jar so logout
        // (which expires the cookie server-side) is reflected locally too.
        const setCookie = res.headers.get("set-cookie");
        if (setCookie?.includes("bx_session")) {
          const url = server;
          const maxAgeMatch = setCookie.match(/max-age=(\d+)/i);
          const maxAgeValue = maxAgeMatch?.[1];
          if (maxAgeValue && Number.parseInt(maxAgeValue) === 0) {
            await session.defaultSession.cookies.remove(url.origin, "bx_session");
          } else {
            const valueMatch = setCookie.match(/bx_session=([^;]+)/);
            if (valueMatch?.[1]) {
              const maxAge = maxAgeValue ? Number.parseInt(maxAgeValue) : undefined;
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

        const text = await readLimitedText(res, 2_000_000);
        return { ok: res.ok, status: res.status, text };
      } catch {
        return { ok: false, status: 0, text: "Connection failed" };
      }
    }
  );

  ipcMain.handle(
    "bx:proxy:fetch",
    async (
      event,
      url: string,
      options?: { method?: string; body?: string; headers?: Record<string, string> }
    ) => {
      try {
        assertTrustedSender(event);
        const target = parsePublicProxyUrl(url);
        await assertPublicProxyHost(target);
        const method = validateProxyMethod(options?.method);
        if (options?.body && options.body.length > 2_000_000) {
          throw new Error("Proxy request body is too large");
        }
        const headers = Object.fromEntries(
          Object.entries(options?.headers ?? {}).filter(
            ([key]) => !["cookie", "host", "origin", "referer"].includes(key.toLowerCase())
          )
        );
        const response = await fetch(target, {
          method,
          headers,
          body: options?.body ?? null,
          redirect: "manual",
          signal: AbortSignal.timeout(20_000),
        });
        const text = await readLimitedText(response, MAX_PROXY_RESPONSE_BYTES);
        return { ok: response.ok, status: response.status, text };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          text: error instanceof Error ? error.message : "Proxy request failed",
        };
      }
    }
  );

  registerCaptureHandlers(() => mainWindow);

  const openMainWindow = (startMinimized = false): BrowserWindow => {
    const window = createMainWindow(PRELOAD_PATH, getSetting("enableTransparency"));
    mainWindow = window;
    window.on("close", (event) => {
      if (
        !(app as typeof app & { isQuitting?: boolean }).isQuitting &&
        getSetting("minimizeToTray")
      ) {
        event.preventDefault();
        window.hide();
      }
    });
    window.on("closed", () => {
      if (mainWindow === window) mainWindow = null;
    });
    if (startMinimized) window.minimize();
    return window;
  };

  openMainWindow(getSetting("startMinimized"));

  // Tray
  const iconPath = join(__dirname, "../../assets/icon.png");
  if (existsSync(iconPath)) {
    createTray(iconPath, () => mainWindow);
  }

  // If launched via deep link, navigate to the target URL
  if (launchDeepLink) {
    handleDeepLink(launchDeepLink);
  }

  // Start minimized?
  app.setLoginItemSettings({ openAtLogin: getSetting("autoStart") });

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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) openMainWindow();
  });

  // ─── Bundle hot-reload ──────────────────────────────────────────────────────
  // Watch the bundle directory for changes (Vite does atomic renames, so
  // watching the file itself is unreliable - watch the dir instead).
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    if (process.env.BETTERX_DEV === "1" || hasCustomBundle)
      bundleWatcher = watch(dirname(bundlePath), (_, filename) => {
        if (filename !== basename(bundlePath)) return;
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          reloadTimer = null;
          if (mainWindow && !mainWindow.isDestroyed()) {
            invalidateBundleCache();
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
  bundleWatcher?.close();
  bundleWatcher = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
