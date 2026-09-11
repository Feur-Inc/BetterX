/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { findTargetUrlDeep, resolveNotificationUrl, scoreTargetUrl } from "./push-target.js";

describe("push notification targets", () => {
  test("resolves site-relative paths against x.com", () => {
    expect(resolveNotificationUrl("/i/web/status/1234567890")).toBe(
      "https://x.com/i/web/status/1234567890"
    );
    expect(resolveNotificationUrl("https://x.com/jack/status/42")).toBe(
      "https://x.com/jack/status/42"
    );
  });

  test("rejects non-links and unsafe schemes", () => {
    expect(resolveNotificationUrl("Someone liked your post")).toBeNull();
    expect(resolveNotificationUrl("javascript:alert(1)")).toBeNull();
    expect(resolveNotificationUrl("")).toBeNull();
    expect(resolveNotificationUrl(undefined)).toBeNull();
  });

  test("ranks post permalinks above generic X links", () => {
    expect(scoreTargetUrl("https://x.com/jack/status/42")).toBe(3);
    expect(scoreTargetUrl("https://x.com/notifications")).toBe(2);
    expect(scoreTargetUrl("https://example.com/thing")).toBe(1);
  });

  test("finds a nested post permalink under an unknown payload shape", () => {
    const payload = {
      title: "New post",
      data: { tweet: { permalink: "/jack/status/99" }, type: "post" },
    };
    expect(findTargetUrlDeep(payload)?.url).toBe("https://x.com/jack/status/99");
  });

  test("prefers a post permalink over a generic landing page", () => {
    const payload = {
      url: "https://x.com/notifications",
      data: { uri: "/i/web/status/123" },
    };
    expect(findTargetUrlDeep(payload)).toEqual({
      url: "https://x.com/i/web/status/123",
      score: 3,
    });
  });

  test("ignores string values that are not link-shaped keys", () => {
    expect(findTargetUrlDeep({ body: "https://x.com/jack/status/42" })).toBeNull();
  });

  test("returns null when the payload carries no usable link", () => {
    expect(findTargetUrlDeep({ title: "hi", data: { type: "like" } })).toBeNull();
  });
});
