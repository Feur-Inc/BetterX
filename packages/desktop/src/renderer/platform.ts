import type { IStorage } from "@betterx/core";
import type { PluginStorageData } from "@betterx/core";
import type { ThemeStorageState } from "@betterx/core";

// ─── Desktop Storage (IStorage impl) ─────────────────────────────────────────
// Uses window.electronAPI (exposed by preload via contextBridge).
// Plugin states / theme state → electron-store (via IPC)
// Theme CSS blobs → filesystem via IPC

type ElectronAPIThemes = {
  list(): Promise<string[]>;
  read(id: string): Promise<string>;
  write(id: string, css: string): Promise<void>;
  delete(id: string): Promise<void>;
  onChanged(callback: (id: string, css: string) => void): () => void;
  openFolder(): Promise<void>;
};

type ElectronAPISettings = {
  getAll(): Promise<Record<string, unknown>>;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  chooseBundlePath(): Promise<string | null>;
};

type ElectronAPIUpdate = {
  checkBundle(): Promise<{ updateAvailable: boolean; remoteHash: string }>;
  applyBundle(remoteHash: string): Promise<void>;
  onBundleApplied(callback: () => void): () => void;
};

declare global {
  interface Window {
    electronAPI: {
      themes: ElectronAPIThemes;
      settings: ElectronAPISettings;
      update?: ElectronAPIUpdate;
      captureElement?(rect: {
        x: number;
        y: number;
        width: number;
        height: number;
      }): Promise<string>;
      getVersion?(): string;
      restart?(): void;
      openOAuth(url: string): Promise<void>;
      onOAuthComplete(callback: () => void): () => void;
      cloudFetch(
        serverUrl: string,
        path: string,
        options?: { method?: string; body?: string }
      ): Promise<{
        ok: boolean;
        status: number;
        json: unknown;
        text: string;
      }>;
      proxyFetch(
        url: string,
        options?: { method?: string; body?: string; headers?: Record<string, string> }
      ): Promise<{
        ok: boolean;
        status: number;
        json: unknown;
        text: string;
      }>;
      discordRPC?: {
        updateActivity(details: string, state: string): void;
      };
    };
  }
}

const PLUGIN_STATES_KEY = "pluginStates";
const THEME_STATE_KEY = "themeState";

type ThemeChangedCallback = (id: string, css: string) => void;

export class DesktopStorage implements IStorage {
  private api = window.electronAPI;

  async getPluginStates(): Promise<Record<string, PluginStorageData>> {
    const val = await this.api.settings.get(PLUGIN_STATES_KEY);
    return (val as Record<string, PluginStorageData> | undefined) ?? {};
  }

  async setPluginStates(data: Record<string, PluginStorageData>): Promise<void> {
    await this.api.settings.set(PLUGIN_STATES_KEY, data);
  }

  async getThemeState(): Promise<ThemeStorageState> {
    const val = await this.api.settings.get(THEME_STATE_KEY);
    return (val as ThemeStorageState | undefined) ?? { order: [], active: [] };
  }

  async setThemeState(state: ThemeStorageState): Promise<void> {
    await this.api.settings.set(THEME_STATE_KEY, state);
  }

  async listThemes(): Promise<string[]> {
    return this.api.themes.list();
  }

  async readTheme(id: string): Promise<string> {
    return this.api.themes.read(id);
  }

  async writeTheme(id: string, css: string): Promise<void> {
    return this.api.themes.write(id, css);
  }

  async deleteTheme(id: string): Promise<void> {
    return this.api.themes.delete(id);
  }

  onThemeChanged(cb: ThemeChangedCallback): () => void {
    return this.api.themes.onChanged(cb);
  }
}
