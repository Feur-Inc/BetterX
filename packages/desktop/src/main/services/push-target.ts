// ─── Push Notification Targets ────────────────────────────────────────────────

// Pure helpers for reading a click target out of an X push payload. Kept free of
// Electron imports so the payload shapes X sends can be covered by tests.

export const X_BASE_URL = "https://x.com";

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isXUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname;
    return (
      host === "x.com" ||
      host === "twitter.com" ||
      host.endsWith(".x.com") ||
      host.endsWith(".twitter.com")
    );
  } catch {
    return false;
  }
}

const URL_KEY_HINTS = new Set([
  "url",
  "uri",
  "link",
  "permalink",
  "clickaction",
  "targeturl",
  "deeplink",
  "weburl",
  "tweeturl",
  "statusurl",
  "canonicalurl",
  "actionurl",
  "path",
]);

/**
 * Accept both absolute links and the site-relative paths X commonly sends
 * (for example "/i/web/status/123"), which would otherwise be discarded and
 * fall back to the generic notifications page.
 */
export function resolveNotificationUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const relative = trimmed.startsWith("/") && !trimmed.startsWith("//");
  if (!relative && !/^https?:\/\//i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed, X_BASE_URL);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** A permalink to a specific post beats a generic X link, which beats anything else. */
export function scoreTargetUrl(url: string): number {
  if (/\/status(?:es)?\/\d+/.test(url)) return 3;
  if (isXUrl(url)) return 2;
  return 1;
}

export type ScoredTarget = { url: string; score: number };

export function findTargetUrlDeep(value: unknown, maxDepth = 6, depth = 0): ScoredTarget | null {
  if (depth > maxDepth || value == null) return null;

  let best: ScoredTarget | null = null;
  const consider = (candidate: ScoredTarget | null): boolean => {
    if (candidate && (!best || candidate.score > best.score)) best = candidate;
    return best?.score === 3;
  };

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (consider(findTargetUrlDeep(entry, maxDepth, depth + 1))) break;
    }
    return best;
  }

  const record = asRecord(value);
  if (!record) return null;

  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === "string") {
      if (!URL_KEY_HINTS.has(key.toLowerCase().replace(/[^a-z]/g, ""))) continue;
      const url = resolveNotificationUrl(entry);
      if (url && consider({ url, score: scoreTargetUrl(url) })) break;
      continue;
    }
    if (consider(findTargetUrlDeep(entry, maxDepth, depth + 1))) break;
  }

  return best;
}
