import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// Precompute ad keywords as a Set for O(1) lookups.
const adKeywords = new Set([
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

  start() {
    // Process posts already in the document.
    document
      .querySelectorAll('[data-testid="cellInnerDiv"]')
      .forEach(xpost => this.processPost(xpost));

    // Create a MutationObserver to handle new posts in batches.
    this.observer = new MutationObserver(mutations => {
      const posts = new Set();
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          // Process only Element nodes.
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = /** @type {Element} */ (node);
          // If the added node is a post, add it.
          if (el.matches('[data-testid="cellInnerDiv"]')) {
            posts.add(el);
          } else {
            // Otherwise, search for posts within it.
            el.querySelectorAll('[data-testid="cellInnerDiv"]').forEach(post =>
              posts.add(post)
            );
          }
        });
      });
      // Process each unique post.
      posts.forEach(xpost => this.processPost(xpost));
    });

    // Start observing the entire document body.
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  stop() {
    if (this.observer) {
      this.observer.disconnect();
    }
  },

  /**
   * Marks and processes a post element. Posts are processed only once.
   */
  processPost(xpost) {
    if (xpost.dataset.adBlockerProcessed) return;
    xpost.dataset.adBlockerProcessed = "true";
    if (this.checkIfAd(xpost)) {
      xpost.style.display = "none";
    }
  },

  /**
   * Returns true if the given post element appears to be an ad.
   */
  checkIfAd(xpost) {
    // Quickly check for ad-related attributes.
    const hasPromoted = xpost.querySelector('[data-testid="placementTracking"]');
    const hasAdArticle = xpost.querySelector('article[aria-labelledby*="id__"]');
    if (hasPromoted && hasAdArticle) {
      return true;
    }

    // Use a TreeWalker to traverse text nodes (avoiding creation of large arrays).
    const walker = document.createTreeWalker(xpost, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (adKeywords.has(node.textContent.trim())) {
        return true;
      }
    }
    return false;
  }
});
