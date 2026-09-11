/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { canonicalPostUrl, isReadablePage, parseCommand } from "./protocol.js";

describe("agent command boundary", () => {
  test("only allows post navigation, never auth, DMs, external hosts or URL credentials", () => {
    expect(canonicalPostUrl("https://twitter.com/alice/status/123?s=20")).toBe(
      "https://x.com/alice/status/123"
    );
    for (const url of [
      "https://x.com/i/chat",
      "https://x.com/settings",
      "https://x.com.evil.test/a/status/1",
      "https://user:secret@x.com/a/status/1",
      "http://x.com/a/status/1",
      "https://x.com:444/a/status/1",
    ]) {
      expect(() => canonicalPostUrl(url)).toThrow();
    }
  });
  test("rejects arbitrary commands, injected parameters and unbounded collection", () => {
    for (const input of [
      { name: "execute_js", args: { code: "document.cookie" } },
      { name: "open_bookmarks", args: { url: "https://evil.test" } },
      { name: "collect_bookmarks", args: { pages: 500 } },
      { name: "scroll_feed", args: { direction: "sideways" } },
    ])
      expect(() => parseCommand(input)).toThrow();
    expect(parseCommand({ name: "collect_bookmarks", args: { pages: 2 } }).args).toEqual({
      pages: 2,
    });
  });
  test("does not make messages, login or settings readable", () => {
    expect(isReadablePage("https://x.com/i/bookmarks")).toBe(true);
    expect(isReadablePage("https://x.com/i/history")).toBe(true);
    expect(isReadablePage("https://x.com/home")).toBe(true);
    for (const path of ["/i/chat", "/messages", "/i/flow/login", "/settings", "/notifications"]) {
      expect(isReadablePage(`https://x.com${path}`)).toBe(false);
    }
  });
});
