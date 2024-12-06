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
            'aside[aria-label="Cette offre expire bientôt !"]',
            'a[href="/i/grok"]',
            'a[href="/jobs"]'
        ];

        const removeElements = () => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => element.remove());
            });

            const complementaryElements = document.querySelectorAll('[role="complementary"]');
            complementaryElements.forEach(element => {
                if (!element.querySelector('ul')) {
                    const parentDiv = element.parentElement;
                    if (parentDiv) {
                        parentDiv.remove();
                    } else {
                        element.remove();
                    }
                }
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    removeElements();
                    observer = new MutationObserver(removeElements);
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }, 1000);
            });
        } else {
            setTimeout(() => {
                removeElements();
                observer = new MutationObserver(removeElements);
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }, 1000);
        }
    },
    stop() {
        if (observer) {
            observer.disconnect();
        }
    }
});
