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
                const xpostElements = Array.from(xpost.querySelectorAll('*'));
                const hasAd = xpostElements.find(el => el.textContent === 'Ad');
                if (hasAd) {
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
    }
});
