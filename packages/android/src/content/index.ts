// ─── BetterX Android Content Script ───────────────────────────────────────────
// Runs inside the WebView page context and bootstraps BetterX on x.com.

import {
  AboutTab,
  BETTERX_LOGO_SVG,
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
  setFetchProxy,
  setImageProxy,
  startCloudAutoSync,
  watchNavButton,
} from "@betterx/core";
import { BETTERX_STYLES } from "@betterx/core";
import { allPlugins } from "@betterx/plugins";
import browser from "../platform/browser.js";
import { AndroidStorage } from "../platform/storage.js";
import GoogleSignInCompat from "../plugins/GoogleSignInCompat/index.js";
import MoreLikeOriginal from "../plugins/MoreLikeOriginal/index.js";
import RemovePremium from "../plugins/RemovePremium/index.js";
import { registerMainWorldBridge } from "./bridge.js";

let initialized = false;

async function init(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // 0. Wire up main-world bridge (must be early so plugins can use it)
  registerMainWorldBridge();

  // 1. Inject base styles
  injectStyle(BETTERX_STYLES, "betterx-styles");

  // 2. Set up storage
  const storage = new AndroidStorage();
  const savedPluginStates = await storage.getPluginStates();

  // 3. Set up managers
  const notifications = new NotificationManager();
  const pluginManager = new PluginManager(storage);
  const themeManager = new ThemeManager(storage);

  // 4. Init themes first (applies CSS before plugins run)
  await themeManager.initialize();

  const androidPlugins = allPlugins.map((plugin) =>
    plugin.name === "RemovePremium" ? RemovePremium : plugin
  );
  androidPlugins.push(GoogleSignInCompat);
  androidPlugins.push(MoreLikeOriginal);

  const logoUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BETTERX_LOGO_SVG)}`;

  // 7. Register image proxy so plugins can bypass X's CSP
  const proxyImageFn = async (url: string): Promise<string> => {
    try {
      const res = (await browser.runtime.sendMessage({ type: "PROXY_IMAGE", url })) as {
        dataUrl?: string;
      };
      return res?.dataUrl ?? url;
    } catch {
      return url;
    }
  };
  setImageProxy(proxyImageFn);
  setFetchProxy(async (url: string, init?: ProxyFetchInit) => {
    try {
      return (await browser.runtime.sendMessage({ type: "PROXY_FETCH", url, ...init })) as {
        ok: boolean;
        status: number;
        text: string;
        json: unknown;
      };
    } catch {
      return { ok: false, status: 0, text: "Extension messaging failed", json: null };
    }
  });

  // Proxies must be registered before plugin start hooks run.
  await pluginManager.initialize(androidPlugins, "android");

  const webViewLoginBridgeState =
    savedPluginStates["WebView Login Bridge"] ?? savedPluginStates["Google Sign-In Compat"];

  if (!webViewLoginBridgeState) {
    const googleSignInCompat = pluginManager.get("WebView Login Bridge");
    if (googleSignInCompat && !googleSignInCompat.enabled) {
      await pluginManager.toggle("WebView Login Bridge");
    }
  }

  if (!savedPluginStates["More like original"]) {
    const moreLikeOriginal = pluginManager.get("More like original");
    if (moreLikeOriginal && !moreLikeOriginal.enabled) {
      await pluginManager.toggle("More like original");
    }
  }

  applyAccentColor();

  TabRegistry.register(PluginsTab);
  TabRegistry.register(ThemesTab);
  TabRegistry.register(CloudTab);
  TabRegistry.register(DeveloperTab);
  TabRegistry.register(AboutTab);

  const ctx: BetterXContext = {
    pluginManager,
    themeManager,
    notifications,
    storage,
    logoUrl,
    platform: "android",
    proxyImage: proxyImageFn,
    openOAuth: (url: string) =>
      browser.runtime.sendMessage({ type: "OPEN_URL", url }).then(() => undefined),
  };
  startCloudAutoSync(ctx);

  // 8. Create modal
  const modal = new SettingsModal(ctx);

  // 9. Inject nav button + watch for SPA navigation removing it
  const openModal = (): void => modal.toggle();
  injectNavButton(openModal, logoUrl, ctx.platform);
  watchNavButton(openModal, logoUrl, ctx.platform);

  console.log("[BetterX] Initialized ✓");
}

// Start on document_idle (DOMContentLoaded already fired)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init());
} else {
  void init();
}
