import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "BringTwitterBack",
    description: "Reverts X branding back to Twitter",
    authors: [Devs.Mopi, Devs.TPM28],
    options: {
        accentColorButton: {
            type: OptionType.BOOLEAN,
            description: "Use Twitter's accent color for Tweet buttons",
            default: true
        },
        useBlueskyLogo: {
            type: OptionType.BOOLEAN,
            description: "Use Bluesky's logo instead of Twitter's",
            default: false
        }
    },
    observers: [],

    start() {

        // Cache settings so that we don’t repeatedly access "this.settings.store"
        const store = this.settings.store;

        // SVG path for the Twitter logo.
        const twitterLogoD = "M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z";

        // SVG path for the Bluesky logo
        const blueskyLogoD = "m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z";

        // Selectors for various UI elements:
        const querySelectorInput = 'path[d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"]';
        const notificationsSelector = 'a[href="/notifications"][role="link"]';
        const homeTweetButtonSelector = '[data-testid="tweetButtonInline"]';
        const tweetComposerButtonSelector = 'button[data-testid="tweetButton"]';
        const retweetSelector = 'div[data-testid="retweetConfirm"]';
        const retweetsTrackerSelector = 'div[role="group"]';
        const tweetComposerSelector = 'div[data-viewportview="true"]';
        const profileTweetsTextSelector = 'a[role="tab"]';
        const tweetPostTitleSelector = 'h2[dir="ltr"][aria-level="2"][role="heading"]';
        const loginFooterSelector = 'nav[class="css-175oi2r r-18u37iz r-1w6e6rj r-3pj75a r-1777fci r-1mmae3n"]';
        const cookieBannerSelector = 'div[class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-1qd0xha r-n6v787 r-1cwl3u0 r-16dba41 r-5oul0u r-knv0ih"]';
        const loadingLogoSelector = 'svg[class="r-4qtqp9 r-yyyyoo r-dnmrzs r-lrvibr r-m6rgpd r-1p0dtai r-1nao33i r-wy61xf r-zchlnj r-1d2f490 r-ywje51 r-u8s1d r-ipm5af r-1blnp2b"] path';
        const retweetPostOptionsSelector = '[class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-1qd0xha r-a023e6 r-rjixqe r-b88u0q"]';
        const deletedTweetAlertSelector = 'div[role="alert"][data-testid="toast"]';
        const timelineSelector = 'div[aria-label="Timeline: Your Home Timeline"]';

        let notificationObserverConnected = false;
        let logoObserverConnected = false;

        const loggingKey = "bringTwitterBack.loggingEnabled";
        if (!localStorage.getItem(loggingKey)) {
            localStorage.setItem(loggingKey, "false");
        }

        // ─── HELPER FUNCTIONS ─────────────────────────────

        function debounce(func, delay) {
            let timer;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => func.apply(this, args), delay);
            };
        }

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Remove existing favicon links and (re)create one.
        function updateFavicon(faviconPath = "icons/favicon.ico") {
            document.querySelectorAll('link[rel="shortcut icon"]').forEach(link => link.remove());
            const divElements = document.querySelectorAll('div[dir="ltr"][aria-live="polite"]');
            if (!divElements.length) {
                return;
            }
            const regex = /^(\d+)\+?\sunread\sitems$/;
            for (let div of divElements) {
                const attribute = div.getAttribute("aria-label");
                if (attribute && regex.test(attribute)) {
                    faviconPath = "../icons/favicon-notification.ico";
                    break;
                }
            }
            const favicon = document.createElement("link");
            favicon.setAttribute("rel", "shortcut icon");
            // (Note: We preserve the original behavior by not setting the href attribute.)
            document.head.appendChild(favicon);
        }

        function updateTitle() {
            const titleElement = document.querySelector("title");
            if (!titleElement) {
                return;
            }
            let tabTitle = titleElement.textContent;
            if (tabTitle && tabTitle.includes("X")) {
                if (tabTitle.includes(" / X")) {
                    tabTitle = tabTitle.replace(" / X", " / Twitter");
                } else if (tabTitle === "X") {
                    tabTitle = tabTitle.replace("X", "Twitter");
                }
                if (tabTitle.includes(" on X: ")) {
                    tabTitle = tabTitle.replace(" on X: ", " on Twitter: ");
                }
                if (tabTitle.includes("X. It’s what’s happening")) {
                    tabTitle = tabTitle.replace("X. It’s what’s happening", "Twitter. It’s what’s happening");
                }
                document.title = tabTitle;
            }
        }

        function updateLogo() {
            const loadingLogo = document.querySelector(loadingLogoSelector);
            if (!loadingLogo) {
                return;
            }
            
            if (store.useBlueskyLogo) {
                loadingLogo.setAttribute("d", blueskyLogoD);
                if (loadingLogo.parentElement) {
                    loadingLogo.parentElement.setAttribute("viewBox", "0 0 600 500");
                }
            } else {
                loadingLogo.setAttribute("d", twitterLogoD);
            }
        }

        // ── Accent color support ───────────────────────────
        function findTargetColor() {
            // Check localStorage first
            const storedColor = localStorage.getItem('twitter-accent-color');
            
            // Try to find color from UI
            const container = document.querySelector('div[data-testid="ScrollSnap-List"] div[style*="background-color:"]');
            if (container) {
                const style = window.getComputedStyle(container);
                const newColor = style.backgroundColor;
                
                // Update localStorage if we found a different color
                if (newColor !== storedColor) {
                    localStorage.setItem('twitter-accent-color', newColor);
                    return newColor;
                }
            }
            if (!container) {
                // Try to find X mention element if ScrollSnap not found
                const xMention = document.querySelector('a[href="/X"][role="link"][style*="color:"]');
                if (xMention) {
                    const style = window.getComputedStyle(xMention);
                    const newColor = style.color;
                    localStorage.setItem('twitter-accent-color', newColor);
                    return newColor;
                }
            }
            // Return stored color if it exists, otherwise default Twitter blue
            return storedColor || "rgb(29, 155, 240)";
        }

        function adjustColor(color) {
            const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (!rgbMatch) return null;
            const [ , r, g, b] = rgbMatch;
            const newR = Math.max(0, parseInt(r, 10) - 24);
            const newG = Math.max(0, parseInt(g, 10) - 24);
            const newB = Math.max(0, parseInt(b, 10) - 24);
            return `rgb(${newR}, ${newG}, ${newB})`;
        }

        const updateStylesheet = () => {
            if (!store.accentColorButton) return;
            const targetColor = findTargetColor();
            const hoverColor = adjustColor(targetColor) || targetColor;
            if (styleSheet) {
                // Clear out all existing rules.
                while (styleSheet.cssRules.length > 0) {
                    styleSheet.deleteRule(0);
                }
            }
            styleSheet.insertRule(`
                [data-testid="tweetButtonInline"],
                [data-testid="SideNav_NewTweet_Button"],
                [data-testid="tweetButton"] {
                    background-color: ${targetColor} !important;
                    transition: background-color 0.1s ease !important;
                }
            `, 0);
            styleSheet.insertRule(`
                [data-testid="tweetButtonInline"]:hover,
                [data-testid="SideNav_NewTweet_Button"]:hover,
                [data-testid="tweetButton"]:hover {
                    background-color: ${hoverColor} !important;
                }
            `, 1);
            styleSheet.insertRule(`
                [data-testid="tweetButtonInline"] div[style*="color: rgb(15, 20, 25)"],
                [data-testid="SideNav_NewTweet_Button"] div[style*="color: rgb(15, 20, 25)"],
                [data-testid="tweetButton"] div[style*="color: rgb(15, 20, 25)"] {
                    color: rgb(231, 233, 234) !important;
                }
            `, 2);
        };

        const debouncedUpdateStylesheet = debounce(updateStylesheet, 50);

        // ─── Create and attach our style element ─────────────
        const styleElement = document.createElement('style');
        document.head.appendChild(styleElement);
        const styleSheet = styleElement.sheet;
        updateStylesheet();

        // ─── Button observer for any tweet buttons that appear ─
        function observeButtons() {
            const buttons = document.querySelectorAll(
                '[data-testid="tweetButtonInline"], [data-testid="SideNav_NewTweet_Button"], [data-testid="tweetButton"]'
            );
            buttons.forEach(button => {
                buttonObserver.observe(button, {
                    attributes: true,
                    childList: true,
                    subtree: true
                });
            });
        }

        const buttonObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (
                    mutation.target.matches &&
                    mutation.target.matches(
                        '[data-testid="tweetButtonInline"], [data-testid="SideNav_NewTweet_Button"], [data-testid="tweetButton"]'
                    )
                ) {
                    mutation.target.style.color = 'rgb(231, 233, 234)';
                }
                updateStylesheet();
            });
        });

        // ─── Combined UI updater for body mutations ───────────
        // This replaces the two separate MutationObservers.
        function updateUI() {
            // Update logo (if the special input exists)
            const logoElem = document.querySelector(querySelectorInput);
            if (logoElem && logoElem.parentElement && logoElem.parentElement.parentElement) {
                const logoSvg = logoElem.parentElement.parentElement;
                const pathElem = logoSvg.getElementsByTagName("path")[0];
                if (pathElem) {
                    if (store.useBlueskyLogo) {
                        pathElem.setAttribute("d", blueskyLogoD);
                        logoSvg.setAttribute("viewBox", "0 0 600 500");
                    } else {
                        pathElem.setAttribute("d", twitterLogoD);
                        logoSvg.setAttribute("viewBox", "0 0 24 24");
                        if (document.body.style.backgroundColor === "rgb(255, 255, 255)") {
                            logoSvg.setAttribute("style", "color: #1D9BF0;");
                        }
                    }
                }
            }
            // Start notification observer if the notifications element is present.
            if (document.querySelector(notificationsSelector) && !notificationObserverConnected) {
                startNotificationObserver();
            }
            // Likewise, if the loading logo is present and not already observed, start its observer.
            if (document.querySelector(loadingLogoSelector) && !logoObserverConnected) {
                startLogoObserver();
            }
            // Update Tweet/Retweet button text
            const homeTweetButtonResult = document.querySelector(homeTweetButtonSelector);
            if (homeTweetButtonResult) {
                const homeTweetButton = homeTweetButtonResult.getElementsByTagName("span")[1];
                if (homeTweetButton && homeTweetButton.textContent === "Post") {
                    homeTweetButton.textContent = "Tweet";
                }
            }
            const tweetComposerButtonResult = document.querySelector(tweetComposerButtonSelector);
            if (tweetComposerButtonResult) {
                const tweetButton = tweetComposerButtonResult.getElementsByTagName("span")[1];
                if (tweetButton && tweetButton.textContent === "Post") {
                    tweetButton.textContent = "Tweet";
                }
            }
            const retweetResult = document.querySelector(retweetSelector);
            if (retweetResult) {
                const retweetButton = retweetResult.getElementsByTagName("span")[0];
                if (retweetButton && retweetButton.textContent === "Repost") {
                    retweetButton.textContent = "Retweet";
                }
            }
            // Update Reposts/Retweets text in the tracker if appropriate.
            const tweetComposerResult = document.querySelector(tweetComposerSelector);
            const retweetsTrackerResult = document.querySelector(retweetsTrackerSelector);
            if (!tweetComposerResult && retweetsTrackerResult) {
                const repostsSpan = retweetsTrackerResult.getElementsByTagName("span")[3];
                if (repostsSpan && repostsSpan.textContent === "Reposts") {
                    repostsSpan.textContent = "Retweets";
                }
            }
            // Update profile tab text.
            const profileTweetsTextResult = document.querySelector(profileTweetsTextSelector);
            if (profileTweetsTextResult) {
                const profileTweets = profileTweetsTextResult.querySelector("span");
                if (profileTweets && profileTweets.textContent === "Posts") {
                    profileTweets.textContent = "Tweets";
                }
            }
            // Update the tweet post title.
            const tweetPostTitleResult = document.querySelectorAll(tweetPostTitleSelector);
            if (tweetPostTitleResult && tweetPostTitleResult[1]) {
                const tweetPostTitle = tweetPostTitleResult[1].getElementsByTagName("span")[0];
                if (tweetPostTitle && tweetPostTitle.textContent === "Post") {
                    tweetPostTitle.textContent = "Tweet";
                }
            }
            // Update options in retweet post menus.
            const retweetPostOptionsResults = document.querySelectorAll(retweetPostOptionsSelector);
            if (retweetPostOptionsResults) {
                retweetPostOptionsResults.forEach(result => {
                    const span = result.childNodes[0];
                    if (span && span.textContent) {
                        switch (span.textContent) {
                            case "Repost":
                                span.textContent = "Retweet";
                                break;
                            case "Quote":
                                span.textContent = "Quote Tweet";
                                break;
                            case "View Quotes":
                                span.textContent = span.textContent.replace("View Quotes", "View Retweets");
                                break;
                        }
                    }
                });
            }
            // Update text in the login footer.
            const loginFooterResult = document.querySelector(loginFooterSelector);
            if (loginFooterResult) {
                loginFooterResult.childNodes.forEach(result => {
                    if (result.textContent && result.textContent.includes("X")) {
                        result.textContent = result.textContent.replace("X", "Twitter");
                    }
                });
            }
            // Update cookie banner text.
            const cookieBannerResult = document.querySelector(cookieBannerSelector);
            if (cookieBannerResult && cookieBannerResult.textContent && cookieBannerResult.textContent.includes("X")) {
                cookieBannerResult.textContent = cookieBannerResult.textContent.replaceAll("X", "Twitter");
            }
            // Update deleted tweet alerts.
            const deletedTweetAlertResult = document.querySelector(deletedTweetAlertSelector);
            if (deletedTweetAlertResult) {
                const span = deletedTweetAlertResult.getElementsByTagName("span")[0];
                if (span && span.textContent && span.textContent.includes("post")) {
                    span.textContent = span.textContent.replace("post", "tweet");
                }
            }
            // Update timeline buttons.
            const timelineResult = document.querySelector(timelineSelector);
            if (timelineResult) {
                const buttons = timelineResult.getElementsByTagName("span");
                if (buttons.length > 0 && buttons[0].textContent && buttons[0].textContent.includes("posts")) {
                    buttons[0].textContent = buttons[0].textContent.replace("posts", "tweets");
                } else {
                }
            }
        }

        // Create one combined observer for the document body.
        const combinedObserver = new MutationObserver(mutations => {
            updateUI();
            if (store.accentColorButton) {
                const shouldObserveButtons = mutations.some(mutation => {
                    return Array.from(mutation.addedNodes).some(node => {
                        return node.nodeType === 1 && (
                            node.matches?.('[data-testid="tweetButtonInline"], [data-testid="SideNav_NewTweet_Button"], [data-testid="tweetButton"]') ||
                            node.querySelector?.('[data-testid="tweetButtonInline"], [data-testid="SideNav_NewTweet_Button"], [data-testid="tweetButton"]')
                        );
                    });
                });
                if (shouldObserveButtons) {
                    observeButtons();
                }
                debouncedUpdateStylesheet();
            }
        });
        combinedObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        this.observers.push(combinedObserver);
        this.observers.push(buttonObserver);

        // ─── Other observers ───────────────────────────────

        function startNotificationObserver() {
            const notificationsElem = document.querySelector(notificationsSelector);
            if (notificationsElem) {
                notificationObserver.observe(notificationsElem, { childList: true, subtree: true });
                notificationObserverConnected = true;
            }
        }

        const notificationObserver = new MutationObserver(mutationList => {
            if (mutationList.length) {
                updateFavicon();
            }
        });

        const metaObserver = new MutationObserver((mutationList, observer) => {
            if (document.querySelector("title")) {
                startTitleObserver();
                metaObserver.disconnect();
            }
        });

        const titleObserver = new MutationObserver((mutationList, observer) => {
            titleObserver.disconnect();
            updateTitle();
            const titleElem = document.querySelector("title");
            if (titleElem) {
                titleObserver.observe(titleElem, { childList: true });
            }
        });

        function startTitleObserver() {
            const titleElem = document.querySelector("title");
            if (titleElem) {
                titleObserver.observe(titleElem, { childList: true });
            }
        }

        const loadingLogoObserver = new MutationObserver((mutationList, observer) => {
            updateLogo();
            const loadingLogo = document.querySelector(loadingLogoSelector);
            const currentLogoD = store.useBlueskyLogo ? blueskyLogoD : twitterLogoD;
            
            if (loadingLogo && loadingLogo.getAttribute("d") === currentLogoD) {
                loadingLogoObserver.disconnect();
            }
        });

        function startLogoObserver() {
            const loadingLogoElem = document.querySelector(loadingLogoSelector);
            if (loadingLogoElem) {
                loadingLogoObserver.observe(loadingLogoElem, { childList: true, subtree: true });
                logoObserverConnected = true;
            }
        }

        // Wait until document.body exists before starting some observers.
        (async () => {
            while (!document.body) {
                await delay(100);
            }
            metaObserver.observe(document.head, { childList: true, subtree: true });
        })();

        // Do some initial updates.
        updateFavicon();
        updateTitle();
        updateLogo();

        // Create a style element for the Bluesky logo adjustments
        if (store.useBlueskyLogo) {
            const blueskyStyleElement = document.createElement('style');
            blueskyStyleElement.textContent = `
                [data-testid="TopNavHeader"] svg[viewBox="0 0 600 500"] {
                    transform: scale(0.75);
                }
            `;
            document.head.appendChild(blueskyStyleElement);
            this.blueskyStyleElement = blueskyStyleElement;
        }

        this.styleElement = styleElement;
    },

    stop() {
        if (this.bodyObserver) this.bodyObserver.disconnect();
        if (this.notificationObserver) this.notificationObserver.disconnect();
        if (this.metaObserver) this.metaObserver.disconnect();
        if (this.titleObserver) this.titleObserver.disconnect();
        if (this.loadingLogoObserver) this.loadingLogoObserver.disconnect();
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        if (this.styleElement) {
            this.styleElement.remove();
        }
        if (this.blueskyStyleElement) {
            this.blueskyStyleElement.remove();
        }
    }
});
