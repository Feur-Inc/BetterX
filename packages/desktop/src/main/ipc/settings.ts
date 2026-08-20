import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { getAllSettings, getSetting, setSetting } from "../services/settings.js";
import type { DesktopSettings } from "../services/settings.js";
import { assertTrustedSender } from "./security.js";

// ─── Settings IPC Handlers ────────────────────────────────────────────────────

export function registerSettingsHandlers(): void {
  ipcMain.handle("settings:get-all", (event) => {
    assertTrustedSender(event);
    return getAllSettings();
  });

  ipcMain.handle("settings:get", (event, key: keyof DesktopSettings) => {
    assertTrustedSender(event);
    assertSettingKey(key);
    return getSetting(key);
  });

  ipcMain.on("settings:get-sync", (event, key: keyof DesktopSettings) => {
    assertTrustedSender(event);
    assertSettingKey(key);
    event.returnValue = getSetting(key);
  });

  ipcMain.handle(
    "settings:set",
    (event, key: keyof DesktopSettings, value: DesktopSettings[typeof key]) => {
      assertTrustedSender(event);
      assertSettingValue(key, value);
      setSetting(key, value);
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send("settings:changed", key, value);
      }
      if (key === "autoStart") {
        app.setLoginItemSettings({ openAtLogin: value as boolean });
      }
    }
  );

  ipcMain.handle("settings:choose-bundle-path", async (event) => {
    assertTrustedSender(event);
    const result = await dialog.showOpenDialog({
      title: "Select BetterX bundle.js",
      filters: [{ name: "JavaScript", extensions: ["js"] }],
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const path = result.filePaths[0];
    setSetting("bundlePath", path);
    return path;
  });
}

const SETTING_KEYS = new Set<keyof DesktopSettings>([
  "bundlePath",
  "enableTransparency",
  "startMinimized",
  "minimizeToTray",
  "autoStart",
  "enableDiscordRPC",
  "pluginStates",
  "themeState",
]);

function assertSettingKey(key: unknown): asserts key is keyof DesktopSettings {
  if (typeof key !== "string" || !SETTING_KEYS.has(key as keyof DesktopSettings)) {
    throw new Error("Invalid setting key");
  }
}

function assertSettingValue(key: unknown, value: unknown): asserts key is keyof DesktopSettings {
  assertSettingKey(key);
  if (key === "bundlePath") {
    if (typeof value !== "string") throw new Error("Invalid bundle path");
    return;
  }
  if (key === "pluginStates") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Invalid plugin state");
    }
    const entries = Object.entries(value);
    if (entries.length > 250) throw new Error("Too many plugin states");
    for (const [name, state] of entries) {
      if (
        name.length === 0 ||
        name.length > 100 ||
        !state ||
        typeof state !== "object" ||
        Array.isArray(state)
      ) {
        throw new Error("Invalid plugin state");
      }
      const candidate = state as Record<string, unknown>;
      if (
        typeof candidate.enabled !== "boolean" ||
        !candidate.settings ||
        typeof candidate.settings !== "object" ||
        Array.isArray(candidate.settings)
      ) {
        throw new Error("Invalid plugin state");
      }
    }
    if (JSON.stringify(value).length > 1_000_000) throw new Error("Plugin state is too large");
    return;
  }
  if (key === "themeState") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Invalid theme state");
    }
    const state = value as Record<string, unknown>;
    if (!Array.isArray(state.order) || !Array.isArray(state.active)) {
      throw new Error("Invalid theme state");
    }
    const ids = [...state.order, ...state.active];
    if (
      ids.length > 200 ||
      ids.some((id) => typeof id !== "string" || !/^[a-zA-Z0-9._ -]+\.css$/.test(id))
    ) {
      throw new Error("Invalid theme state");
    }
    return;
  }
  if (typeof value !== "boolean") throw new Error("Invalid boolean setting");
}
