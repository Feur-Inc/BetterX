import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "AdBlocker",
    description: "Blocks ads and sponsored content on X (formerly Twitter)",
    authors: [Devs.Mopi],

    adsHidden: 0,
    adSelector: "div[data-testid=placementTracking]",
    trendSelector: "div[data-testid=trend]",
    userSelector: "div[data-testid=UserCell]",
    articleSelector: "article[data-testid=tweet]",
    sponsoredSvgPath: 'M20.75 2H3.25C2.007 2 1 3.007 1 4.25v15.5C1 20.993 2.007 22 3.25 22h17.5c1.243 0 2.25-1.007 2.25-2.25V4.25C23 3.007 21.993 2 20.75 2zM17.5 13.504c0 .483-.392.875-.875.875s-.875-.393-.875-.876V9.967l-7.547 7.546c-.17.17-.395.256-.62.256s-.447-.086-.618-.257c-.342-.342-.342-.896 0-1.237l7.547-7.547h-3.54c-.482 0-.874-.393-.874-.876s.392-.875.875-.875h5.65c.483 0 .875.39.875.874v5.65z',
    sponsoredBySvgPath: 'M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5zm-3.502 12h-2v-3.59l-5.293 5.3-1.414-1.42L12.581 10H8.996V8h7v7z',
    youMightLikeSvgPath: 'M12 1.75c-5.11 0-9.25 4.14-9.25 9.25 0 4.77 3.61 8.7 8.25 9.2v2.96l1.15-.17c1.88-.29 4.11-1.56 5.87-3.5 1.79-1.96 3.17-4.69 3.23-7.97.09-5.54-4.14-9.77-9.25-9.77zM13 14H9v-2h4v2zm2-4H9V8h6v2z',
    adsSvgPath: 'M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5zm-3.502 12h-2v-3.59l-5.293 5.3-1.414-1.42L12.581 10H8.996V8h7v7z',
    peopleFollowSvgPath: 'M17.863 13.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44zM12 2C9.791 2 8 3.79 8 6s1.791 4 4 4 4-1.79 4-4-1.791-4-4-4z',
    xAd: '>Ad<',
    promotedTweetTextSet: new Set(['Promoted Tweet', 'プロモツイート']),

    start() {
        this.attachEventListeners();
        this.startIntervals();
    },

    stop() {
        this.removeEventListeners();
        this.stopIntervals();
    },

    attachEventListeners() {
        window.addEventListener('load', this.getAndHideAds.bind(this));
        document.addEventListener('scroll', this.getAndHideAds.bind(this));
        
        const observer = new PerformanceObserver(() => {
            this.getAndHideAds();
        });
        observer.observe({type: 'largest-contentful-paint', buffered: true});
    },

    removeEventListeners() {
        window.removeEventListener('load', this.getAndHideAds.bind(this));
        document.removeEventListener('scroll', this.getAndHideAds.bind(this));
    },

    startIntervals() {
        this.sidebarInterval = setInterval(this.checkSidebar.bind(this), 500);
        this.premiumInterval = setInterval(this.checkPremiumAds.bind(this), 500);
    },

    stopIntervals() {
        clearInterval(this.sidebarInterval);
        clearInterval(this.premiumInterval);
    },

    getAds() {
        return Array.from(document.querySelectorAll('div')).filter(el => {
            return el.innerHTML.includes(this.sponsoredSvgPath) ||
                   el.innerHTML.includes(this.sponsoredBySvgPath) ||
                   el.innerHTML.includes(this.youMightLikeSvgPath) ||
                   el.innerHTML.includes(this.adsSvgPath) ||
                   (this.settings.removePeopleToFollow.value && el.innerHTML.includes(this.peopleFollowSvgPath)) ||
                   el.innerHTML.includes(this.xAd) ||
                   this.promotedTweetTextSet.has(el.innerText);
        });
    },

    hideAd(ad) {
        if (ad.closest(this.adSelector)) {
            ad.closest(this.adSelector).remove();
            this.adsHidden++;
        } else if (ad.closest(this.trendSelector)) {
            ad.closest(this.trendSelector).remove();
            this.adsHidden++;
        } else if (ad.closest(this.userSelector)) {
            ad.closest(this.userSelector).remove();
            this.adsHidden++;
        } else if (ad.closest(this.articleSelector)) {
            ad.closest(this.articleSelector).remove();
            this.adsHidden++;
        } else if (this.promotedTweetTextSet.has(ad.innerText)) {
            ad.remove();
            this.adsHidden++;
        }
    },

    getAndHideAds() {
        this.getAds().forEach(ad => this.hideAd(ad));
    },

    checkSidebar() {
        const timelines = document.querySelectorAll("[aria-label='Timeline: Conversation']");
        if (timelines.length === 2) {
            const tweetSidebar = timelines[0].parentElement.parentElement;
            tweetSidebar.addEventListener('scroll', this.getAndHideAds.bind(this));
        }
    },

    checkPremiumAds() {
        const premiumAd = document.querySelector("aside[aria-label='Subscribe to Premium']");
        if (premiumAd) premiumAd.remove();

        const premiumPlusAd = document.querySelector("aside[aria-label='Upgrade to Premium+']");
        if (premiumPlusAd) premiumPlusAd.remove();
    },

    settings: {
        removePeopleToFollow: {
            type: OptionType.BOOLEAN,
            default: false,
            description: "Remove 'People to follow' suggestions (may also remove some tweet replies)"
        }
    }
});