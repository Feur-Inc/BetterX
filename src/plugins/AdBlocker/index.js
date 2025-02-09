import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
  name: "AdBlocker",
  description: "Hides sponsored posts and ads from your feed",
  authors: [Devs.Ayaz, Devs.Mopi, Devs.TPM28],

  start() {
    // Process any posts already on the page
    document
      .querySelectorAll('[data-testid="cellInnerDiv"]')
      .forEach(xpost => this.processPost(xpost));

    // Create a MutationObserver to watch for new posts being added
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // Only proceed if the node is an HTMLElement
          if (!(node instanceof HTMLElement)) return;

          // If the added node itself is a post, process it
          if (node.matches('[data-testid="cellInnerDiv"]')) {
            this.processPost(node);
          } else {
            // Otherwise, look inside the node for posts
            node.querySelectorAll('[data-testid="cellInnerDiv"]').forEach(post => {
              this.processPost(post);
            });
          }
        });
      });
    });

    // Observe changes in the entire body (child additions, including deep changes)
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

  processPost(xpost) {
    // Skip if already processed
    if (xpost.dataset.adBlockerProcessed) return;
    xpost.dataset.adBlockerProcessed = "true";

    if (this.checkIfAd(xpost)) {
      xpost.style.display = "none";
    }
  },

  checkIfAd(xpost) {
    // Common ad-related keywords in different languages
    const adKeywords = [
      'Ad',
      'Sponsored',
      'Sponsorisé',
      'Gesponsert',
      'Promocionado',
      'Patrocinado'
    ];

    // Collect all child elements for keyword inspection
    const xpostElements = Array.from(xpost.querySelectorAll('*'));

    // Check if any element's text content exactly matches one of the ad keywords
    const hasAdKeyword = xpostElements.some(el =>
      adKeywords.some(keyword =>
        el.textContent?.trim() === keyword
      )
    );

    // Additional checks for sponsored post structures
    const hasAdArticle = xpost.querySelector('article[aria-labelledby*="id__"]');
    const hasPromotedContent = xpost.querySelector('[data-testid="placementTracking"]');

    return hasAdKeyword || (hasAdArticle && hasPromotedContent);
  }
});
