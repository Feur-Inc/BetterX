import { Devs, definePlugin } from "@betterx/core";

// ─── DOMObserver API ──────────────────────────────────────────────────────────
// A single shared MutationObserver that all DOM-watching plugins can subscribe
// to instead of creating individual observers. Reduces overhead on X.com's
// heavily-mutating DOM.

type ObserverCallback = (mutations: MutationRecord[]) => void;

const subscribers = new Set<ObserverCallback>();
let sharedObs: MutationObserver | null = null;

export const DOMObserver = {
  /**
   * Subscribe to DOM mutations (childList + subtree on document.body).
   * Returns an unsubscribe function — call it in your plugin's `stop()`.
   *
   * @example
   * let unsub: (() => void) | null = null;
   *
   * start() { unsub = DOMObserver.subscribe((mutations) => { ... }); },
   * stop()  { unsub?.(); unsub = null; },
   */
  subscribe(fn: ObserverCallback): () => void {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },

  /** Whether the shared observer is currently running. */
  get active(): boolean {
    return sharedObs !== null;
  },
};

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
  name: "SharedObserver",
  description:
    "Provides a shared MutationObserver for DOM-watching plugins, reducing overhead on X's heavily-mutating DOM.",
  authors: [Devs.Mopi],
  isLibrary: true,

  start() {
    sharedObs = new MutationObserver((mutations) => {
      for (const fn of subscribers) {
        try {
          fn(mutations);
        } catch {
          /* don't let one bad subscriber break others */
        }
      }
    });
    sharedObs.observe(document.body, { childList: true, subtree: true });
  },

  stop() {
    sharedObs?.disconnect();
    sharedObs = null;
    subscribers.clear();
  },
});
