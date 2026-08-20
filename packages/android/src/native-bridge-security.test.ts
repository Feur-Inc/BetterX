/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const bridgeSource = readFileSync(
  new URL("../app/src/main/java/com/feurinc/betterx/android/BetterXBridge.kt", import.meta.url),
  "utf8"
);

describe("Android native proxy redirect policy", () => {
  test("disables URLConnection automatic redirects", () => {
    expect(bridgeSource).toContain("connection.instanceFollowRedirects = false");
    expect(bridgeSource).not.toContain("connection.instanceFollowRedirects = true");
  });

  test("bounds redirects and validates every next URL", () => {
    expect(bridgeSource).toContain("repeat(MAX_REDIRECTS + 1)");
    expect(bridgeSource).toContain("also { validateNetworkUrl(it) }");
  });
});
