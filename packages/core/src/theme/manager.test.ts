import { describe, expect, test } from "bun:test";
import type { PluginStorageData } from "../types/plugin.js";
import type { IStorage } from "../types/storage.js";
import type { ThemeStorageState } from "../types/theme.js";
import { ThemeManager } from "./manager.js";

class ThemeStorage implements IStorage {
  css = "old";
  failWrites = false;

  async getPluginStates(): Promise<Record<string, PluginStorageData>> {
    return {};
  }
  async setPluginStates(): Promise<void> {}
  async getThemeState(): Promise<ThemeStorageState> {
    return { order: ["theme.css"], active: [] };
  }
  async setThemeState(): Promise<void> {}
  async listThemes(): Promise<string[]> {
    return ["theme.css"];
  }
  async readTheme(): Promise<string> {
    return this.css;
  }
  async writeTheme(_id: string, css: string): Promise<void> {
    if (this.failWrites) throw new Error("disk full");
    this.css = css;
  }
  async deleteTheme(): Promise<void> {}
  onThemeChanged(): () => void {
    return () => {};
  }
}

describe("ThemeManager updates", () => {
  test("does not mutate in-memory CSS when persistence fails", async () => {
    const storage = new ThemeStorage();
    const manager = new ThemeManager(storage);
    await manager.initialize();
    storage.failWrites = true;

    await expect(manager.update("theme.css", "new")).rejects.toThrow("disk full");

    expect(manager.get("theme.css")?.css).toBe("old");
    expect(storage.css).toBe("old");
  });
});
