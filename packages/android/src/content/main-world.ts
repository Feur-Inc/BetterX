// ─── BetterX Main-World Shim ──────────────────────────────────────────────────
// Runs in the PAGE's JavaScript context (world: "MAIN") at document_start.
// This gives us two things the isolated content script cannot do:
//   1. Patch window.fetch / JSON.parse to modify Twitter's responses before
//      React ever processes them (strips NSFW gates, etc.)
//   2. Access React fiber internals attached to DOM elements, so we can
//      dispatch state updates that make Twitter's own components re-render.
//
// Communication with the isolated world uses CustomEvents on `document`:
//   Isolated → Main:   betterx:call    { id, action, args }
//   Main → Isolated:   betterx:result:${id}   { ...result }

// ─── Plugin flags ─────────────────────────────────────────────────────────────
// Gated on localStorage so they're readable synchronously at document_start,
// before any of Twitter's scripts run.

/** Whether the SensitiveMedia plugin is currently enabled. */
const sensitiveMediaEnabled = localStorage.getItem("betterx:sensitiveMedia") === "1";
/** When true, apply our own CSS blur instead of fully revealing media. */
const sensitiveMediaBlur = localStorage.getItem("betterx:sensitiveMedia:blur") === "1";

/** Tweet rest_ids that had sensitive flags - used in blur mode to mark articles. */
const sensitiveIds = new Set<string>();

// ─── Sensitive-media stripping ────────────────────────────────────────────────

/** Recursively strip fields that cause Twitter to gate media behind age checks. */
function stripSensitiveFlags(obj: unknown): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(stripSensitiveFlags);
    return;
  }
  const o = obj as Record<string, unknown>;

  // In blur mode, record tweet IDs that were sensitive before stripping.
  if (sensitiveMediaBlur) {
    if (o.__typename === "TweetWithVisibilityResults" && o.tweet && typeof o.tweet === "object") {
      const inner = o.tweet as Record<string, unknown>;
      if (typeof inner.rest_id === "string") sensitiveIds.add(inner.rest_id);
    }
    // possibly_sensitive lives in the `legacy` sub-object, rest_id is at tweet root
    if (
      typeof o.rest_id === "string" &&
      o.legacy &&
      typeof o.legacy === "object" &&
      (o.legacy as Record<string, unknown>).possibly_sensitive === true
    ) {
      sensitiveIds.add(o.rest_id);
    }
  }

  // Unwrap TweetWithVisibilityResults → Tweet so React never sees the
  // visibility wrapper type and skips the interstitial render path entirely.
  if (
    o.__typename === "TweetWithVisibilityResults" &&
    o.mediaVisibilityResults &&
    o.tweet &&
    typeof o.tweet === "object"
  ) {
    const inner = o.tweet as Record<string, unknown>;
    for (const [k, v] of Object.entries(inner)) o[k] = v;
    o.__typename = "Tweet";
    delete o.tweet;
    delete o.mediaVisibilityResults;
    delete o.limitedActionResults;
  }

  if ("possibly_sensitive" in o) o.possibly_sensitive = false;
  if ("possibly_sensitive_editable" in o) o.possibly_sensitive_editable = false;
  if ("sensitive_media_warning" in o) delete o.sensitive_media_warning;
  if ("mediaVisibilityResults" in o) delete o.mediaVisibilityResults;
  if ("interstitial" in o) delete o.interstitial;
  if ("age_restriction" in o) delete o.age_restriction;
  for (const v of Object.values(o)) stripSensitiveFlags(v);
}

// ─── Blur-mode: mark sensitive articles in the DOM ──────────────────────────
// After React renders, find articles whose tweet ID is in our sensitiveIds set
// and stamp them with [data-betterx-sensitive] so CSS can blur the media.

if (sensitiveMediaEnabled && sensitiveMediaBlur) {
  const markArticles = () => {
    for (const article of document.querySelectorAll(
      "article:not([data-betterx-sensitive-checked])"
    )) {
      article.setAttribute("data-betterx-sensitive-checked", "1");
      const link = article.querySelector('a[href*="/status/"] time')?.closest("a");
      const match = link?.getAttribute("href")?.match(/\/status\/(\d+)/);
      const restId = match?.[1];
      if (restId && sensitiveIds.has(restId)) {
        article.setAttribute("data-betterx-sensitive", "1");
      }
    }
  };
  new MutationObserver(markArticles).observe(document, {
    childList: true,
    subtree: true,
  });
}

// ─── JSON.parse patch ─────────────────────────────────────────────────────────
// Twitter embeds tweet data directly in the SSR HTML - window.fetch is never
// called for it. Patching JSON.parse catches both inline script data and any
// manually-parsed fetch/XHR responses regardless of how the data arrives.

const _JSONparse = JSON.parse.bind(JSON);
(JSON as { parse: typeof JSON.parse }).parse = (
  text: string,
  reviver?: Parameters<typeof JSON.parse>[1]
): unknown => {
  const result: unknown = _JSONparse(text, reviver);
  if (
    sensitiveMediaEnabled &&
    typeof text === "string" &&
    (text.includes("TweetWithVisibilityResults") ||
      text.includes("mediaVisibilityResults") ||
      text.includes("possibly_sensitive"))
  ) {
    stripSensitiveFlags(result);
  }
  return result;
};

// ─── Fetch patch (belt-and-suspenders for SPA navigations) ────────────────────
// Covers cases where Twitter fetches fresh data via GraphQL after initial load.

const TWITTER_API = /^https?:\/\/(api\.)?(twitter|x)\.com\//;
const GRAPHQL_PATH = "/i/api/graphql/";

const _fetch = window.fetch.bind(window);
(window as typeof window & { fetch: typeof fetch }).fetch = (async (input, init) => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;

  const res = await _fetch(input, init);

  if (!sensitiveMediaEnabled || !TWITTER_API.test(url) || !url.includes(GRAPHQL_PATH)) return res;

  const clone = res.clone();
  try {
    const text = await clone.text();
    if (
      !text.includes("possibly_sensitive") &&
      !text.includes("sensitive_media_warning") &&
      !text.includes("mediaVisibilityResults") &&
      !text.includes("interstitial") &&
      !text.includes("age_restriction")
    )
      return res;

    // JSON.parse is already patched above so stripSensitiveFlags runs
    // automatically - but we still return a clean response so the body
    // isn't consumed twice.
    const data: unknown = JSON.parse(text);
    const headers = new Headers(res.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    return new Response(JSON.stringify(data), {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch {
    return res;
  }
}) as typeof fetch;

// ─── React fiber utilities ────────────────────────────────────────────────────

type Fiber = {
  return?: Fiber;
  memoizedState?: HookNode;
};
type HookNode = {
  memoizedState: unknown;
  queue?: { dispatch?: (v: unknown) => void };
  next?: HookNode;
};

function getFiber(el: Element): Fiber | null {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  return key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null;
}

/**
 * Walk the fiber tree upward from `startNode`, trying to dispatch a state
 * update for any boolean hook whose current value equals `from`.
 */
function walkAndDispatch(
  startNode: Fiber | null | undefined,
  from: boolean,
  to: boolean,
  maxHops: number
): boolean {
  let node: Fiber | null | undefined = startNode;
  let hops = 0;
  while (node && hops < maxHops) {
    let hook = node.memoizedState;
    while (hook) {
      if (hook.memoizedState === from && typeof hook.queue?.dispatch === "function") {
        hook.queue.dispatch(to);
        return true;
      }
      hook = hook.next;
    }
    node = node.return ?? null;
    hops++;
  }
  return false;
}

/**
 * Find a boolean useState hook near the element (or the closest article) and
 * dispatch the opposite value.
 */
function dispatchReactState(el: Element, from: unknown, to: unknown): boolean {
  const btnFiber = getFiber(el)?.return ?? null;
  const article = el.closest("article");
  const articleFiber = article ? (getFiber(article)?.return ?? null) : null;

  if (walkAndDispatch(btnFiber, from as boolean, to as boolean, 30)) return true;
  if (walkAndDispatch(articleFiber, from as boolean, to as boolean, 30)) return true;

  const fromInv = !from as boolean;
  const toInv = !to as boolean;
  if (walkAndDispatch(btnFiber, fromInv, toInv, 30)) return true;
  if (walkAndDispatch(articleFiber, fromInv, toInv, 30)) return true;

  return false;
}

// ─── CustomEvent bridge ───────────────────────────────────────────────────────

type CallDetail = { id: string; action: string; args: unknown[] };

document.addEventListener("betterx:call", (raw) => {
  const { id, action, args } = (raw as CustomEvent<CallDetail>).detail;
  let result: unknown = null;

  if (action === "dispatchReactState") {
    const selector = args[0] as string;
    const el = document.querySelector(selector);
    if (el) result = dispatchReactState(el, args[1], args[2]);
  }

  if (action === "softNavigate") {
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state, bubbles: false }));
    result = true;
  }

  document.dispatchEvent(new CustomEvent(`betterx:result:${id}`, { detail: result }));
});

export {};
