import { Devs, definePlugin } from "@betterx/core";
import { DOMObserver } from "../SharedObserver/index.js";

const SELECTORS = [
  'a[href="/i/premium_sign_up"]',
  'a[href="/i/verified-orgs-signup"]',
  'a[href="/i/monetization"]',
  'a[href^="https://ads.x.com/?"]',
  'a[href="/i/premium_sign_up?referring_page=settings"]',
  'a[href="/jobs"]',
  'aside[aria-label*="Premium"][role="complementary"]',
  '[aria-label="Subscribe to Premium"]',
  'a[href="/i/jf/creators/studio"]',
  '[aria-label="Creator Studio"]',
  'div[data-testid="inlinePrompt"]',
  'a[href="/i/account_analytics"]',
];

let premiumUnsub: (() => void) | null = null;
let premiumSetupTimer: ReturnType<typeof setTimeout> | null = null;
let premiumDomReady: (() => void) | null = null;
const hiddenElements = new Map<HTMLElement, { display: string; width: string; height: string }>();

function hideElement(element: HTMLElement): void {
  if (!hiddenElements.has(element)) {
    hiddenElements.set(element, {
      display: element.style.display,
      width: element.style.width,
      height: element.style.height,
    });
  }
  element.style.display = "none";
  element.style.width = "0px";
  element.style.height = "0px";
}

export default definePlugin({
  name: "RemovePremium",
  description: "Remove all premium elements from the interface",
  authors: [Devs.TPM28],
  dependencies: ["SharedObserver"],

  start() {
    const removeElements = (): void => {
      for (const selector of SELECTORS) {
        for (const el of document.querySelectorAll<HTMLElement>(selector)) {
          const parent = el.closest<HTMLElement>(".r-1ifxtd0");
          hideElement(parent ?? el);
        }
      }

      for (const el of document.querySelectorAll<HTMLElement>(".r-1ifxtd0")) {
        if (el.textContent?.includes("Access your post analytics")) {
          hideElement(el);
        }
      }

      for (const el of document.querySelectorAll<HTMLElement>('[role="complementary"].r-eqz5dr')) {
        if (!el.querySelector("ul")) {
          hideElement(el.parentElement ?? el);
        }
      }
    };

    const setup = (): void => {
      removeElements();
      premiumUnsub = DOMObserver.subscribe(removeElements);
    };

    if (document.readyState === "loading") {
      premiumDomReady = () => {
        premiumSetupTimer = setTimeout(setup, 400);
      };
      document.addEventListener("DOMContentLoaded", premiumDomReady, { once: true });
    } else {
      premiumSetupTimer = setTimeout(setup, 400);
    }
  },

  stop() {
    premiumUnsub?.();
    premiumUnsub = null;
    if (premiumSetupTimer) clearTimeout(premiumSetupTimer);
    premiumSetupTimer = null;
    if (premiumDomReady) document.removeEventListener("DOMContentLoaded", premiumDomReady);
    premiumDomReady = null;
    for (const [element, original] of hiddenElements) {
      element.style.display = original.display;
      element.style.width = original.width;
      element.style.height = original.height;
    }
    hiddenElements.clear();
  },
});
