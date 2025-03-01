import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let observer;

export default definePlugin({
    name: "RemovePremium",
    description: "Remove all the premium elements",
    authors: [Devs.TPM28],
    start() {
        const selectors = [
            'a[href="/i/premium_sign_up"]',
            'a[href="/i/verified-orgs-signup"]',
            'a[href="/i/monetization"]',
            'a[href^="https://ads.x.com/?"]',
            'a[href="/i/premium_sign_up?referring_page=settings"]',
            'a[href="/jobs"]',
            'aside[aria-label*="Premium"][role="complementary"]',
            'div[data-testid="inlinePrompt"]',
            'a[href="/i/account_analytics"]'
        ];

        const removeElements = () => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const parent = element.closest('.r-1ifxtd0');
                    if (parent) {
                        parent.style.display = 'none';
                        parent.style.width = '0px';
                        parent.style.height = '0px';
                    } else {
                        element.style.display = 'none';
                        element.style.width = '0px';
                        element.style.height = '0px';
                    }
                });
            });

            // Handle analytics promotion
            document.querySelectorAll('.r-1ifxtd0').forEach(element => {
                if (element.textContent.includes('Access your post analytics')) {
                    element.style.display = 'none';
                    element.style.width = '0px';
                    element.style.height = '0px';
                }
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