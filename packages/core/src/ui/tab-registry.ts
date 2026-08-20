import type { PluginManager } from "../plugin/manager.js";
import type { ThemeManager } from "../theme/manager.js";
import type { IStorage } from "../types/storage.js";
import type { NotificationManager } from "./notification.js";

// ─── Settings Tab Interface ────────────────────────────────────────────────────

export type BetterXContext = {
  pluginManager: PluginManager;
  themeManager: ThemeManager;
  notifications: NotificationManager;
  storage: IStorage;
  /** URL of the BetterX logo image - platform-supplied (betterx:// or chrome-extension://) */
  logoUrl: string;
  /** Current platform ('desktop' | 'extension' | 'android') */
  platform: "desktop" | "extension" | "android";
  /** Opens the themes folder in the system file manager (desktop only). */
  openThemesFolder?: () => void;
  /** Opens an OAuth login window/tab. */
  openOAuth?: (url: string) => Promise<void>;
  /** Register a callback for when OAuth login completes. Returns an unsubscribe fn. */
  onOAuthComplete?: (callback: () => void) => () => void;
  /** Proxy an image URL through the platform to bypass page CSP. */
  proxyImage?: (url: string) => Promise<string>;
};

export interface SettingsTab {
  id: string;
  name: string;
  /** Lower priority = rendered first (leftmost) */
  priority: number;
  initialize(container: HTMLElement, ctx: BetterXContext): void;
  onActivate?(container: HTMLElement, ctx: BetterXContext): void;
}

// ─── Tab Registry ─────────────────────────────────────────────────────────────

const registry: SettingsTab[] = [];
const hiddenTabs = new Set<string>();

export const TabRegistry = {
  register(tab: SettingsTab): void {
    if (registry.some((t) => t.id === tab.id)) return;
    registry.push(tab);
    registry.sort((a, b) => a.priority - b.priority);
  },

  /** Hide or show a tab by id. Hidden tabs are excluded from getTabs(). */
  setTabHidden(id: string, hidden: boolean): void {
    if (hidden) hiddenTabs.add(id);
    else hiddenTabs.delete(id);
  },

  getTabs(): SettingsTab[] {
    return registry.filter((t) => !hiddenTabs.has(t.id));
  },

  getTab(id: string): SettingsTab | undefined {
    return registry.find((t) => t.id === id);
  },
};
