/// <reference types="bun" />
import { expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import { extractSnapshot } from "./extract.js";

const fixture = `<a data-testid="AppTabBar_Profile_Link" href="/owner">Profile</a>
<main><article data-testid="tweet">
 <div data-testid="User-Name"><a href="/alice">Alice</a><a href="/alice/status/123"><time datetime="2026-09-01T00:00:00Z">Sep 1</time></a></div>
 <div data-testid="tweetText">Agent memory <a href="https://example.com/paper">paper</a></div>
 <div role="link"><div data-testid="User-Name"><a href="/bob/status/456"><time>Yesterday</time></a></div><div data-testid="tweetText">Quoted text</div></div>
 <button data-testid="tweet-text-show-more-link">Show more</button>
</article></main>`;

test("reads History only when its Bookmarks tab is selected, not Likes", () => {
  const bookmarks = parseHTML(`<div role="tab" aria-selected="true">Bookmarks </div>${fixture}`);
  expect(extractSnapshot(bookmarks.document, "https://x.com/i/history").posts).toHaveLength(1);
  const likes = parseHTML(`<div role="tab" aria-selected="true">Likes</div>${fixture}`);
  expect(extractSnapshot(likes.document, "https://x.com/i/history").posts).toHaveLength(0);
  expect(extractSnapshot(likes.document, "https://x.com/i/history").view).toBe("unsupported");
});

test("extracts the parent post, source link and truncation without including quoted text", () => {
  const { document } = parseHTML(fixture);
  const snapshot = extractSnapshot(document, "https://x.com/i/bookmarks");
  expect(snapshot.account).toBe("owner");
  expect(snapshot.posts).toHaveLength(1);
  expect(snapshot.posts[0]).toMatchObject({
    id: "123",
    author: "alice",
    url: "https://x.com/alice/status/123",
    text: "Agent memory paper",
    truncated: true,
  });
  expect(snapshot.posts[0]?.links).toEqual(["https://example.com/paper"]);
  expect(snapshot.complete).toBe(false);
});

test("does not label quoted text as the parent of a media-only post", () => {
  const { document } = parseHTML(
    fixture.replace(
      '<div data-testid="tweetText">Agent memory <a href="https://example.com/paper">paper</a></div>',
      '<div data-testid="tweetPhoto"><img alt="A diagram"></div>'
    )
  );
  expect(extractSnapshot(document, "https://x.com/i/bookmarks").posts[0]?.text).toBe("");
});

test("returns login/loading states rather than claiming an empty bookmark library", () => {
  const { document } = parseHTML('<a href="/i/flow/login">Log in</a>');
  expect(extractSnapshot(document, "https://x.com/i/flow/login").state).toBe("login_required");
  const loading = parseHTML(
    '<a data-testid="AppTabBar_Profile_Link" href="/owner">Profile</a><div role="progressbar"></div>'
  );
  expect(extractSnapshot(loading.document, "https://x.com/i/bookmarks").state).toBe("loading");
});
