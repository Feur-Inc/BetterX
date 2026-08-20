// ─── Platform Proxy Registry ──────────────────────────────────────────────────
// Plugins that need to fetch external resources (images, APIs) should use
// `proxyImage` / `proxyFetch` instead of raw `fetch` or `<img src>`.
//
// Why: X's Content Security Policy blocks requests to most external origins.
// On the extension the background service worker is exempt from the page CSP,
// so requests are tunnelled through it and returned as data URLs / plain data.
// On the desktop Electron patches the CSP headers at the network layer, so
// native fetch works fine - the proxy falls back to it transparently.
//
// Usage in a plugin:
//
//   import { proxyImage, proxyFetch } from "@betterx/core";
//
//   // Load an external image as a data URL safe to use in CSS / <img>:
//   const src = await proxyImage("https://example.com/cat.png");
//   el.style.backgroundImage = `url('${src}')`;
//
//   // Call an external JSON API:
//   const { ok, json } = await proxyFetch("https://api.example.com/data");
//
//   // POST with a body:
//   const res = await proxyFetch("https://api.example.com/save", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ key: "value" }),
//   });

/** Result returned by {@link proxyFetch}. */
export type ProxyFetchResult = {
  ok: boolean;
  status: number;
  /** Response body as a string. */
  text: string;
  /** Response body parsed as JSON, or `null` if not valid JSON. */
  json: unknown;
};

/** Subset of `RequestInit` supported by the proxy (serialisable over messaging). */
export type ProxyFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Include the target origin's cookies. Reserved for authenticated services such as Cloud Sync. */
  credentials?: "include" | "omit";
};

let _imageFn: ((url: string) => Promise<string>) | undefined;
let _fetchFn: ((url: string, init?: ProxyFetchInit) => Promise<ProxyFetchResult>) | undefined;

/**
 * Register the platform image proxy.
 * Called once by the platform layer (extension content script / desktop preload).
 * Plugins should not call this directly - use {@link proxyImage} instead.
 */
export function setImageProxy(fn: (url: string) => Promise<string>): void {
  _imageFn = fn;
}

/**
 * Register the platform fetch proxy.
 * Called once by the platform layer (extension content script / desktop preload).
 * Plugins should not call this directly - use {@link proxyFetch} instead.
 */
export function setFetchProxy(
  fn: (url: string, init?: ProxyFetchInit) => Promise<ProxyFetchResult>
): void {
  _fetchFn = fn;
}

/**
 * Fetch an external image, bypassing the page's Content Security Policy.
 *
 * Returns a `data:` URL that can be used anywhere a URL is accepted
 * (`<img src>`, `background-image`, etc.). Falls back to the original URL
 * on desktop where Electron already relaxes the CSP.
 *
 * @example
 * const src = await proxyImage("https://example.com/sprite.png");
 * el.style.backgroundImage = `url('${src}')`;
 */
export async function proxyImage(url: string): Promise<string> {
  if (_imageFn) return _imageFn(url);
  return url;
}

/**
 * Fetch an external URL, bypassing the page's Content Security Policy.
 *
 * Routes through the extension background service worker (which is not
 * subject to the page CSP) on the extension platform, and falls back to
 * a native `fetch` call on desktop.
 *
 * @param url  The URL to fetch.
 * @param init Optional method / headers / body (must be serialisable to JSON).
 * @returns    `{ ok, status, text, json }` - `json` is `null` if the response
 *             body is not valid JSON.
 *
 * @example
 * // GET
 * const { ok, json } = await proxyFetch("https://api.example.com/info");
 *
 * // POST
 * const res = await proxyFetch("https://api.example.com/save", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ hello: "world" }),
 * });
 */
export async function proxyFetch(url: string, init?: ProxyFetchInit): Promise<ProxyFetchResult> {
  if (_fetchFn) return _fetchFn(url, init);
  const res = await fetch(url, init);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { ok: res.ok, status: res.status, text, json };
}
