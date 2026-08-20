// ─── Extension Service Worker ─────────────────────────────────────────────────

import browser from "webextension-polyfill";

// ─── OAuth Tab Management ─────────────────────────────────────────────────────
// When the user clicks "Login with Twitter" we open a new tab for the OAuth
// flow and watch for it to land back on the cloud server root (post-auth
// redirect).  Once detected we close the tab and notify the originating
// content-script tab so it can refresh its connection status.

let pendingOAuth: { tabId: number; serverOrigin: string; contentTabId: number } | null = null;
const ALLOWED_PROXY_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const MAX_PROXY_BODY_BYTES = 2_000_000;
const MAX_PROXY_RESPONSE_BYTES = 10_000_000;

function parseProxyUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  const loopback =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("Only HTTPS proxy URLs are allowed outside loopback");
  }
  if (url.username || url.password) throw new Error("Proxy URL credentials are not allowed");
  return url;
}

async function readLimitedText(response: Response): Promise<string> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_PROXY_RESPONSE_BYTES) throw new Error("Proxy response is too large");
  const text = await response.text();
  if (text.length > MAX_PROXY_RESPONSE_BYTES) throw new Error("Proxy response is too large");
  return text;
}

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!pendingOAuth || tabId !== pendingOAuth.tabId || !changeInfo.url) return;
  try {
    const parsed = new URL(changeInfo.url);
    // Done when the tab lands on the server root (not /auth/*)
    if (parsed.origin === pendingOAuth.serverOrigin && !parsed.pathname.startsWith("/auth")) {
      const { contentTabId, tabId: oauthTabId } = pendingOAuth;
      pendingOAuth = null;
      browser.tabs.remove(oauthTabId).catch(() => {});
      browser.tabs.sendMessage(contentTabId, { type: "OAUTH_COMPLETE" }).catch(() => {});
    }
  } catch {
    /* ignore parse errors */
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  if (!pendingOAuth || tabId !== pendingOAuth.tabId) return;
  const { contentTabId } = pendingOAuth;
  pendingOAuth = null;
  // User closed the tab manually — still refresh status
  browser.tabs.sendMessage(contentTabId, { type: "OAUTH_COMPLETE" }).catch(() => {});
});

// Listen for install/update
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[BetterX] Extension installed");
  } else if (details.reason === "update") {
    console.log("[BetterX] Extension updated to", browser.runtime.getManifest().version);
  }
});

// Keep service worker alive during development
// (Production: onMessage handlers keep it alive)
browser.runtime.onMessage.addListener((message, sender) => {
  const msg = message as { type?: string; url?: string };

  if (msg.type === "OPEN_OAUTH" && msg.url) {
    const contentTabId = sender.tab?.id;
    let serverOrigin: string;
    try {
      const oauthUrl = parseProxyUrl(msg.url);
      if (oauthUrl.pathname !== "/auth/twitter" || oauthUrl.search || oauthUrl.hash) {
        throw new Error("Invalid OAuth URL");
      }
      serverOrigin = oauthUrl.origin;
    } catch {
      return Promise.reject(new Error("Invalid OAuth URL"));
    }
    return browser.tabs.create({ url: msg.url }).then((tab) => {
      if (tab.id != null && contentTabId != null) {
        pendingOAuth = { tabId: tab.id, serverOrigin, contentTabId };
      }
      return { started: true };
    });
  }

  if (msg.type === "BETTERX_PING") {
    return Promise.resolve({ type: "BETTERX_PONG" });
  }

  if (msg.type === "PROXY_IMAGE" && msg.url) {
    return fetch(parseProxyUrl(msg.url), { signal: AbortSignal.timeout(20_000) })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Image request failed (${res.status})`);
        const declaredSize = Number(res.headers.get("content-length") ?? 0);
        if (declaredSize > MAX_PROXY_RESPONSE_BYTES) throw new Error("Image is too large");
        const blob = await res.blob();
        if (blob.size > MAX_PROXY_RESPONSE_BYTES) throw new Error("Image is too large");
        return blob;
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      )
      .then((dataUrl) => ({ dataUrl }))
      .catch(() => ({ dataUrl: null }));
  }

  if (msg.type === "PROXY_FETCH" && msg.url) {
    const { url, method, headers, body, credentials } = msg as {
      type: string;
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      credentials?: string;
    };
    const normalizedMethod = (method ?? (body === undefined ? "GET" : "POST")).toUpperCase();
    if (!ALLOWED_PROXY_METHODS.has(normalizedMethod)) {
      return Promise.resolve({
        ok: false,
        status: 0,
        text: "Unsupported proxy method",
        json: null,
      });
    }
    if (body && body.length > MAX_PROXY_BODY_BYTES) {
      return Promise.resolve({
        ok: false,
        status: 0,
        text: "Proxy request is too large",
        json: null,
      });
    }
    const safeHeaders = Object.fromEntries(
      Object.entries(headers ?? {}).filter(
        ([key]) => !["cookie", "host", "origin", "referer"].includes(key.toLowerCase())
      )
    );
    const init: RequestInit = {
      credentials: credentials === "include" ? "include" : "omit",
      method: normalizedMethod,
      headers: safeHeaders,
      signal: AbortSignal.timeout(20_000),
    };
    if (body !== undefined) init.body = body;
    return fetch(parseProxyUrl(url), init)
      .then(async (res) => {
        const text = await readLimitedText(res);
        let json: unknown = null;
        try {
          json = JSON.parse(text);
        } catch {
          /* not JSON */
        }
        return { ok: res.ok, status: res.status, text, json };
      })
      .catch((err) => ({ ok: false, status: 0, text: String(err), json: null }));
  }

  return undefined;
});
