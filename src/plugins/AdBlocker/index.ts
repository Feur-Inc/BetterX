import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// Precompute ad keywords as a Set for O(1) lookups.
const adKeywords = new Set<string>([
  "Ad",
  "Sponsored",
  "Sponsorisé",
  "Gesponsert",
  "Promocionado",
  "Patrocinado"
]);

export default definePlugin({
  name: "AdBlocker",
  description: "Hides sponsored posts and ads from your feed",
  authors: [Devs.Ayaz, Devs.Mopi, Devs.TPM28],

  observer: null as MutationObserver | null,

  start(): void {
    // Process posts already in the document.
    document
      .querySelectorAll('[data-testid="cellInnerDiv"]')
      .forEach((xpost: Element) => this.processPost(xpost as HTMLElement));

    // Create a MutationObserver to handle new posts in batches.
    this.observer = new MutationObserver((mutations: MutationRecord[]) => {
      const posts = new Set<HTMLElement>();
      mutations.forEach((mutation: MutationRecord) => {
        mutation.addedNodes.forEach((node: Node) => {
          // Process only Element nodes.
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as HTMLElement;
          // If the added node is a post, add it.
          if (el.matches('[data-testid="cellInnerDiv"]')) {
            posts.add(el);
          } else {
            // Otherwise, search for posts within it.
            el.querySelectorAll('[data-testid="cellInnerDiv"]').forEach((post: Element) =>
              posts.add(post as HTMLElement)
            );
          }
        });
      });
      // Process each unique post.
      posts.forEach((xpost: HTMLElement) => this.processPost(xpost));
    });

    // Start observing the entire document body.
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  },

  /**
   * Marks and processes a post element. Posts are processed only once.
   */
  processPost(xpost: HTMLElement): void {
    if (xpost.dataset.adBlockerProcessed) return;
    xpost.dataset.adBlockerProcessed = "true";
    if (this.checkIfAd(xpost)) {
      xpost.style.display = "none";
    }
  },

  /**
   * Returns true if the given post element appears to be an ad.
   */
  checkIfAd(xpost: HTMLElement): boolean {
    // Quickly check for ad-related attributes.
    const hasPromoted = xpost.querySelector('[data-testid="placementTracking"]');
    const hasAdArticle = xpost.querySelector('article[aria-labelledby*="id__"]');
    if (hasPromoted && hasAdArticle) {
      return true;
    }

    // Use a TreeWalker to traverse text nodes (avoiding creation of large arrays).
    const walker = document.createTreeWalker(
      xpost, 
      NodeFilter.SHOW_TEXT
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textContent = (node as Text).textContent;
      if (textContent && adKeywords.has(textContent.trim())) {
        return true;
      }
    }
    return false;
  }
});
