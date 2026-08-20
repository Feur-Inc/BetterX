// ─── BetterX Desktop Bundle Entry ────────────────────────────────────────────
// This is the IIFE bundle injected into X.com via betterx:// protocol.
// Has access to window.electronAPI via contextBridge.

import {
  AboutTab,
  type BetterXContext,
  CloudTab,
  DeveloperTab,
  NotificationManager,
  PluginManager,
  PluginsTab,
  type ProxyFetchInit,
  SettingsModal,
  TabRegistry,
  ThemeManager,
  ThemesTab,
  applyAccentColor,
  injectNavButton,
  injectStyle,
  logger,
  notifications,
  setFetchProxy,
  startCloudAutoSync,
  watchNavButton,
} from "@betterx/core";
import { BETTERX_STYLES } from "@betterx/core";
import { allPlugins } from "@betterx/plugins";
import { DesktopTab } from "./desktop-tab.js";
import { startPageTracker } from "./page-tracker.js";
import { DesktopStorage } from "./platform.js";

let initialized = false;

async function init(): Promise<void> {
  if (initialized) return;
  initialized = true;

  logger.info("BetterX Desktop bundle initializing...");

  // 1. Inject base styles
  injectStyle(BETTERX_STYLES, "betterx-styles");

  // 2. Storage
  const storage = new DesktopStorage();

  // 3. Managers
  const pluginManager = new PluginManager(storage);
  const themeManager = new ThemeManager(storage);

  // 4. Init themes
  await themeManager.initialize();

  // 5. Wire up proxy fetch BEFORE initializing plugins so proxyFetch() works
  //    inside plugin start() hooks (cloudFetch routes through main process, bypassing X's CSP)
  const electronAPI = window.electronAPI;
  if (!electronAPI) throw new Error("BetterX desktop API is unavailable");
  Object.assign(globalThis, {
    __betterxLoadRendererModule: (name: "editor" | "emoji") => electronAPI.loadRendererModule(name),
  });
  setFetchProxy(async (url: string, init?: ProxyFetchInit) => {
    const u = new URL(url);
    const response = ["/api/config", "/api/me", "/auth/logout"].includes(u.pathname)
      ? await electronAPI.cloudFetch(u.origin, u.pathname + u.search, init)
      : await electronAPI.proxyFetch(u.toString(), init);
    let json: unknown = null;
    try {
      json = JSON.parse(response.text);
    } catch {
      // Non-JSON responses are valid.
    }
    return { ...response, json };
  });

  // 6. Init plugins
  await pluginManager.initialize(allPlugins, "desktop");

  // 7. Accent color
  applyAccentColor();

  // 7. Register tabs
  const logoUrl = "betterx://assets/icon.svg";
  const ctx: BetterXContext = {
    pluginManager,
    themeManager,
    notifications,
    storage,
    logoUrl,
    platform: "desktop",
    openThemesFolder: () => {
      window.electronAPI?.themes.openFolder();
    },
    openOAuth: (url: string) => electronAPI.openOAuth(url),
    onOAuthComplete: (cb: () => void) => electronAPI.onOAuthComplete(cb),
  };
  TabRegistry.register(PluginsTab);
  TabRegistry.register(ThemesTab);
  TabRegistry.register(CloudTab);
  TabRegistry.register(DesktopTab);
  TabRegistry.register(DeveloperTab);
  TabRegistry.register(AboutTab);
  startCloudAutoSync(ctx);

  // 8. Modal
  const modal = new SettingsModal(ctx);
  const openModal = (): void => modal.toggle();

  // Expose for tray "Settings" menu item
  (window as typeof window & { __betterx_open_settings?: () => void }).__betterx_open_settings =
    () => modal.open();

  // 9. Nav button
  injectNavButton(openModal, logoUrl);
  watchNavButton(openModal, logoUrl);

  // 11. Page tracker (Discord RPC)
  startPageTracker();

  logger.info("BetterX Desktop initialized ✓");
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init());
} else {
  void init();
}

// Window.electronAPI is declared in ./platform.ts via global augmentation
