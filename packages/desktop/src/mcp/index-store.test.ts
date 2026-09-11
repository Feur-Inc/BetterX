/// <reference types="bun" />
import { expect, test } from "bun:test";
import { SessionIndex } from "./index-store.js";
import type { Snapshot } from "./protocol.js";

function page(account: string | null, id: string, text: string): Snapshot {
  return {
    view: "bookmarks",
    account,
    page: "https://x.com/i/bookmarks",
    capturedAt: "2026-09-07T00:00:00Z",
    state: "ready",
    complete: false,
    source: "rendered_dom",
    posts: [
      {
        id,
        text,
        author: "alice",
        url: `https://x.com/alice/status/${id}`,
        publishedAt: null,
        truncated: false,
        links: [],
        mediaDescriptions: [],
      },
    ],
  };
}
test("deduplicates posts, searches text, and never mixes accounts", () => {
  const index = new SessionIndex();
  index.observe(page("one", "123", "Agent memory"));
  index.observe(page("one", "123", "Agent memory updated"));
  expect(index.search("memory", 20).posts).toHaveLength(1);
  expect(index.search("UPDATED", 20).posts[0]?.text).toBe("Agent memory updated");
  index.observe(page("two", "456", "Different account"));
  expect(index.search("memory", 20).posts).toHaveLength(0);
  index.observe(page(null, "456", "not authenticated"));
  expect(index.search("account", 20).posts).toHaveLength(0);
});
