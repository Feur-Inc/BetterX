import { describe, expect, test } from "bun:test";
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
