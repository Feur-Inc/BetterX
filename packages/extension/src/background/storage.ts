import type { IStorage } from "@betterx/core";
import type { PluginStorageData } from "@betterx/core";
import type { ThemeStorageState } from "@betterx/core";
import browser from "webextension-polyfill";

// ─── Extension Storage (IStorage impl) ───────────────────────────────────────
// Plugin states + theme metadata → browser.storage.sync
// Theme CSS blobs → browser.storage.local (larger quota)

const PLUGIN_STATES_KEY = "bx_plugin_states";
const THEME_STATE_KEY = "bx_theme_state";
const THEME_CSS_PREFIX = "bx_theme_css_";

const DEFAULT_THEME_STATE: ThemeStorageState = { order: [], active: [] };

type ThemeChangedCallback = (id: string, css: string) => void;

export class ExtensionStorage implements IStorage {
  private themeListeners = new Set<ThemeChangedCallback>();

  constructor() {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      for (const [key, change] of Object.entries(changes)) {
        if (key.startsWith(THEME_CSS_PREFIX)) {
          const id = key.slice(THEME_CSS_PREFIX.length);
          const css = (change.newValue as string | undefined) ?? "";
          for (const cb of this.themeListeners) cb(id, css);
        }
      }
    });
  }

  async getPluginStates(): Promise<Record<string, PluginStorageData>> {
    const result = await browser.storage.sync.get(PLUGIN_STATES_KEY);
    return (result[PLUGIN_STATES_KEY] as Record<string, PluginStorageData> | undefined) ?? {};
  }

  async setPluginStates(data: Record<string, PluginStorageData>): Promise<void> {
    await browser.storage.sync.set({ [PLUGIN_STATES_KEY]: data });
  }

  async getThemeState(): Promise<ThemeStorageState> {
    const result = await browser.storage.sync.get(THEME_STATE_KEY);
    return (result[THEME_STATE_KEY] as ThemeStorageState | undefined) ?? DEFAULT_THEME_STATE;
  }

  async setThemeState(state: ThemeStorageState): Promise<void> {
    await browser.storage.sync.set({ [THEME_STATE_KEY]: state });
  }

  async listThemes(): Promise<string[]> {
    const state = await this.getThemeState();
    return state.order;
  }

  async readTheme(id: string): Promise<string> {
    const result = await browser.storage.local.get(THEME_CSS_PREFIX + id);
    return (result[THEME_CSS_PREFIX + id] as string | undefined) ?? "";
  }

  async writeTheme(id: string, css: string): Promise<void> {
    await browser.storage.local.set({ [THEME_CSS_PREFIX + id]: css });
  }

  async deleteTheme(id: string): Promise<void> {
    await browser.storage.local.remove(THEME_CSS_PREFIX + id);
  }

  onThemeChanged(cb: ThemeChangedCallback): () => void {
    this.themeListeners.add(cb);
    return () => this.themeListeners.delete(cb);
  }
}
