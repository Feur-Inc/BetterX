import { Devs, definePlugin, proxyFetch, proxyImage } from "@betterx/core";
import type { ProxyFetchInit, ProxyFetchResult } from "@betterx/core";

// ─── BxFetch API ──────────────────────────────────────────────────────────────
// Re-exported from this module so dependent plugins have a single import point
// and benefit from the timeout + retry wrapper below.

export type { ProxyFetchResult, ProxyFetchInit };

export type BxFetchOptions = ProxyFetchInit & {
  /** Request timeout in ms. Default: 15 000 */
  timeout?: number;
  /** How many times to retry on network error or 5xx. Default: 0 */
  retries?: number;
  /** Base delay between retries in ms (doubles each attempt). Default: 500 */
  retryDelay?: number;
};

async function fetchOnce(url: string, opts: BxFetchOptions): Promise<ProxyFetchResult> {
  const { timeout = 15_000, retries: _r, retryDelay: _d, ...init } = opts;

  const timeoutId =
    timeout > 0
      ? setTimeout(() => {
          /* can't abort proxyFetch, but we reject below */
        }, timeout)
      : null;

  const race = Promise.race([
    proxyFetch(url, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout)
    ),
  ]);

  try {
    return await race;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

/**
 * Enhanced `proxyFetch` wrapper with timeout and retry support.
 *
 * Plugins that need external HTTP requests should import this instead of
 * `proxyFetch` from `@betterx/core`, and declare `dependencies: ["ProxyFetch"]`.
 */
export async function bxFetch(url: string, opts: BxFetchOptions = {}): Promise<ProxyFetchResult> {
  const { retries = 0, retryDelay = 500 } = opts;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchOnce(url, opts);
      // Retry on server errors
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * 2 ** attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * 2 ** attempt));
      }
    }
  }

  throw lastErr;
}

/** Proxy an image URL through the platform to bypass X's CSP. */
export { proxyImage as bxProxyImage };

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
  name: "ProxyFetch",
  description: "Provides external HTTP request capabilities (timeout, retry) to other plugins.",
  authors: [Devs.Mopi],
  isLibrary: true,

  start() {},
  stop() {},
});
