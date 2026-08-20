import { describe, expect, test } from "bun:test";
import { prioritizeThemeRules } from "./manager.js";
import { processCSS } from "./processor.js";

describe("processCSS", () => {
  test("preserves authored CSS exactly", () => {
    const css = `:root{--image:url("data:image/svg+xml;a:b");}\n@keyframes fade{0%{opacity:0}100%{opacity:1}}`;
    expect(processCSS(css)).toBe(css);
  });

  test("does not rewrite existing important declarations", () => {
    const css = ".target { color: red !important; color: var(--accent, blue); }";
    expect(processCSS(css)).toBe(css);
  });
});

describe("prioritizeThemeRules", () => {
  test("adds importance recursively without touching keyframes", () => {
    const priorities = new Map<string, string>();
    const values = new Map([
      ["background", "transparent"],
      ["color", "red"],
    ]);
    const declaration = {
      *[Symbol.iterator]() {
        yield* values.keys();
      },
      getPropertyPriority(property: string) {
        return priorities.get(property) ?? "";
      },
      getPropertyValue(property: string) {
        return values.get(property) ?? "";
      },
      setProperty(property: string, value: string, priority: string) {
        values.set(property, value);
        priorities.set(property, priority);
      },
    };
    const nested = [{ type: 1, style: declaration }];
    const rules = [{ type: 4, cssRules: nested }, { type: 7 }] as unknown as CSSRuleList;

    prioritizeThemeRules(rules);

    expect(priorities.get("background")).toBe("important");
    expect(priorities.get("color")).toBe("important");
  });
});
