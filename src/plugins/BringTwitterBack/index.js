import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "BringTwitterBack",
    description: "Reverts X branding back to Twitter",
    authors: [Devs.Mopi],

    observers: [],

    start() {
        
        const twitterLogoD = "M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z";

        const querySelectorInput = 'path[d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"]';
        const notificationsSelector = 'a[href="/notifications"][role="link"]';
        const tweetButtonsSelector = 'a[href="/compose/post"]';
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

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function updateFavicon(faviconPath = "icons/favicon.ico") {
            const elements = document.getElementsByTagName("link");
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].getAttribute("rel") && elements[i].getAttribute("rel") == "shortcut icon") {
                    elements[i].remove();
                }
            }
            const divElements = document.querySelectorAll('div[dir="ltr"][aria-live="polite"]');
            if (divElements.length == 0) return;
            
            const regex = /^(\\d+)\\+?\\sunread\\sitems$/;
            for (let i = 0; i < divElements.length; i++) {
                const attribute = divElements[i].getAttribute("aria-label");
                if (divElements && attribute && regex.test(attribute)) {
                    faviconPath = "../icons/favicon-notification.ico";
                }
            }
            const faviconURL = typeof chrome != "undefined" ? chrome.runtime.getURL(faviconPath) : browser.runtime.getURL(faviconPath);

            const favicon = document.createElement("link");
            favicon.setAttribute("rel", "shortcut icon");
            favicon.setAttribute("href", faviconURL);
            document.head.appendChild(favicon);
        }

        function updateTitle() {
            let titleElement = document.querySelector("title");
            if (!titleElement) return;
            
            let tabTitle = titleElement.textContent;
            if (tabTitle && tabTitle.includes("X")) {
                if (tabTitle.includes(" / X")) {
                    tabTitle = tabTitle.replace(" / X", " / Twitter");
                }
                else if (tabTitle == "X") {
                    tabTitle = tabTitle.replace("X", "Twitter");
                }
                if (tabTitle.includes(" on X: ")) {
                    tabTitle = tabTitle.replace(" on X: ", " on Twitter: ");
                }
                if (tabTitle.includes("X. It's what's happening")) {
                    tabTitle = tabTitle.replace("X. It's what's happening", "Twitter. It's what's happening");
                }
                document.title = tabTitle;
            }
        }

        function updateLogo() {
            const loadingLogo = document.querySelector(loadingLogoSelector);
            if (!loadingLogo) return;
            
            if (loadingLogo) {
                loadingLogo.setAttribute("d", twitterLogoD);
            }
        }

        const bodyCallback = (mutationList, observer) => {
            for (let mutation of mutationList) {
                const querySelectorResult = document.querySelector(querySelectorInput);
                if (querySelectorResult && querySelectorResult.parentElement && querySelectorResult.parentElement.parentElement) {
                    const logoSvg = querySelectorResult.parentElement.parentElement;
                    logoSvg.getElementsByTagName("path")[0].setAttribute("d", twitterLogoD);
                    logoSvg.setAttribute("viewBox", "0 0 24 24");

                    if (document.body.style.backgroundColor == "rgb(255, 255, 255)") {
                        logoSvg.setAttribute("style", "color: #1D9BF0;");
                    }
                }
                if (document.querySelector(notificationsSelector)) {
                    if (!notificationObserverConnected) {
                        startNotificationObserver();
                    }
                }
                if (document.querySelector(loadingLogoSelector)) {
                    if (!logoObserverConnected) {
                        startLogoObserver();
                    }
                }
                const tweetButtonsSelectorResults = document.querySelectorAll(tweetButtonsSelector);
                if (tweetButtonsSelectorResults) {
                    for (const result of tweetButtonsSelectorResults) {
                        const spans = document.getElementsByTagName("span");
                        for (const span of spans) {
                            if (span.textContent == "Post") {
                                span.textContent = "Tweet";
                            }
                        }
                    }
                }
                const homeTweetButtonResult = document.querySelector(homeTweetButtonSelector);
                if (homeTweetButtonResult) {
                    const homeTweetButton = homeTweetButtonResult.getElementsByTagName("span")[1];
                    if (homeTweetButton && homeTweetButton.textContent == "Post") {
                        homeTweetButton.textContent = "Tweet";
                    }
                }
                const tweetComposerButtonResult = document.querySelector(tweetComposerButtonSelector);
                if (tweetComposerButtonResult) {
                    const tweetButton = tweetComposerButtonResult.getElementsByTagName("span")[1];
                    if (tweetButton && tweetButton && tweetButton.textContent == "Post") {
                        tweetButton.textContent = "Tweet";
                    }
                }
                const retweetResult = document.querySelector(retweetSelector);
                if (retweetResult) {
                    const retweetButton = retweetResult.getElementsByTagName("span")[0];
                    if (retweetButton && retweetButton.textContent == "Repost") {
                        retweetButton.textContent = "Retweet";
                    }
                }
                const tweetComposerResult = document.querySelector(tweetComposerSelector);
                const retweetsTrackerResult = document.querySelector(retweetsTrackerSelector);
                if (!tweetComposerResult && retweetsTrackerResult) {
                    const repostsSpan = retweetsTrackerResult.getElementsByTagName("span")[3];
                    if (repostsSpan && repostsSpan.textContent == "Reposts") {
                        repostsSpan.textContent = "Retweets";
                    }
                }
                const profileTweetsTextResult = document.querySelector(profileTweetsTextSelector);
                if (profileTweetsTextResult) {
                    const profileTweets = profileTweetsTextResult.querySelector("span");
                    if (profileTweets && profileTweets.textContent == "Posts") {
                        profileTweets.textContent = "Tweets";
                    }
                }
                const tweetPostTitleResult = document.querySelectorAll(tweetPostTitleSelector);
                if (tweetPostTitleResult && tweetPostTitleResult[1]) {
                    const tweetPostTitle = tweetPostTitleResult[1].getElementsByTagName("span")[0];
                    if (tweetPostTitle && tweetPostTitle.textContent == "Post") {
                        tweetPostTitle.textContent = "Tweet";
                    }
                }
                const retweetPostOptionsResults = document.querySelectorAll(retweetPostOptionsSelector);
                if (retweetPostOptionsResults) {
                    for (const result of retweetPostOptionsResults) {
                        const span = result.childNodes[0];
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
                }
                const loginFooterResult = document.querySelector(loginFooterSelector);
                if (loginFooterResult) {
                    for (const result of loginFooterResult.childNodes) {
                        if (!result.textContent) {
                            continue;
                        }
                        if (result.textContent.includes("X")) {
                            result.textContent = result.textContent.replace("X", "Twitter");
                        }
                    }
                }
                const cookieBannerResult = document.querySelector(cookieBannerSelector);
                if (cookieBannerResult && cookieBannerResult.textContent && cookieBannerResult.textContent.includes("X")) {
                    cookieBannerResult.textContent = cookieBannerResult.textContent.replaceAll("X", "Twitter");
                }
                const deletedTweetAlertResult = document.querySelector(deletedTweetAlertSelector);
                if (deletedTweetAlertResult) {
                    const span = deletedTweetAlertResult.getElementsByTagName("span")[0];
                    if (!span || !span.textContent) {
                        continue;
                    }
                    if (span.textContent.includes("post")) {
                        span.textContent = span.textContent.replace("post", "tweet");
                    }
                }
                const timelineResult = document.querySelector(timelineSelector);
                if (timelineResult) {
                    const buttons = timelineResult.getElementsByTagName("span");
                    if (buttons.length == 0) {
                    }
                    else {
                        if (buttons[0].textContent && buttons[0].textContent.includes("posts")) {
                            buttons[0].textContent = buttons[0].textContent.replace("posts", "tweets");
                        }
                    }
                }
            }
        };

        const bodyObserver = new MutationObserver(bodyCallback);

        const notificationCallback = (mutationList, observer) => {
            for (let mutation of mutationList) {
                updateFavicon();
            }
        };

        const notificationObserver = new MutationObserver(notificationCallback);

        function startNotificationObserver() {
            notificationObserver.observe(document.querySelector(notificationsSelector), { childList: true, subtree: true });
            notificationObserverConnected = true;
        }

        const metaObserverCallback = (mutationList, observer) => {
            for (let mutation of mutationList) {
                if (document.querySelector("title")) {
                    startTitleObserver();
                    metaObserver.disconnect();
                }
            }
        };

        const metaObserver = new MutationObserver(metaObserverCallback);

        const titleCallback = (mutationList, observer) => {
            for (let mutation of mutationList) {
                titleObserver.disconnect();
                updateTitle();
                titleObserver.observe(document.querySelector("title"), { childList: true });
            }
        };

        const titleObserver = new MutationObserver(titleCallback);

        function startTitleObserver() {
            titleObserver.observe(document.querySelector("title"), { childList: true });
        }

        const loadingLogoObserverCallback = (mutationList, observer) => {
            for (let mutation of mutationList) {
                updateLogo();
                const loadingLogo = document.querySelector(loadingLogoSelector);
                if (loadingLogo) {
                    if (loadingLogo && loadingLogo.getAttribute("d") == twitterLogoD) {
                        loadingLogoObserver.disconnect();
                    }
                }
            }
        };

        const loadingLogoObserver = new MutationObserver(loadingLogoObserverCallback);

        function startLogoObserver() {
            loadingLogoObserver.observe(document.querySelector(loadingLogoSelector), { childList: true, subtree: true });
            logoObserverConnected = true;
        }

        (async () => {
            while (true) {
                if (document.body) {
                    bodyObserver.observe(document.body, { childList: true, subtree: true });
                    metaObserver.observe(document.head, { childList: true, subtree: true });
                    break;
                }
                await delay(100);
            }
        })();

        updateFavicon();
        updateTitle();
        updateLogo();

        function findTargetColor() {
            const element = document.querySelector('div[data-testid="ScrollSnap-List"] div[style*="background-color:"]');
            if (!element) return null;
            const style = window.getComputedStyle(element);
            return style.backgroundColor;
        }

        function adjustColor(color) {
            const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (!rgbMatch) return null;
            const [_, r, g, b] = rgbMatch;
            const newR = Math.max(0, parseInt(r) - 24);
            const newG = Math.max(0, parseInt(g) - 24);
            const newB = Math.max(0, parseInt(b) - 24);
            return `rgb(${newR}, ${newG}, ${newB})`;
        }

        function updateStylesheet() {
            const targetColor = findTargetColor();
            if (!targetColor) return;
            const hoverColor = adjustColor(targetColor);
            if (!hoverColor) return;

            if (styleSheet) {
                while (styleSheet.cssRules.length > 0) {
                    styleSheet.deleteRule(0);
                }
            }

            styleSheet.insertRule(`
                [data-testid="tweetButtonInline"],
                [data-testid="SideNav_NewTweet_Button"],
                [data-testid="tweetButton"] {
                    background-color: ${targetColor} !important;
                    transition: background-color 0.2s ease !important;
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
        }

        const styleElement = document.createElement('style');
        document.head.appendChild(styleElement);
        const styleSheet = styleElement.sheet;

        updateStylesheet();

        const buttonObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.target.matches('[data-testid="tweetButtonInline"] div[style*="color"]') ||
                    mutation.target.matches('[data-testid="SideNav_NewTweet_Button"] div[style*="color"]') ||
                    mutation.target.matches('[data-testid="tweetButton"] div[style*="color"]')) {
                    mutation.target.style.color = 'rgb(231, 233, 234)';
                }
            });
        });

        const targetElement = document.querySelector('div[data-testid="ScrollSnap-List"]');
        if (targetElement) {
            const observer = new MutationObserver(() => {
                updateStylesheet();
            });
            observer.observe(targetElement, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['style', 'class']
            });
            this.observers.push(observer);
        }

        function observeButtons() {
            const buttons = document.querySelectorAll('[data-testid="tweetButtonInline"], [data-testid="SideNav_NewTweet_Button"], [data-testid="tweetButton"]');
            buttons.forEach(button => {
                buttonObserver.observe(button, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    attributeFilter: ['style']
                });
            });
        }

        const colorBodyObserver = new MutationObserver((mutations) => {
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

            if (!targetElement) {
                const newTargetElement = document.querySelector('div[data-testid="ScrollSnap-List"]');
                if (newTargetElement) {
                    updateStylesheet();
                    const observer = new MutationObserver(() => {
                        updateStylesheet();
                    });
                    observer.observe(newTargetElement, {
                        attributes: true,
                        childList: true,
                        subtree: true,
                        attributeFilter: ['style', 'class']
                    });
                    this.observers.push(observer);
                }
            }
        });

        colorBodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        this.observers.push(colorBodyObserver);
        this.observers.push(buttonObserver);

        observeButtons();
        updateStylesheet();

        this.styleElement = styleElement;
    },
    stop() {

        if (this.bodyObserver) this.bodyObserver.disconnect();
        if (this.notificationObserver) this.bodyObserver.disconnect();
        if (this.metaObserver) this.metaObserver.disconnect();
        if (this.titleObserver) this.titleObserver.disconnect();
        if (this.loadingLogoObserver) this.loadingLogoObserver.disconnect();
        
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];

        if (this.styleElement) {
            this.styleElement.remove();
        }

        window.location.reload();
    }
});
