import { Devs, definePlugin } from "@betterx/core";
import { DOMObserver } from "../SharedObserver/index.js";

const AD_KEYWORDS = new Set([
  "Ad",
  "Sponsored",
  "Sponsorisé",
  "Gesponsert",
  "Promocionado",
  "Patrocinado",
]);

let adUnsub: (() => void) | null = null;
const processedPosts = new Map<HTMLElement, { display: string; marker: string | undefined }>();

function processPost(el: HTMLElement): void {
  if (el.dataset.adBlockerProcessed) return;
  processedPosts.set(el, {
    display: el.style.display,
    marker: el.dataset.adBlockerProcessed,
  });
  el.dataset.adBlockerProcessed = "true";
  if (isAd(el)) el.style.display = "none";
}

function isAd(el: HTMLElement): boolean {
  const hasPromoted = el.querySelector('[data-testid="placementTracking"]');
  const hasAdArticle = el.querySelector('article[aria-labelledby*="id__"]');
  if (hasPromoted && hasAdArticle) return true;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = (node as Text).textContent?.trim();
    if (text && AD_KEYWORDS.has(text)) return true;
    node = walker.nextNode();
  }
  return false;
}

export default definePlugin({
  name: "AdBlocker",
  description: "Hides sponsored posts and ads from your feed",
  authors: [Devs.Ayaz, Devs.Mopi, Devs.TPM28],
  dependencies: ["SharedObserver"],

  start() {
    document.querySelectorAll<HTMLElement>('[data-testid="cellInnerDiv"]').forEach(processPost);

    adUnsub = DOMObserver.subscribe((mutations) => {
      const posts = new Set<HTMLElement>();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as HTMLElement;
          if (el.matches('[data-testid="cellInnerDiv"]')) {
            posts.add(el);
          } else {
            el.querySelectorAll<HTMLElement>('[data-testid="cellInnerDiv"]').forEach((p) =>
              posts.add(p)
            );
          }
        }
      }
      posts.forEach(processPost);
    });
  },

  stop() {
    adUnsub?.();
    adUnsub = null;
    for (const [post, original] of processedPosts) {
      post.style.display = original.display;
      if (original.marker === undefined) delete post.dataset.adBlockerProcessed;
      else post.dataset.adBlockerProcessed = original.marker;
    }
    processedPosts.clear();
  },
});
