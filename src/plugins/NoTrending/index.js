import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoTrending",
    description: "Removes the trending sections",
    authors: [Devs.Mopi],
    removedElements: [],
    observer: null,

    start() {
        const removeTrending = () => {
            // Remove trending sidebar
            const trendingSidebars = document.querySelectorAll('div[data-testid="sidebarColumn"] section[aria-labelledby]');
            trendingSidebars.forEach((sidebar) => {
                const header = sidebar.querySelector('h1[dir="auto"][role="heading"]');
                if (header) {
                    const parent = sidebar.parentNode;
                    const nextSibling = sidebar.nextSibling;
                    parent.removeChild(sidebar);
                    this.removedElements.push({ element: sidebar, parent, nextSibling });
                }
            });

            // Remove trending from the Explore page
            const exploreTrending = document.querySelector('div[aria-label^="Timeline:"][role="region"]');
            if (exploreTrending) {
                const parent = exploreTrending.parentNode;
                const nextSibling = exploreTrending.nextSibling;
                parent.removeChild(exploreTrending);
                this.removedElements.push({ element: exploreTrending, parent, nextSibling });
            }

            // Remove "Trends for you" section
            const trendsForYou = document.querySelector('div[aria-label][role="region"]');
            if (trendsForYou) {
                const parent = trendsForYou.parentNode;
                const nextSibling = trendsForYou.nextSibling;
                parent.removeChild(trendsForYou);
                this.removedElements.push({ element: trendsForYou, parent, nextSibling });
            }
        };

        // Run the function immediately
        removeTrending();

        // Set up a MutationObserver to watch for dynamically added content
        this.observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    removeTrending();
                }
            }
        });

        // Start observing the document with the configured parameters
        this.observer.observe(document.body, { childList: true, subtree: true });
    },

    stop() {
        // Disconnect the observer
        if (this.observer) {
            this.observer.disconnect();
        }

        // Restore removed elements
        this.removedElements.forEach(({ element, parent, nextSibling }) => {
            if (nextSibling) {
                parent.insertBefore(element, nextSibling);
            } else {
                parent.appendChild(element);
            }
        });

        // Clear the removed elements array
        this.removedElements = [];
    }
});