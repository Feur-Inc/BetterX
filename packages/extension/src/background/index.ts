// ─── Extension Service Worker ─────────────────────────────────────────────────

import browser from "webextension-polyfill";

// ─── OAuth Tab Management ─────────────────────────────────────────────────────
// When the user clicks "Login with Twitter" we open a new tab for the OAuth
// flow and watch for it to land back on the cloud server root (post-auth
// redirect).  Once detected we close the tab and notify the originating
// content-script tab so it can refresh its connection status.

let pendingOAuth: { tabId: number; serverOrigin: string; contentTabId: number } | null = null;

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
  } catch { /* ignore parse errors */ }
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
    try { serverOrigin = new URL(msg.url).origin; } catch { serverOrigin = ""; }
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
    return fetch(msg.url)
      .then((res) => res.blob())
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
    const { url, method, headers, body } = msg as {
      type: string; url: string;
      method?: string; headers?: Record<string, string>; body?: string;
    };
    const init: RequestInit = { credentials: "include" };
    if (method  !== undefined) init.method  = method;
    if (headers !== undefined) init.headers = headers;
    if (body    !== undefined) init.body    = body;
    return fetch(url, init)
      .then(async (res) => {
        const text = await res.text();
        let json: unknown = null;
        try { json = JSON.parse(text); } catch { /* not JSON */ }
        return { ok: res.ok, status: res.status, text, json };
      })
      .catch((err) => ({ ok: false, status: 0, text: String(err), json: null }));
  }

  return undefined;
});

export {};
