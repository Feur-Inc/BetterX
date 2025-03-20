import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

// Properly define the observer with a type
let observer: MutationObserver | null = null;

export default definePlugin({
    name: "RemovePremium",
    description: "Remove all the premium elements",
    authors: [Devs.TPM28],
    start(): void {
        const selectors: string[] = [
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

        const removeElements = (): void => {
            selectors.forEach(selector => {
                const elements: NodeListOf<Element> = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const parent = element.closest('.r-1ifxtd0');
                    if (parent instanceof HTMLElement) {
                        parent.style.display = 'none';
                        parent.style.width = '0px';
                        parent.style.height = '0px';
                    } else if (element instanceof HTMLElement) {
                        element.style.display = 'none';
                        element.style.width = '0px';
                        element.style.height = '0px';
                    }
                });
            });

            // Handle analytics promotion
            document.querySelectorAll('.r-1ifxtd0').forEach(element => {
                if (element instanceof HTMLElement && element.textContent && 
                    element.textContent.includes('Access your post analytics')) {
                    element.style.display = 'none';
                    element.style.width = '0px';
                    element.style.height = '0px';
                }
            });

            const elements: NodeListOf<Element> = document.querySelectorAll('[role="complementary"].r-eqz5dr');
            elements.forEach(element => {
                const hasUlInside = element.querySelector('ul');
                if (!hasUlInside) {
                    const parentDiv = element.parentElement;
                    if (parentDiv instanceof HTMLElement) {
                        parentDiv.style.display = 'none';
                        parentDiv.style.width = '0px';
                        parentDiv.style.height = '0px';
                    } else if (element instanceof HTMLElement) {
                        element.style.display = 'none';
                        element.style.width = '0px';
                        element.style.height = '0px';
                    }
                }
            });
        };

        const setupObserver = (): void => {
            removeElements();
            observer = new MutationObserver(removeElements);
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(setupObserver, 400);
            });
        } else {
            setTimeout(setupObserver, 400);
        }
    },
    stop(): void {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }
});