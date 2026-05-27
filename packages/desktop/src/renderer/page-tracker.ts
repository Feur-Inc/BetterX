// ─── Page Tracker ────────────────────────────────────────────────────────────
// Watches URL and DOM changes to update Discord Rich Presence via IPC.

let lastDetails = "";
let lastState = "";

// ─── User Stats ──────────────────────────────────────────────────────────────
// Intercepted from Twitter's own GraphQL responses - no extra API calls needed.

interface UserStats {
  followers: number;
  following: number;
}

let cachedStats: UserStats | null = null;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Get the logged-in user's numeric ID from the twid cookie. */
function getLoggedInUserId(): string | null {
  const twid = document.cookie.split("; ").find((c) => c.startsWith("twid="));
  return twid ? decodeURIComponent(twid.split("=")[1]!).replace("u=", "") : null;
}

/** Search a response for the logged-in user's stats, matched by user ID. */
function findUserStats(data: unknown, userId: string, depth = 0): UserStats | null {
  if (depth > 15 || !data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const f = findUserStats(item, userId, depth + 1);
      if (f) return f;
    }
    return null;
  }
  const obj = data as Record<string, unknown>;
  // GraphQL: { rest_id: "123", legacy: { followers_count, friends_count } }
  if (obj.rest_id === userId && obj.legacy && typeof obj.legacy === "object") {
    const leg = obj.legacy as Record<string, unknown>;
    if (typeof leg.followers_count === "number" && typeof leg.friends_count === "number") {
      return { followers: leg.followers_count, following: leg.friends_count };
    }
  }
  // REST: { id_str: "123", followers_count, friends_count }
  if (obj.id_str === userId &&
      typeof obj.followers_count === "number" && typeof obj.friends_count === "number") {
    return { followers: obj.followers_count as number, following: obj.friends_count as number };
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") {
      const found = findUserStats(val, userId, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Proactively fetch the logged-in user's stats via Twitter's stable REST
 * endpoint. Runs once at startup so we have stats immediately rather than
 * waiting for a GraphQL response to pass through our hook.
 */
async function fetchUserStats(): Promise<void> {
  // Primary: check if the preload's early fetch hook already caught the stats
  // (it runs at document_start, before Twitter's Viewer GraphQL call fires).
  const w = window as unknown as { __betterxUserStats?: UserStats };
  if (w.__betterxUserStats) {
    cachedStats = w.__betterxUserStats;
    lastState = "";
    sendUpdate();
  }
}

/**
 * Patch XMLHttpRequest (Twitter's GraphQL calls use XHR, not fetch) to sniff
 * responses for follower/following counts. Runs in the renderer as a fallback
 * for navigations that happen after the initial page load.
 */
function hookXHRForStats(): void {
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest & { __bxUrl?: string },
    method: string,
    url: string | URL,
  ) {
    this.__bxUrl = typeof url === "string" ? url : url.toString();
    return _origOpen.apply(this, arguments as unknown as Parameters<typeof _origOpen>);
  };

  const userId = getLoggedInUserId();

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest & { __bxUrl?: string },
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const url = this.__bxUrl ?? "";
    if (!cachedStats && userId &&
        (url.includes("/i/api/graphql/") || url.includes("/account/multi/list.json"))) {
      this.addEventListener("load", function (this: XMLHttpRequest) {
        if (cachedStats) return;
        try {
          const data = JSON.parse(this.responseText) as unknown;
          const stats = findUserStats(data, userId);
          if (stats) {
            cachedStats = stats;
            lastState = "";
            sendUpdate();
          }
        } catch { /* ignore */ }
      });
    }
    return _origSend.apply(this, arguments as unknown as Parameters<typeof _origSend>);
  };
}

// ─── Activity Resolution ─────────────────────────────────────────────────────

function resolveActivity(): { details: string; state: string } {
  const path = window.location.pathname;
  const search = window.location.search;

  const statsStr = cachedStats
    ? `${formatCount(cachedStats.followers)} followers | ${formatCount(cachedStats.following)} following`
    : "";

  // Home / timeline
  if (path === "/home") {
    return { details: "Home timeline", state: statsStr };
  }

  // Explore
  if (path === "/explore" || path.startsWith("/explore/")) {
    return { details: "Exploring", state: statsStr };
  }

  // Search
  if (path === "/search" || path.startsWith("/search")) {
    const params = new URLSearchParams(search);
    const q = params.get("q");
    return { details: q ? `Searching "${q}"` : "Searching X", state: statsStr };
  }

  // Notifications
  if (path === "/notifications" || path.startsWith("/notifications/")) {
    return { details: "Notifications", state: statsStr };
  }

  // Messages
  if (path === "/messages" || path.startsWith("/messages/")) {
    return { details: "Messages", state: statsStr };
  }

  // Bookmarks
  if (path === "/i/bookmarks") {
    return { details: "Bookmarks", state: statsStr };
  }

  // Lists
  if (path === "/i/lists" || path.startsWith("/i/lists/")) {
    return { details: "Lists", state: statsStr };
  }

  // Settings
  if (path.startsWith("/settings")) {
    return { details: "Settings", state: statsStr };
  }

  // Profile + subpages (/username, /username/followers, etc.)
  const profileMatch = path.match(/^\/([A-Za-z0-9_]{1,15})(\/.*)?$/);
  if (profileMatch) {
    const username = profileMatch[1];
    const sub = profileMatch[2];

    // Post / status page
    if (sub?.startsWith("/status/")) {
      return { details: `Viewing a post by @${username}`, state: statsStr };
    }

    // Profile sub-tabs
    if (sub === "/followers" || sub === "/following" || sub === "/likes" || sub === "/media") {
      const label = sub.slice(1).charAt(0).toUpperCase() + sub.slice(2);
      return { details: `@${username} · ${label}`, state: statsStr };
    }

    // Plain profile
    if (!sub || sub === "/") {
      return { details: `Viewing @${username}`, state: statsStr };
    }
  }

  return { details: "Browsing X", state: statsStr };
}

function sendUpdate(): void {
  const { details, state } = resolveActivity();
  if (details === lastDetails && state === lastState) return;
  lastDetails = details;
  lastState = state;
  window.electronAPI?.discordRPC?.updateActivity(details, state);
}

export function startPageTracker(): void {
  if (!window.electronAPI?.discordRPC) return;

  hookXHRForStats();

  // Listen for stats from the preload's early-stage fetch hook.
  // Fired as soon as Twitter's first GraphQL response with user data arrives.
  window.addEventListener(
    "betterx:user-stats",
    (e) => {
      const stats = (e as CustomEvent<UserStats>).detail;
      console.log("[BetterX RPC] betterx:user-stats event received:", stats);
      if (stats && !cachedStats) {
        cachedStats = stats;
        lastState = "";
        sendUpdate();
      }
    },
    { once: true },
  );

  void fetchUserStats();

  // Initial update
  sendUpdate();

  // Poll URL changes (pushState doesn't fire events)
  setInterval(sendUpdate, 2000);

  // Observe DOM mutations (page content swaps) with debounce
  let debounce: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(sendUpdate, 2000);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
