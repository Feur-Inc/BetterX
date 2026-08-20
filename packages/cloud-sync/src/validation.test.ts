import { describe, expect, test } from "bun:test";
import { validThemeId } from "./validation.js";

describe("cloud theme ID validation", () => {
  test("accepts every locally supported filename character", () => {
    expect(validThemeId("my theme.v2_test-dark.css")).toBe(true);
  });

  test("rejects paths, missing extensions, and overlong names", () => {
    expect(validThemeId("../theme.css")).toBe(false);
    expect(validThemeId("theme")).toBe(false);
    expect(validThemeId(`${"a".repeat(101)}.css`)).toBe(false);
  });
});
