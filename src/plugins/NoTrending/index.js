import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoTrending",
    description: "Removes the trending page from Twitter",
    authors: [Devs.Mopi],
    start() {
        const removeTrending = () => {
            // Selector for the trending sidebar
            const trendingSidebar = document.querySelector('div[aria-label="Timeline: Trending now"]');
            if (trendingSidebar) {
                trendingSidebar.remove();
                console.log("Trending sidebar removed");
            }

            // Selector for the "What's happening" section (which often contains trending topics)
            const whatsHappening = document.querySelector('h1[aria-level="1"][role="heading"]:not([id])');
            if (whatsHappening && whatsHappening.textContent.includes("happening")) {
                whatsHappening.closest('div[data-testid="sidebarColumn"]').remove();
                console.log("What's happening section removed");
            }

            // Remove trending from the Explore page
            const exploreTrending = document.querySelector('div[aria-label="Timeline: Explore"]');
            if (exploreTrending) {
                exploreTrending.remove();
                console.log("Explore page trending removed");
            }
        };
        removeTrending();
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    removeTrending();
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },
    stop() {
    }
});