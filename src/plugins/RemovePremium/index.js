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
            'a[href="/i/grok"]',
            'a[href="/jobs"]'
        ];

        const removeElements = () => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    element.style.display = 'none';
                    element.style.width = '0px';
                    element.style.height = '0px';
                });
            });

            const elements = document.querySelectorAll('[role="complementary"].r-eqz5dr');
            elements.forEach(element => {
                const hasUlInside = element.querySelector('ul');
                if (!hasUlInside) {
                    const parentDiv = element.parentElement;
                    if (parentDiv) {
                        parentDiv.style.display = 'none';
                        parentDiv.style.width = '0px';
                        parentDiv.style.height = '0px';
                    } else {
                        element.style.display = 'none';
                        element.style.width = '0px';
                        element.style.height = '0px';
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
                }, 400);
            });
        } else {
            setTimeout(() => {
                removeElements();
                observer = new MutationObserver(removeElements);
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }, 400);
        }
    },
    stop() {
        if (observer) {
            observer.disconnect();
        }
    }
});