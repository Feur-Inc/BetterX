import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let observer;

export default definePlugin({
    name: "RemoveGrok",
    description: "Remove all Grok elements",
    authors: [Devs.TPM28],
    start() {
        const selectors = [
            'a[href="/i/grok"]',
            '[data-testid="GrokDrawer"]',
            'button[aria-label="Grok actions"]',
            'button[data-testid="grokImgGen"]',
            'div[data-testid="ScrollSnap-SwipeableList"]'
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
