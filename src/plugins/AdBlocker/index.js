import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "AdBlocker",
    description: "Hides sponsored posts and ads from your feed",
    authors: [Devs.Ayaz, Devs.Mopi],

    start() {
        this.observer = (event) => {
            const xposts = Array.from(document.querySelectorAll('[data-testid="cellInnerDiv"]'));
            xposts.forEach(xpost => {
                // Check for multiple ad indicators
                const isAd = this.checkIfAd(xpost);
                if (isAd) {
                    xpost.style.display = "none";
                }
            });
        };

        document.addEventListener("DOMNodeInserted", this.observer);
    },

    stop() {
        if (this.observer) {
            document.removeEventListener("DOMNodeInserted", this.observer);
        }
    },

    checkIfAd(xpost) {
        // Common ad-related keywords in different languages
        const adKeywords = ['Ad', 'Sponsored', 'Sponsorisé', 'Gesponsert', 'Promocionado', 'Patrocinado'];
        
        // Get all text content elements
        const xpostElements = Array.from(xpost.querySelectorAll('*'));
        
        // Check for ad keywords
        const hasAdKeyword = xpostElements.some(el => 
            adKeywords.some(keyword => 
                el.textContent?.trim() === keyword
            )
        );

        // Check for sponsored article attributes
        const hasAdArticle = xpost.querySelector('article[aria-labelledby*="id__"]');
        const hasPromotedContent = xpost.querySelector('[data-testid="placementTracking"]');

        return hasAdKeyword || (hasAdArticle && hasPromotedContent);
    }
});
