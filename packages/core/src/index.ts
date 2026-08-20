// ─── @betterx/core ────────────────────────────────────────────────────────────

// Types
export type {
  Plugin,
  PluginDefinition,
  PluginPlatform,
  PluginOptionDefs,
  PluginOptionDef,
  PluginStorageData,
  Developer,
  InferredStore,
  OptionTypeKey,
  OptionValueMap,
  SelectOption,
} from "./types/plugin.js";
export type { Theme, ThemeStorageState } from "./types/theme.js";
export type { IStorage } from "./types/storage.js";
export type {
  NotificationOptions,
  NotificationType,
  NotificationAction,
} from "./types/notification.js";

// Plugin
export { OptionType, definePlugin } from "./types/plugin.js";
export { PluginManager } from "./plugin/manager.js";

// Theme
export { ThemeManager } from "./theme/manager.js";
export { processCSS } from "./theme/processor.js";
export {
  detectAccentColor,
  detectThemeMode,
  applyAccentColor,
  watchAccentColor,
} from "./theme/detector.js";

// UI
export { TabRegistry } from "./ui/tab-registry.js";
export type { SettingsTab, BetterXContext } from "./ui/tab-registry.js";
export { SettingsModal } from "./ui/modal.js";
export { NotificationManager, notifications } from "./ui/notification.js";
export { injectNavButton, removeNavButton, ensureNavButton, watchNavButton } from "./ui/button.js";
export { BETTERX_STYLES } from "./ui/styles.js";

// Built-in tabs
export { PluginsTab } from "./ui/tabs/plugins-tab.js";
export { ThemesTab } from "./ui/tabs/themes-tab.js";
export { CloudTab, startCloudAutoSync } from "./ui/tabs/cloud-tab.js";
export { DeveloperTab } from "./ui/tabs/developer-tab.js";
export { AboutTab } from "./ui/tabs/about-tab.js";

// Utils
export { logger } from "./utils/logger.js";
export { Devs, BETTERX_VERSION, BETTERX_LOGO_SVG } from "./utils/constants.js";
export { waitForElement, createElement, injectStyle, removeStyle } from "./utils/dom.js";
export {
  applyAccentColor as applyAccent,
  watchAccentColor as watchAccent,
} from "./utils/accent-color.js";
export { setImageProxy, proxyImage, setFetchProxy, proxyFetch } from "./utils/proxy.js";
export type { ProxyFetchResult, ProxyFetchInit } from "./utils/proxy.js";
export {
  setMainWorldBridge,
  callMainWorld,
  dispatchReactState,
} from "./utils/main-world-bridge.js";
