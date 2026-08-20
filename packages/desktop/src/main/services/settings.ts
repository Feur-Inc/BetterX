import type { PluginStorageData, ThemeStorageState } from "@betterx/core";
import Store from "electron-store";
import { BETTERX_DIR } from "../paths.js";

// ─── Settings Service ─────────────────────────────────────────────────────────

export type DesktopSettings = {
  bundlePath: string;
  currentHash: string | null;
  enableTransparency: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  autoStart: boolean;
  checkForUpdates: boolean;
  enableDiscordRPC: boolean;
  pluginStates: Record<string, PluginStorageData>;
  themeState: ThemeStorageState;
};

const DEFAULT_SETTINGS: DesktopSettings = {
  bundlePath: "",
  currentHash: null,
  enableTransparency: false,
  startMinimized: false,
  minimizeToTray: true,
  autoStart: false,
  checkForUpdates: true,
  enableDiscordRPC: false,
  pluginStates: {},
  themeState: { order: [], active: [] },
};

export const settingsStore = new Store<DesktopSettings>({
  name: "desktop.settings",
  cwd: BETTERX_DIR,
  defaults: DEFAULT_SETTINGS,
});

export function getSetting<K extends keyof DesktopSettings>(key: K): DesktopSettings[K] {
  return settingsStore.get(key);
}

export function setSetting<K extends keyof DesktopSettings>(
  key: K,
  value: DesktopSettings[K]
): void {
  settingsStore.set(key, value);
}

export function getAllSettings(): DesktopSettings {
  return settingsStore.store;
}
