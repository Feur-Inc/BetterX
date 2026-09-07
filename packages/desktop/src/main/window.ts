import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { logger } from "@betterx/core";
import { BrowserWindow, app, protocol, shell } from "electron";
import type { WebContents } from "electron";
import { isTrustedRendererUrl, parseExternalHttpUrl } from "./ipc/security.js";
import { setupCSP } from "./security.js";

// ─── Window Management ────────────────────────────────────────────────────────

const BUNDLE_PATH_KEY = "betterx_bundle_path";
let bundlePath: string | null = null;
let assetsPath: string | null = null;
let bundleCode: Promise<string> | null = null;
const optionalBundlePaths = new Map<string, string>();
const optionalBundleCode = new Map<string, Promise<string>>();

export function setBundlePath(path: string): void {
  bundlePath = path;
  bundleCode = null;
}

export function invalidateBundleCache(): void {
  bundleCode = null;
}

export function setOptionalBundlePath(name: "editor" | "emoji", path: string): void {
  optionalBundlePaths.set(name, path);
  optionalBundleCode.delete(name);
}

async function getBundleCode(): Promise<string> {
  if (!bundlePath) throw new Error("BetterX bundle is unavailable");
  bundleCode ??= readFile(bundlePath, "utf8");
  return bundleCode;
}

export async function loadOptionalRendererModule(
  webContents: WebContents,
  name: "editor" | "emoji"
): Promise<void> {
  const path = optionalBundlePaths.get(name);
  if (!path) throw new Error(`Unknown renderer module: ${name}`);
  let code = optionalBundleCode.get(name);
  if (!code) {
    code = readFile(path, "utf8");
    optionalBundleCode.set(name, code);
  }
  await webContents.executeJavaScriptInIsolatedWorld(1000, [{ code: await code }]);
}

export function setAssetsPath(path: string): void {
  assetsPath = path;
}

/**
 * Register the betterx:// custom protocol.
 * Serves bundle.js from disk - no executeJavaScript with raw bundle string.
 */
export function registerBetterxProtocol(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "betterx",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: false,
      },
    },
  ]);
}

export function handleBetterxProtocol(): void {
  protocol.handle("betterx", async (request) => {
    const url = new URL(request.url);
    if (url.hostname === "bundle" && url.pathname === "/bundle.js") {
      if (!bundlePath) {
        return new Response("// BetterX bundle not found", {
          status: 404,
          headers: { "Content-Type": "application/javascript" },
        });
      }
      try {
        const content = await getBundleCode();
        return new Response(content, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
          },
        });
      } catch {
        return new Response("// BetterX bundle read error", {
          status: 500,
          headers: { "Content-Type": "application/javascript" },
        });
      }
    }
    // Serve static assets (logo, icons, etc.)
    if (url.hostname === "assets" && assetsPath) {
      const filename = url.pathname.slice(1); // strip leading /
      const rootPath = resolve(assetsPath);
      const filePath = resolve(rootPath, filename);
      // Security: prevent path traversal
      const relativePath = relative(rootPath, filePath);
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        return new Response("Forbidden", { status: 403 });
      }
      try {
        const content = await readFile(filePath);
        const ext = filename.split(".").pop() ?? "";
        const mimeTypes: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          svg: "image/svg+xml",
          ico: "image/x-icon",
        };
        return new Response(new Uint8Array(content), {
          status: 200,
          headers: {
            "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }

    return new Response("Not found", { status: 404 });
  });
}

export function createMainWindow(preloadPath: string, enableTransparency: boolean): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "BetterX V3 Desktop",
    autoHideMenuBar: true,
    transparent: enableTransparency,
    backgroundColor: enableTransparency ? "#00000000" : "#000000",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      // No disable-web-security, no contextBridge bypass
    },
  });

  // Run BetterX in an isolated world so X's page scripts cannot access its
  // privileged Electron API.
  win.webContents.on("did-finish-load", async () => {
    if (!bundlePath) return;
    try {
      const code = await getBundleCode();
      await win.webContents.executeJavaScriptInIsolatedWorld(1000, [{ code }]);
    } catch (err) {
      logger.error("Failed to inject BetterX script:", err);
    }
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (isTrustedRendererUrl(url)) return;
    event.preventDefault();
    try {
      void shell.openExternal(parseExternalHttpUrl(url).toString());
    } catch {
      logger.warn("Blocked navigation to unsafe URL:", url);
    }
  });

  win.webContents.on("did-navigate-in-page", () => {
    win.webContents.send("bx:navigation");
  });

  // Allow OAuth popups to open inside the app so postMessage works back to the opener
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedRendererUrl(url)) {
      // Service-worker notification clicks can call clients.openWindow().
      void win.loadURL(url).catch((error) => {
        logger.error("Failed to open notification URL:", error);
      });
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      return { action: "deny" };
    }

    try {
      const external = parseExternalHttpUrl(url);
      if (external.hostname === "accounts.google.com") {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true,
            },
          },
        };
      }
      void shell.openExternal(external.toString());
    } catch {
      logger.warn("Blocked unsafe popup URL:", url);
    }
    return { action: "deny" };
  });

  setupCSP(win.webContents.session);
  win.loadURL("https://x.com");
  return win;
}
