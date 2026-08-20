/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Android main-world startup", () => {
  test("observes the Document node at document_start", () => {
    const source = readFileSync(new URL("./main-world.ts", import.meta.url), "utf8");
    expect(source).toContain(".observe(document, {");
    expect(source).not.toContain(".observe(document.documentElement");
  });
});
