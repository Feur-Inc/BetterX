import { Devs, definePlugin } from "@betterx/core";
import { DOMObserver } from "../SharedObserver/index.js";

type RemovedElement = {
  element: Element;
  parent: Node;
  nextSibling: Node | null;
};

let noTrendingUnsub: (() => void) | null = null;
let noTrendingRemoved: RemovedElement[] = [];
let noTrendingDebounce: ReturnType<typeof setTimeout> | null = null;

export default definePlugin({
  name: "NoTrending",
  description: "Removes trending sections from your feed and explore page",
  authors: [Devs.Mopi],
  dependencies: ["SharedObserver"],

  start() {
    const removeTrending = (): void => {
      // Trending sidebar
      document
        .querySelectorAll('div[data-testid="sidebarColumn"] section[aria-labelledby]')
        .forEach((section) => {
          if (section.querySelector('h1[dir="auto"][role="heading"]') && section.parentNode) {
            const { parentNode, nextSibling } = section;
            parentNode.removeChild(section);
            noTrendingRemoved.push({ element: section, parent: parentNode, nextSibling });
          }
        });

      // Explore trending - only target the Explore page timeline, not tweet conversations
      const explore = document.querySelector('div[aria-label="Timeline: Explore"][role="region"]');
      if (explore?.parentNode) {
        const { parentNode, nextSibling } = explore;
        parentNode.removeChild(explore);
        noTrendingRemoved.push({ element: explore, parent: parentNode, nextSibling });
      }

      // "Trends for you" - only target regions whose label indicates trending content
      document.querySelectorAll<HTMLElement>('div[role="region"][aria-label]').forEach((region) => {
        const label = region.getAttribute("aria-label") ?? "";
        if (/trend/i.test(label) && region.parentNode) {
          const { parentNode, nextSibling } = region;
          parentNode.removeChild(region);
          noTrendingRemoved.push({ element: region, parent: parentNode, nextSibling });
        }
      });
    };

    removeTrending();
    noTrendingUnsub = DOMObserver.subscribe(() => {
      if (noTrendingDebounce) clearTimeout(noTrendingDebounce);
      noTrendingDebounce = setTimeout(() => {
        noTrendingDebounce = null;
        removeTrending();
      }, 300);
    });
  },

  stop() {
    noTrendingUnsub?.();
    noTrendingUnsub = null;
    if (noTrendingDebounce) clearTimeout(noTrendingDebounce);
    noTrendingDebounce = null;

    for (const { element, parent, nextSibling } of noTrendingRemoved) {
      if (!(parent as Node).isConnected) continue;
      if (nextSibling?.parentNode === parent) {
        parent.insertBefore(element, nextSibling);
      } else {
        (parent as Element).appendChild(element);
      }
    }
    noTrendingRemoved = [];
  },
});
