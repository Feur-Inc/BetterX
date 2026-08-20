/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { patchBetterXCSP } from "./csp.js";

describe("desktop CSP patch", () => {
  test("removes only script nonces and enables BetterX image sources", () => {
    const result = patchBetterXCSP(
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'nonce-abc123'; style-src 'nonce-keep'; img-src 'self' data:"
    );

    expect(result).toContain("script-src 'self' 'unsafe-inline'");
    expect(result).not.toContain("nonce-abc123");
    expect(result).toContain("style-src 'nonce-keep'");
    expect(result).toContain("img-src 'self' data: betterx: https:");
  });

  test("adds an image directive when X omits one", () => {
    expect(patchBetterXCSP("default-src 'self'")).toContain("img-src betterx: https:");
  });
});
