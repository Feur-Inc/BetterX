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
let cleanupTracking: (() => void) | null = null;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
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

  const setEnabled = (enabled: boolean): void => {
    cleanupTracking?.();
    cleanupTracking = null;
    window.electronAPI.discordRPC?.setStatsEnabled(enabled);
    if (!enabled) return;

    const initialStats = window.electronAPI.discordRPC?.getCachedStats();
    if (initialStats) cachedStats = initialStats;

    const onStats = (event: Event): void => {
      const stats = (event as CustomEvent<UserStats>).detail;
      if (stats) {
        cachedStats = stats;
        lastState = "";
        sendUpdate();
      }
    };
    window.addEventListener("betterx:user-stats", onStats);
    const unsubscribeNavigation = window.electronAPI.onNavigation(sendUpdate);
    cleanupTracking = () => {
      window.removeEventListener("betterx:user-stats", onStats);
      unsubscribeNavigation();
    };
    lastDetails = "";
    lastState = "";
    sendUpdate();
  };

  void window.electronAPI.settings
    .get("enableDiscordRPC")
    .then((enabled) => setEnabled(enabled === true));
  window.electronAPI.settings.onChanged((key, value) => {
    if (key === "enableDiscordRPC") setEnabled(value === true);
  });
}
