import { session } from "electron";

// ─── Security ─────────────────────────────────────────────────────────────────

/**
 * Configure Content-Security-Policy to allow the betterx:// script protocol
 * while keeping X.com's existing CSP otherwise intact.
 *
 * BetterX runs in an Electron isolated world, so X's script nonce remains
 * intact. Only resource directives needed by BetterX assets are extended.
 */
export function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    // Only patch X.com / Twitter CSP
    const url = details.url;
    let trustedMainDocument = false;
    try {
      const parsed = new URL(details.url);
      trustedMainDocument =
        details.resourceType === "mainFrame" &&
        parsed.protocol === "https:" &&
        (parsed.hostname === "x.com" || parsed.hostname === "twitter.com");
    } catch {
      trustedMainDocument = false;
    }
    if (!trustedMainDocument) {
      callback({ responseHeaders });
      return;
    }

    const cspKey = Object.keys(responseHeaders).find(
      (k) => k.toLowerCase() === "content-security-policy"
    );

    if (cspKey) {
      const existing = responseHeaders[cspKey];
      if (Array.isArray(existing)) {
        responseHeaders[cspKey] = existing.map((directive) =>
          directive
            // Allow any HTTPS image - plugins load from GitHub, cataas, unavatar, etc.
            .replace("img-src", "img-src betterx: https:")
        );
      }
    }

    callback({ responseHeaders });
  });
}
