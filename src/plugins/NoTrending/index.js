import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoTrending",
    description: "Removes the trending ",
    authors: [Devs.Mopi],
    start() {

        const removeTrending = () => {
            // Remove trending sidebar
            const trendingSidebars = document.querySelectorAll('div[data-testid="sidebarColumn"] section[aria-labelledby]');
            trendingSidebars.forEach((sidebar) => {
                const header = sidebar.querySelector('h1[dir="auto"][role="heading"]');
                if (header) {
                    sidebar.remove();
                }
            });

            // Remove trending from the Explore page
            const exploreTrending = document.querySelector('div[aria-label^="Timeline:"][role="region"]');
            if (exploreTrending) {
                exploreTrending.remove();
            }

            // Remove "Trends for you" section
            const trendsForYou = document.querySelector('div[aria-label][role="region"]');
            if (trendsForYou) {
                trendsForYou.remove();
            }
        };

        // Run the function immediately
        removeTrending();

        // Set up a MutationObserver to watch for dynamically added content
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    removeTrending();
                }
            }
        });

        // Start observing the document with the configured parameters
        observer.observe(document.body, { childList: true, subtree: true });
    },
    stop() {
    }
});