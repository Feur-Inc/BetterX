import type { Session } from "electron";
import { patchBetterXCSP } from "./csp.js";

// ─── Security ─────────────────────────────────────────────────────────────────

/**
 * Configure X's Content-Security-Policy for BetterX's main-world patches and
 * external plugin images while keeping the remaining directives intact.
 *
 * X includes a nonce alongside unsafe-inline, which makes Chromium ignore
 * unsafe-inline and blocks BetterX's main-world patches. Strip only nonce
 * sources from X's script directives and extend image sources for BetterX.
 */
const configuredSessions = new WeakSet<Session>();

export function setupCSP(targetSession: Session): void {
  if (configuredSessions.has(targetSession)) return;
  configuredSessions.add(targetSession);
  targetSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    // Only patch X.com / Twitter CSP
    let trustedXResponse = false;
    try {
      const parsed = new URL(details.url);
      trustedXResponse =
        parsed.protocol === "https:" &&
        (parsed.hostname === "x.com" || parsed.hostname === "twitter.com");
    } catch {
      trustedXResponse = false;
    }
    if (!trustedXResponse) {
      callback({ responseHeaders });
      return;
    }

    const cspKey = Object.keys(responseHeaders).find(
      (k) => k.toLowerCase() === "content-security-policy"
    );

    if (cspKey) {
      const existing = responseHeaders[cspKey];
      if (Array.isArray(existing)) {
        responseHeaders[cspKey] = existing.map((directive) => patchBetterXCSP(directive));
      } else if (typeof existing === "string") {
        // Electron currently types response header values as arrays, but keep
        // this compatible with Chromium versions that surface a single value.
        responseHeaders[cspKey] = [patchBetterXCSP(existing)];
      }
    }

    callback({ responseHeaders });
  });
}
