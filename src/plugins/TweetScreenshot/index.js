import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { notifications } from "@api";

const normalButtonHTML = `
    <button aria-label="Screenshot" role="button" class="css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l" data-testid="screenshot" type="button">
        <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q" style="color: rgb(113, 118, 123);">
            <div class="css-175oi2r r-xoduu5">
                <div class="css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-1niwhzg r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1ny4l3l"></div>
                <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi">
                    <g>
                        <path d="M9.697 3H14.303l1.046 2H19.5C20.881 5 22 6.119 22 7.5v11c0 1.381-1.119 2.5-2.5 2.5h-15C3.119 21 2 19.881 2 18.5v-11C2 6.119 3.119 5 4.5 5h4.151l1.046-2zM12 8c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-5zm0 2c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"></path>
                    </g>
                </svg>
            </div>
        </div>
    </button>
`;

const hoverButtonHTML = `
    <button aria-label="Screenshot" role="button" class="css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l" data-testid="screenshot" type="button">
        <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q r-1cvl2hr">
            <div class="css-175oi2r r-xoduu5">
                <div class="css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-1niwhzg r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1ny4l3l r-1peqgm7"></div>
                <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi">
                    <g>
                        <path d="M9.697 3H14.303l1.046 2H19.5C20.881 5 22 6.119 22 7.5v11c0 1.381-1.119 2.5-2.5 2.5h-15C3.119 21 2 19.881 2 18.5v-11C2 6.119 3.119 5 4.5 5h4.151l1.046-2zM12 8c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-5zm0 2c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"></path>
                    </g>
                </svg>
            </div>
        </div>
    </button>
`;

export default definePlugin({
    name: "TweetScreenshot",
    description: "Add a button to take a screenshot of a tweet",
    authors: [Devs.TPM28],
    observer: null,
    screenWidth: window.innerWidth,
    start() {
        const pendingTweets = new Set();
        let scheduled = false;
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        node.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
                            pendingTweets.add(tweet);
                        });
                    }
                });
            });
            if (!scheduled) {
                scheduled = true;
                window.requestAnimationFrame(() => {
                    pendingTweets.forEach(tweet => {
                        this.addScreenshotButton(tweet);
                    });
                    pendingTweets.clear();
                    scheduled = false;
                });
            }
        });
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
            this.addScreenshotButton(tweet);
        });
    },
    stop() {
        if (this.observer) {
            this.observer.disconnect();
        }
        document.querySelectorAll('[data-testid="screenshot"]').forEach(button => {
            const container = button.closest('.css-175oi2r.r-18u37iz.r-1h0z5md.r-1wron08');
            if (container) container.remove();
        });
    },
    addScreenshotButton(tweet) {
        if (tweet.dataset.screenshotAdded) return;
        tweet.dataset.screenshotAdded = "true";
        const actionBar = tweet.querySelector('[role="group"]');
        if (!actionBar || actionBar.querySelector('[data-testid="screenshot"]')) return;
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'css-175oi2r r-18u37iz r-1h0z5md r-1wron08';
        const normalButtonWrapper = document.createElement('div');
        normalButtonWrapper.innerHTML = normalButtonHTML;
        const hoverButtonWrapper = document.createElement('div');
        hoverButtonWrapper.innerHTML = hoverButtonHTML;
        [normalButtonWrapper, hoverButtonWrapper].forEach(wrapper => {
            wrapper.querySelector('button')
                .addEventListener('click', (e) => this.captureScreenshot(tweet, e.currentTarget), { passive: true });
        });
        normalButtonWrapper.style.display = 'block';
        hoverButtonWrapper.style.display = 'none';
        buttonContainer.appendChild(normalButtonWrapper);
        buttonContainer.appendChild(hoverButtonWrapper);
        buttonContainer.addEventListener('mouseenter', () => {
            window.requestAnimationFrame(() => {
                if (buttonContainer.getAttribute("data-capturing") !== "true") {
                    normalButtonWrapper.style.display = 'none';
                    hoverButtonWrapper.style.display = 'block';
                }
            });
        });
        buttonContainer.addEventListener('mouseleave', () => {
            window.requestAnimationFrame(() => {
                if (buttonContainer.getAttribute("data-capturing") !== "true") {
                    normalButtonWrapper.style.display = 'block';
                    hoverButtonWrapper.style.display = 'none';
                }
            });
        });
        actionBar.insertBefore((() => {
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'css-175oi2r';
            wrapperDiv.style.cssText = 'display: inline-grid; justify-items: center; align-items: center;';
            wrapperDiv.appendChild(buttonContainer);
            return wrapperDiv;
        })(), actionBar.lastChild);
    },
    async captureScreenshot(tweet, btn) {
        try {
            btn.style.display = 'none';
            const container = btn.closest('.css-175oi2r.r-18u37iz.r-1h0z5md.r-1wron08');
            if (container) container.setAttribute("data-capturing", "true");

            // Récupérer les coordonnées du tweet
            const tweetRect = tweet.getBoundingClientRect();

            // Fonction utilitaire pour déterminer la hauteur d'éléments susceptibles de bloquer le haut de la vue
            const getTopBlockingOffset = () => {
                let offset = 0;
                // Vérifie la présence d'une barre de navigation par exemple
                const nav = document.querySelector('nav[aria-live="polite"][role="navigation"]');
                if (nav) {
                    const navRect = nav.getBoundingClientRect();
                    if (navRect.bottom > offset) offset = navRect.bottom;
                }
                // Vérifie un élément de statut qui pourrait gêner
                const statusDiv = document.querySelector('div[role="status"].css-175oi2r');
                if (statusDiv) {
                    const statusRect = statusDiv.getBoundingClientRect();
                    if (statusRect.bottom > offset) offset = statusRect.bottom;
                }
                return offset;
            };

            const blockingOffset = getTopBlockingOffset();

            // Si le tweet n'est pas entièrement visible ou est obstrué par un élément en haut, ajuste le défilement
            if (tweetRect.top < blockingOffset || tweetRect.bottom > window.innerHeight) {
                tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 300));

                // Re-vérifie la position après le scroll
                const updatedTweetRect = tweet.getBoundingClientRect();
                if (updatedTweetRect.top < blockingOffset) {
                    window.scrollBy(0, updatedTweetRect.top - blockingOffset);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            let containerDiv = tweet.previousElementSibling;
            if (!containerDiv) containerDiv = tweet.parentElement;
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!containerDiv) {
                throw new Error('Container div not found');
            }
            const inlineReplyNodes = containerDiv.querySelectorAll('[data-testid="inline_reply_offscreen"]');
            const originalDisplays = [];
            inlineReplyNodes.forEach(node => {
                originalDisplays.push(node.style.display);
                node.style.display = 'none';
            });
            let imageBuffer;
            try {
                imageBuffer = await window.api.captureElement(containerDiv);
            } finally {
                inlineReplyNodes.forEach((node, index) => {
                    node.style.display = originalDisplays[index];
                });
            }
            await window.api.copyImageToClipboard(imageBuffer);
            await notifications.showInfo("Screenshot copied to clipboard", { duration: 3000 });
            await new Promise(resolve => setTimeout(resolve, 100));
            btn.style.display = '';
            if (container) {
                container.removeAttribute("data-capturing");
                const normalButtonWrapper = container.firstElementChild;
                const hoverButtonWrapper = container.lastElementChild;
                if (container.matches(':hover')) {
                    normalButtonWrapper.style.display = 'none';
                    hoverButtonWrapper.style.display = 'block';
                } else {
                    normalButtonWrapper.style.display = 'block';
                    hoverButtonWrapper.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            btn.style.display = '';
            const container = btn.closest('.css-175oi2r.r-18u37iz.r-1h0z5md.r-1wron08');
            if (container) container.removeAttribute("data-capturing");
        }
    },
    settings: {
        enabled: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Enable tweet screenshots"
        }
    }
});