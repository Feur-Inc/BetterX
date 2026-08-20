import { contextBridge, ipcRenderer, webFrame } from "electron";
import type { ElectronAPI } from "./api.js";

const settingCache = new Map<string, unknown>();
const settingRequests = new Map<string, Promise<unknown>>();
const themeCache = new Map<string, string>();
const themeRequests = new Map<string, Promise<string>>();

function getSettingCached(key: string): Promise<unknown> {
  if (settingCache.has(key)) return Promise.resolve(settingCache.get(key));
  const pending = settingRequests.get(key);
  if (pending) return pending;
  const request = ipcRenderer
    .invoke("settings:get", key)
    .then((value: unknown) => {
      settingCache.set(key, value);
      return value;
    })
    .finally(() => settingRequests.delete(key));
  settingRequests.set(key, request);
  return request;
}

function readThemeCached(id: string): Promise<string> {
  if (themeCache.has(id)) return Promise.resolve(themeCache.get(id) ?? "");
  const pending = themeRequests.get(id);
  if (pending) return pending;
  const request = ipcRenderer
    .invoke("themes:read", id)
    .then((css: string) => {
      themeCache.set(id, css);
      return css;
    })
    .finally(() => themeRequests.delete(id));
  themeRequests.set(id, request);
  return request;
}

// ─── Sensitive-media patch injection ─────────────────────────────────────────
// contextIsolation:true means we can't patch window.JSON.parse directly.
// Injecting an inline <script> into document bypasses that - scripts appended
// to the DOM execute in the page's main world context, not the preload context.
// This mirrors the extension's main-world.ts but for Electron.

// Mirrors the logic in extension/src/content/main-world.ts but runs as an
// injected inline script since the preload context is isolated from the page.
const SENSITIVE_MEDIA_PATCH = `(function () {
  var enabled = localStorage.getItem('betterx:sensitiveMedia') === '1';
  if (!enabled) return;

  var blurMode = localStorage.getItem('betterx:sensitiveMedia:blur') === '1';

  // In blur mode: track which tweet IDs were sensitive so we can stamp
  // articles with [data-betterx-sensitive] for CSS to blur.
  var sensitiveIds = new Set();

  function strip(o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(strip); return; }

    // Collect sensitive IDs before stripping (blur mode only).
    if (blurMode) {
      if (o.__typename === 'TweetWithVisibilityResults' && o.tweet && typeof o.tweet === 'object') {
        if (typeof o.tweet.rest_id === 'string') sensitiveIds.add(o.tweet.rest_id);
      }
      // possibly_sensitive lives in legacy sub-object; rest_id is at tweet root.
      if (typeof o.rest_id === 'string' && o.legacy && typeof o.legacy === 'object' && o.legacy.possibly_sensitive === true) {
        sensitiveIds.add(o.rest_id);
      }
    }

    // Unwrap TweetWithVisibilityResults → Tweet.
    if (o.__typename === 'TweetWithVisibilityResults' && o.mediaVisibilityResults && o.tweet && typeof o.tweet === 'object') {
      var inner = o.tweet;
      Object.keys(inner).forEach(function (k) { o[k] = inner[k]; });
      o.__typename = 'Tweet';
      delete o.tweet; delete o.mediaVisibilityResults; delete o.limitedActionResults;
    }

    if ('possibly_sensitive'          in o) o.possibly_sensitive          = false;
    if ('possibly_sensitive_editable' in o) o.possibly_sensitive_editable = false;
    if ('sensitive_media_warning'     in o) delete o.sensitive_media_warning;
    if ('mediaVisibilityResults'      in o) delete o.mediaVisibilityResults;
    if ('interstitial'                in o) delete o.interstitial;
    if ('age_restriction'             in o) delete o.age_restriction;

    Object.values(o).forEach(strip);
  }

  // Patch JSON.parse (catches SSR-embedded data and manually-parsed responses).
  var _parse = JSON.parse.bind(JSON);
  JSON.parse = function (text, reviver) {
    var result = _parse(text, reviver);
    if (typeof text === 'string' &&
        (text.indexOf('TweetWithVisibilityResults') !== -1 ||
         text.indexOf('mediaVisibilityResults')     !== -1 ||
         text.indexOf('possibly_sensitive')         !== -1)) {
      strip(result);
    }
    return result;
  };

  // Patch fetch (covers GraphQL calls during SPA navigation).
  var _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    return _fetch(input, init).then(function (res) {
      if (url.indexOf('/i/api/graphql/') === -1) return res;
      var clone = res.clone();
      return clone.text().then(function (text) {
        if (text.indexOf('possibly_sensitive')   === -1 &&
            text.indexOf('mediaVisibilityResults') === -1 &&
            text.indexOf('interstitial')           === -1 &&
            text.indexOf('age_restriction')        === -1) return res;
        try {
          var data = JSON.parse(text);
          var headers = new Headers(res.headers);
          headers.delete('content-encoding'); headers.delete('content-length');
          return new Response(JSON.stringify(data), { status: res.status, statusText: res.statusText, headers: headers });
        } catch (e) { return res; }
      }).catch(function () { return res; });
    });
  };

  // Blur mode: watch for articles and stamp sensitive ones.
  if (blurMode) {
    new MutationObserver(function () {
      document.querySelectorAll('article:not([data-betterx-sensitive-checked])').forEach(function (article) {
        article.setAttribute('data-betterx-sensitive-checked', '1');
        var timeLink = article.querySelector('a[href*="/status/"] time');
        var link = timeLink ? timeLink.closest('a') : null;
        var href = link ? link.getAttribute('href') : null;
        var match = href ? href.match(/\\/status\\/(\\d+)/) : null;
        if (match && sensitiveIds.has(match[1])) article.setAttribute('data-betterx-sensitive', '1');
      });
    }).observe(document, { childList: true, subtree: true });
  }
})();`;

function injectSensitiveMediaPatch(): void {
  void webFrame.executeJavaScript(SENSITIVE_MEDIA_PATCH).catch(() => undefined);
}

injectSensitiveMediaPatch();

// ─── Stats Patch ─────────────────────────────────────────────────────────────
// Injected at document_start so we intercept Twitter's first Viewer GraphQL
// call (which fires before the renderer runs). Stores follower/following counts
// in window.__betterxUserStats so the renderer can read them immediately.

const STATS_PATCH = `(function () {
  if (window.__betterxStatsPatchInstalled) {
    window.__betterxStatsEnabled = true;
    return;
  }
  window.__betterxStatsPatchInstalled = true;
  window.__betterxStatsEnabled = true;
  // Get the logged-in user's numeric ID from the twid cookie (format: u%3D{id}).
  var twid = document.cookie.split('; ').find(function(c) { return c.startsWith('twid='); });
  var userId = twid ? decodeURIComponent(twid.split('=')[1]).replace('u=', '') : null;
  if (!userId) return;

  function bxEmit(stats) {
    window.__betterxUserStats = stats;
    window.dispatchEvent(new CustomEvent('betterx:user-stats', { detail: stats }));
  }

  // Recursively search a parsed response for the logged-in user's follower stats.
  // GraphQL format: { rest_id: "123", legacy: { followers_count, friends_count } }
  // REST format:    { id_str: "123", followers_count, friends_count }
  function bxFind(data, depth) {
    if (depth > 15 || !data || typeof data !== 'object') return null;
    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        var f = bxFind(data[i], depth + 1);
        if (f) return f;
      }
      return null;
    }
    if (data.rest_id === userId && data.legacy &&
        typeof data.legacy.followers_count === 'number' &&
        typeof data.legacy.friends_count === 'number') {
      return { followers: data.legacy.followers_count, following: data.legacy.friends_count };
    }
    if (data.id_str === userId &&
        typeof data.followers_count === 'number' &&
        typeof data.friends_count === 'number') {
      return { followers: data.followers_count, following: data.friends_count };
    }
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      if (data[keys[i]] && typeof data[keys[i]] === 'object') {
        var f = bxFind(data[keys[i]], depth + 1);
        if (f) return f;
      }
    }
    return null;
  }

  var _origOpen = XMLHttpRequest.prototype.open;
  var _origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__bxUrl = typeof url === 'string' ? url : '';
    return _origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!window.__betterxStatsEnabled) return _origSend.apply(this, arguments);
    if (window.__betterxUserStats) return _origSend.apply(this, arguments);
    var url = this.__bxUrl || '';
    if (url.indexOf('/i/api/graphql/') !== -1 ||
        url.indexOf('/account/multi/list.json') !== -1 ||
        url.indexOf('/users/show.json') !== -1) {
      this.addEventListener('load', function () {
        if (window.__betterxUserStats) return;
        try {
          var stats = bxFind(JSON.parse(this.responseText), 0);
          if (stats) bxEmit(stats);
        } catch(e) {}
      });
    }
    return _origSend.apply(this, arguments);
  };

})();`;

let cachedUserStats: { followers: number; following: number } | null = null;
window.addEventListener("betterx:user-stats", (event) => {
  const detail = (event as CustomEvent<{ followers: number; following: number }>).detail;
  if (detail) cachedUserStats = detail;
});

function injectStatsPatch(): void {
  void webFrame.executeJavaScript(STATS_PATCH).catch(() => undefined);
}

function setStatsEnabled(enabled: boolean): void {
  if (enabled) {
    injectStatsPatch();
  } else {
    void webFrame.executeJavaScript("window.__betterxStatsEnabled = false").catch(() => undefined);
  }
}

const initialDiscordRPCEnabled =
  ipcRenderer.sendSync("settings:get-sync", "enableDiscordRPC") === true;
if (initialDiscordRPCEnabled) injectStatsPatch();

// ─── Preload ──────────────────────────────────────────────────────────────────
// Exposes ONLY typed ipcRenderer calls via contextBridge.
// No raw ipcRenderer access. No modifyCSP. No disable-web-security.

const api: ElectronAPI = {
  themes: {
    list: () => ipcRenderer.invoke("themes:list"),
    read: (id) => readThemeCached(id),
    write: async (id, css) => {
      await ipcRenderer.invoke("themes:write", id, css);
      themeCache.set(id, css);
    },
    delete: async (id) => {
      await ipcRenderer.invoke("themes:delete", id);
      themeCache.delete(id);
    },
    onChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, css: string): void => {
        themeCache.set(id, css);
        callback(id, css);
      };
      ipcRenderer.on("themes:changed", handler);
      return () => ipcRenderer.removeListener("themes:changed", handler);
    },
    openFolder: () => ipcRenderer.invoke("themes:openFolder"),
  },

  settings: {
    getAll: async () => {
      const settings = (await ipcRenderer.invoke("settings:get-all")) as Record<string, unknown>;
      for (const [key, value] of Object.entries(settings)) settingCache.set(key, value);
      return settings;
    },
    get: (key) => getSettingCached(key),
    set: async (key, value) => {
      await ipcRenderer.invoke("settings:set", key, value);
      settingCache.set(key, value);
    },
    chooseBundlePath: async () => {
      const path = (await ipcRenderer.invoke("settings:choose-bundle-path")) as string | null;
      if (path) settingCache.set("bundlePath", path);
      return path;
    },
    onChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, key: string, value: unknown): void => {
        settingCache.set(key, value);
        callback(key, value);
      };
      ipcRenderer.on("settings:changed", handler);
      return () => ipcRenderer.removeListener("settings:changed", handler);
    },
  },

  loadRendererModule: (name) => ipcRenderer.invoke("bx:renderer-module:load", name),
  onNavigation: (callback) => {
    const handler = (): void => callback();
    ipcRenderer.on("bx:navigation", handler);
    return () => ipcRenderer.removeListener("bx:navigation", handler);
  },

  captureElement: (rect) => ipcRenderer.invoke("capture:element", rect),

  getVersion: () => ipcRenderer.sendSync("app:get-version") as string,

  restart: () => ipcRenderer.send("app:restart"),

  openOAuth: (url) => ipcRenderer.invoke("bx:oauth:open", url),
  onOAuthComplete: (callback) => {
    const handler = (): void => callback();
    ipcRenderer.on("bx:oauth:complete", handler);
    return () => ipcRenderer.removeListener("bx:oauth:complete", handler);
  },

  cloudFetch: (serverUrl, path, options) =>
    ipcRenderer.invoke("bx:cloud:fetch", serverUrl, path, options),
  proxyFetch: (url, options) => ipcRenderer.invoke("bx:proxy:fetch", url, options),

  discordRPC: {
    updateActivity: (details, state) =>
      ipcRenderer.send("discord-rpc:update-activity", details, state),
    setStatsEnabled,
    getCachedStats: () => cachedUserStats,
  },
};

// Keep privileged APIs out of X's main world. The BetterX renderer bundle runs
// in this same isolated world (see main/window.ts).
contextBridge.exposeInIsolatedWorld(1000, "electronAPI", api);

// ─── Early Injection ─────────────────────────────────────────────────────────
// Runs at document_start (preload timing) to:
// 1. Inject active theme CSS before the page paints (no FOUC)
// 2. Replace the X loading screen logo before it's visible

// Preserve authored CSS; see core/theme/processor.ts.
function processCSS(css: string): string {
  return css;
}

// ─── Theme Injection ────────────────────────────────────────────────────────
const STYLE_PREFIX = "betterx-theme-";

function prioritizeThemeRules(rules: CSSRuleList): void {
  for (const rule of rules) {
    if (rule.type === 1) {
      const declaration = (rule as CSSStyleRule).style;
      for (const property of declaration) {
        if (declaration.getPropertyPriority(property) !== "important") {
          declaration.setProperty(property, declaration.getPropertyValue(property), "important");
        }
      }
    }
    const nestedRules = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules;
    if (nestedRules) prioritizeThemeRules(nestedRules);
  }
}

getSettingCached("themeState")
  .then(async (val: unknown) => {
    const state = val as { order?: string[]; active?: string[] } | undefined;
    if (!state?.active?.length) return;

    const root = document.head || document.documentElement;
    const themes = await Promise.all(
      state.active.map(async (id): Promise<{ id: string; css: string } | null> => {
        try {
          const css = await readThemeCached(id);
          return css ? { id, css } : null;
        } catch {
          return null;
        }
      })
    );
    for (const theme of themes) {
      if (!theme) continue;
      const style = document.createElement("style");
      style.id = STYLE_PREFIX + theme.id;
      style.textContent = processCSS(theme.css);
      root.appendChild(style);
      try {
        if (style.sheet) prioritizeThemeRules(style.sheet.cssRules);
      } catch {
        // Keep the authored CSS if this Electron build cannot rewrite a rule.
      }
    }
  })
  .catch(() => {
    /* settings not available - skip early themes */
  });

// ─── Logo Replacement ───────────────────────────────────────────────────────
const EARLY_LOGOS: Record<string, { path: string; viewBox: string; scale?: string }> = {
  twitter: {
    path: "M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z",
    viewBox: "0 0 24 24",
  },
  bluesky: {
    path: "m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z",
    viewBox: "0 0 600 500",
    scale: "0.75",
  },
  betterx: {
    path: "M136.6551,95.4922l3.4292-1.7013c18.0529-8.4865,18.7141-38.0995,4.8879-50.394-9.7757-8.6925-27.7556-10.5765-40.3856-11.0118-19.4186-.6679-39.2259.5283-58.6811.0133v135.4084l65.772.0166c20.3324-.8706,42.994-6.4729,47.5031-29.4203,3.6053-18.3686-3.3627-37.621-22.5254-42.911ZM123.5365,45.5169c6.3399.9005,13.6767,3.9774,17.0826,9.6761,3.283,5.496,3.8179,14.7965,1.8674,20.7942-2.6716,8.2074-11.0916,11.2411-18.9501,12.4207v-42.891ZM73.2024,156.8182h-16.3051V43.3903h16.3051v113.4279ZM112.9035,156.466l-29.0681.3522v-55.6507l29.0681.3555v54.9429ZM112.9035,89.8234l-29.0681.3555v-46.7887l29.0681.3522v46.0809ZM123.5365,154.3394v-50.6897c15.1255,2.861,24.5058,10.0814,25.5126,22.4922,1.2029,14.8165-6.649,24.7285-25.5126,28.1975Z",
    viewBox: "0 0 200 200",
    scale: "1",
  },
};

getSettingCached("pluginStates")
  .then((val: unknown) => {
    const states = val as
      | Record<string, { enabled?: boolean; settings?: Record<string, unknown> }>
      | undefined;
    if (!states) return;

    const btb = states.BringTwitterBack;
    if (!btb?.enabled) return;

    const choice = (btb.settings?.logoChoice as string) ?? "twitter";
    const logo = EARLY_LOGOS[choice];
    if (!logo) return;

    const style = document.createElement("style");
    style.textContent = `#placeholder svg path { visibility: hidden; }${logo.scale ? `#placeholder svg { transform: scale(${logo.scale}); }` : ""}`;
    (document.head || document.documentElement).appendChild(style);

    function replaceLogo(selectedLogo: (typeof EARLY_LOGOS)[string]): boolean {
      const pathEl = document.querySelector<SVGPathElement>("#placeholder svg path");
      if (!pathEl) return false;

      const svg = pathEl.closest("svg");
      pathEl.setAttribute("d", selectedLogo.path);
      if (svg) svg.setAttribute("viewBox", selectedLogo.viewBox);

      style.textContent = selectedLogo.scale
        ? `#placeholder svg { transform: scale(${selectedLogo.scale}); }`
        : "";
      return true;
    }

    if (replaceLogo(logo)) return;

    const obs = new MutationObserver(() => {
      if (replaceLogo(logo)) obs.disconnect();
    });

    const waitForBody = setInterval(() => {
      if (!document.body) return;
      clearInterval(waitForBody);
      if (replaceLogo(logo)) return;
      obs.observe(document.body, { childList: true, subtree: true });
    }, 10);
  })
  .catch(() => {
    /* settings not available - skip early logo */
  });
