import { describe, expect, test } from "bun:test";
import type { IStorage, PluginDefinition, PluginStorageData, ThemeStorageState } from "../index.js";
import { PluginManager } from "./manager.js";

class MemoryStorage implements IStorage {
  pluginStates: Record<string, PluginStorageData>;
  writes = 0;

  constructor(pluginStates: Record<string, PluginStorageData>) {
    this.pluginStates = pluginStates;
  }

  async getPluginStates(): Promise<Record<string, PluginStorageData>> {
    return this.pluginStates;
  }

  async setPluginStates(data: Record<string, PluginStorageData>): Promise<void> {
    this.pluginStates = data;
    this.writes++;
  }

  async getThemeState(): Promise<ThemeStorageState> {
    return { order: [], active: [] };
  }

  async setThemeState(): Promise<void> {}
  async listThemes(): Promise<string[]> {
    return [];
  }
  async readTheme(): Promise<string> {
    return "";
  }
  async writeTheme(): Promise<void> {}
  async deleteTheme(): Promise<void> {}
  onThemeChanged(): () => void {
    return () => {};
  }
}

const enabled = { enabled: true, settings: {} };

describe("PluginManager lifecycle", () => {
  test("awaits dependencies before starting dependents", async () => {
    const calls: string[] = [];
    const definitions: PluginDefinition[] = [
      {
        name: "dependency",
        async start() {
          await Promise.resolve();
          calls.push("dependency");
        },
      },
      {
        name: "consumer",
        dependencies: ["dependency"],
        start() {
          calls.push("consumer");
        },
      },
    ];
    const manager = new PluginManager(
      new MemoryStorage({ dependency: enabled, consumer: enabled })
    );

    await manager.initialize(definitions);

    expect(calls).toEqual(["dependency", "consumer"]);
  });

  test("disables and persists a plugin whose async start rejects", async () => {
    const storage = new MemoryStorage({ broken: enabled });
    const manager = new PluginManager(storage);

    await manager.initialize([
      {
        name: "broken",
        async start() {
          throw new Error("boom");
        },
      },
    ]);

    expect(manager.get("broken")?.enabled).toBe(false);
    expect(storage.pluginStates.broken?.enabled).toBe(false);
    expect(storage.writes).toBe(1);
  });

  test("does not start a dependent when its dependency fails during enable", async () => {
    const storage = new MemoryStorage({});
    const manager = new PluginManager(storage);
    let dependentStarts = 0;

    await manager.initialize([
      {
        name: "dependency",
        async start() {
          throw new Error("dependency failed");
        },
      },
      {
        name: "dependent",
        dependencies: ["dependency"],
        start() {
          dependentStarts++;
        },
      },
    ]);

    // biome-ignore lint/complexity/useLiteralKeys: directly exercise failure rollback without DOM notifications
    await manager["enableWithDependencies"]("dependent");

    expect(manager.get("dependency")?.enabled).toBe(false);
    expect(manager.get("dependent")?.enabled).toBe(false);
    expect(dependentStarts).toBe(0);
  });

  test("stops dependents before their dependency", async () => {
    const storage = new MemoryStorage({
      dependency: { enabled: true, settings: {} },
      dependent: { enabled: true, settings: {} },
    });
    const manager = new PluginManager(storage);
    const stops: string[] = [];

    await manager.initialize([
      {
        name: "dependency",
        start() {},
        stop: () => {
          stops.push("dependency");
        },
      },
      {
        name: "dependent",
        dependencies: ["dependency"],
        start() {},
        stop: () => {
          stops.push("dependent");
        },
      },
    ]);
    // biome-ignore lint/complexity/useLiteralKeys: directly verify internal stop ordering
    await manager["disableWithDependents"]("dependency");

    expect(stops).toEqual(["dependent", "dependency"]);
  });
});
