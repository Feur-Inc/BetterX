import { Devs, definePlugin } from "@betterx/core";

const SELECTORS = [
  'a[href^="/i/premium_sign_up"]',
  'a[href="/i/verified-orgs-signup"]',
  'a[href="/i/monetization"]',
  'a[href^="https://ads.x.com/?"]',
  'a[href="/jobs"]',
  'aside[aria-label*="Premium"][role="complementary"]',
  '[aria-label="Subscribe to Premium"]',
  'a[href="/i/jf/creators/studio"]',
  '[aria-label="Creator Studio"]',
  'div[data-testid="inlinePrompt"]',
  'a[href="/i/account_analytics"]',
];

let observer: MutationObserver | null = null;
let setupTimer: ReturnType<typeof setTimeout> | null = null;
let domReadyHandler: (() => void) | null = null;
const hiddenElements = new Map<HTMLElement, { display: string; width: string; height: string }>();

function hideElement(el: HTMLElement): void {
  if (!hiddenElements.has(el)) {
    hiddenElements.set(el, {
      display: el.style.display,
      width: el.style.width,
      height: el.style.height,
    });
  }
  el.style.display = "none";
  el.style.width = "0px";
  el.style.height = "0px";
}

export default definePlugin({
  name: "RemovePremium",
  description: "Remove all premium elements from the interface",
  authors: [Devs.TPM28],
  platform: "android",

  start() {
    const removeElements = (): void => {
      for (const element of hiddenElements.keys()) {
        if (!element.isConnected) hiddenElements.delete(element);
      }
      for (const footer of document.querySelectorAll('[data-testid="premium_signup_footer"]')) {
        footer
          .closest('[role="dialog"]')
          ?.querySelector<HTMLButtonElement>('button[data-testid="app-bar-close"]')
          ?.click();
      }
      for (const selector of SELECTORS) {
        for (const el of document.querySelectorAll<HTMLElement>(selector)) {
          const parent = el.closest<HTMLElement>(".r-1ifxtd0");
          const target = parent ?? el;
          hideElement(target);
        }
      }

      for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
        'a[href^="/i/premium_sign_up"]'
      )) {
        const wrapper = anchor.closest<HTMLElement>("div.r-dnmrzs");
        if (wrapper) hideElement(wrapper);
      }

      for (const el of document.querySelectorAll<HTMLElement>(".r-1ifxtd0")) {
        if (el.textContent?.includes("Access your post analytics")) {
          hideElement(el);
        }
      }

      for (const el of document.querySelectorAll<HTMLElement>('[role="complementary"].r-eqz5dr')) {
        if (!el.querySelector("ul")) {
          const target = el.parentElement ?? el;
          hideElement(target as HTMLElement);
        }
      }
    };

    const setup = (): void => {
      removeElements();
      observer = new MutationObserver(removeElements);
      observer.observe(document.body, { childList: true, subtree: true });
    };

    if (document.readyState === "loading") {
      domReadyHandler = () => {
        setupTimer = setTimeout(setup, 400);
      };
      document.addEventListener("DOMContentLoaded", domReadyHandler, { once: true });
    } else {
      setupTimer = setTimeout(setup, 400);
    }
  },

  stop() {
    observer?.disconnect();
    observer = null;
    if (setupTimer) clearTimeout(setupTimer);
    setupTimer = null;
    if (domReadyHandler) {
      document.removeEventListener("DOMContentLoaded", domReadyHandler);
      domReadyHandler = null;
    }
    for (const [element, original] of hiddenElements) {
      element.style.display = original.display;
      element.style.width = original.width;
      element.style.height = original.height;
    }
    hiddenElements.clear();
  },
});
