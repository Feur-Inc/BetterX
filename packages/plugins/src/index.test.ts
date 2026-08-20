/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { allPlugins } from "./index.js";

describe("plugin registry", () => {
  test("has unique names and resolvable dependencies", () => {
    const names = allPlugins.map((plugin) => plugin.name);
    const available = new Set(names);

    expect(available.size).toBe(names.length);
    for (const plugin of allPlugins) {
      for (const dependency of plugin.dependencies ?? []) {
        expect(available.has(dependency)).toBe(true);
      }
    }
  });
});
