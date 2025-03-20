import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// Properly define the observer with a type
let observer: MutationObserver | null = null;

export default definePlugin({
    name: "RemoveGrok",
    description: "Remove all Grok elements",
    authors: [Devs.TPM28],
    start(): void {
        const selectors: string[] = [
            'a[href="/i/grok"]',
            '[data-testid="GrokDrawer"]',
            'button[aria-label="Grok actions"]',
            'button[data-testid="grokImgGen"]',
            'button[aria-label="Profile Summary"]',
            'div[role="button"] svg[viewBox="0 0 33 32"]',
            'div.css-175oi2r.r-1777fci.r-1wzrnnt button[role="button"]'
        ];

        const removeElements = (): void => {
            selectors.forEach(selector => {
                const elements: NodeListOf<Element> = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element instanceof HTMLElement) {
                        element.style.display = 'none';
                        element.style.width = '0px';
                        element.style.height = '0px';
                    }
                });
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
