import { describe, expect, test } from "bun:test";
import { BETTERX_STYLES } from "./styles.js";

describe("BetterX UI typography", () => {
  test("pins notification text and controls to the BetterX font stack", () => {
    expect(BETTERX_STYLES).toContain(
      '#betterx-notification-container,\n#betterx-notification-container * {\n  font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;\n}'
    );
  });
});
