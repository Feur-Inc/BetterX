import { Devs, definePlugin } from "@betterx/core";
import { DOMObserver } from "../SharedObserver/index.js";

const SELECTORS = [
  'a[href="/i/grok"]',
  'a[href*="grok.com/imagine"]',
  '[data-testid="GrokDrawer"]',
  'button[aria-label="Grok actions"]',
  'button[data-testid="grokImgGen"]',
  'button[aria-label="Profile Summary"]',
  'div[role="button"] svg[viewBox="0 0 33 32"]',
  'div.css-175oi2r.r-1777fci.r-1wzrnnt button[role="button"]',
];

let grokUnsub: (() => void) | null = null;
let grokSetupTimer: ReturnType<typeof setTimeout> | null = null;
let grokDomReady: (() => void) | null = null;
const hiddenElements = new Map<HTMLElement, { display: string; width: string; height: string }>();

export default definePlugin({
  name: "RemoveGrok",
  description: "Remove all Grok AI elements from the interface",
  authors: [Devs.TPM28],
  dependencies: ["SharedObserver"],

  start() {
    const removeElements = (): void => {
      for (const selector of SELECTORS) {
        for (const el of document.querySelectorAll<HTMLElement>(selector)) {
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
      }
    };

    const setup = (): void => {
      removeElements();
      grokUnsub = DOMObserver.subscribe(removeElements);
    };

    if (document.readyState === "loading") {
      grokDomReady = () => {
        grokSetupTimer = setTimeout(setup, 400);
      };
      document.addEventListener("DOMContentLoaded", grokDomReady, { once: true });
    } else {
      grokSetupTimer = setTimeout(setup, 400);
    }
  },

  stop() {
    grokUnsub?.();
    grokUnsub = null;
    if (grokSetupTimer) clearTimeout(grokSetupTimer);
    grokSetupTimer = null;
    if (grokDomReady) document.removeEventListener("DOMContentLoaded", grokDomReady);
    grokDomReady = null;
    for (const [element, original] of hiddenElements) {
      element.style.display = original.display;
      element.style.width = original.width;
      element.style.height = original.height;
    }
    hiddenElements.clear();
  },
});
