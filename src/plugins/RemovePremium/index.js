import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let observer;

export default definePlugin({
    name: "RemovePremium",
    description: "Remove all the premium elements from the Twitter website",
    authors: [Devs.TPM28],
    start() {
        const selectors = [
            'a[href="/i/premium_sign_up"]',
            'a[href="/i/verified-orgs-signup"]',
            'a[href="/i/monetization"]',
            'a[href^="https://ads.x.com/?"]',
            'a[href="/i/premium_sign_up?referring_page=settings"]',
            'aside[aria-label="Cette offre expire bientôt !"]'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => element.remove());
        });

        observer = new MutationObserver(() => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => element.remove());
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => element.remove());
        });

    },
    stop() {
        if (observer) {
            observer.disconnect();
        }
    }
});