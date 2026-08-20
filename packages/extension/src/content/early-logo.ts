// ─── Early Injection ─────────────────────────────────────────────────────────
// Runs at document_start to:
// 1. Inject active theme CSS before the page paints (no FOUC)
// 2. Replace the X loading screen logo before it's visible

import { prioritizeThemeRules } from "@betterx/core";
import browser from "webextension-polyfill";

// Preserve authored CSS; see core/theme/processor.ts.
function processCSS(css: string): string {
  return css;
}

// ─── Theme Injection ────────────────────────────────────────────────────────
const THEME_STATE_KEY = "bx_theme_state";
const THEME_CSS_PREFIX = "bx_theme_css_";
const STYLE_PREFIX = "betterx-theme-";

async function injectThemes(): Promise<void> {
  const stateResult = await browser.storage.sync.get(THEME_STATE_KEY);
  const state = stateResult[THEME_STATE_KEY] as { order?: string[]; active?: string[] } | undefined;
  if (!state?.active?.length) return;

  const keys = state.active.map((id) => THEME_CSS_PREFIX + id);
  const cssResult = await browser.storage.local.get(keys);
  const root = document.head || document.documentElement;
  for (const id of state.active) {
    const css = cssResult[THEME_CSS_PREFIX + id] as string | undefined;
    if (!css) continue;
    const style = document.createElement("style");
    style.id = STYLE_PREFIX + id;
    style.textContent = processCSS(css);
    root.appendChild(style);
    try {
      if (style.sheet) prioritizeThemeRules(style.sheet.cssRules);
    } catch {
      // Keep the authored CSS if this browser cannot rewrite a particular rule.
    }
  }
}

void injectThemes();

// ─── Logo Replacement ───────────────────────────────────────────────────────
const LOGOS: Record<string, { path: string; viewBox: string; scale?: string }> = {
  twitter: {
    path: "M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z",
    viewBox: "0 0 24 24",
  },
  bluesky: {
    path: "m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z",
    viewBox: "0 0 600 500",
    scale: "0.75",
  },
  betterx: {
    path: "M136.6551,95.4922l3.4292-1.7013c18.0529-8.4865,18.7141-38.0995,4.8879-50.394-9.7757-8.6925-27.7556-10.5765-40.3856-11.0118-19.4186-.6679-39.2259.5283-58.6811.0133v135.4084l65.772.0166c20.3324-.8706,42.994-6.4729,47.5031-29.4203,3.6053-18.3686-3.3627-37.621-22.5254-42.911ZM123.5365,45.5169c6.3399.9005,13.6767,3.9774,17.0826,9.6761,3.283,5.496,3.8179,14.7965,1.8674,20.7942-2.6716,8.2074-11.0916,11.2411-18.9501,12.4207v-42.891ZM73.2024,156.8182h-16.3051V43.3903h16.3051v113.4279ZM112.9035,156.466l-29.0681.3522v-55.6507l29.0681.3555v54.9429ZM112.9035,89.8234l-29.0681.3555v-46.7887l29.0681.3522v46.0809ZM123.5365,154.3394v-50.6897c15.1255,2.861,24.5058,10.0814,25.5126,22.4922,1.2029,14.8165-6.649,24.7285-25.5126,28.1975Z",
    viewBox: "0 0 200 200",
    scale: "1",
  },
};

const PLUGIN_STATES_KEY = "bx_plugin_states";

async function replaceLogo(): Promise<void> {
  const result = await browser.storage.sync.get(PLUGIN_STATES_KEY);
  const states = result[PLUGIN_STATES_KEY] as
    | Record<string, { enabled?: boolean; settings?: Record<string, unknown> }>
    | undefined;
  if (!states) return;

  const btb = states.BringTwitterBack;
  if (!btb?.enabled) return;

  const choice = (btb.settings?.logoChoice as string) ?? "twitter";
  const logo = LOGOS[choice];
  if (!logo) return;

  const style = document.createElement("style");
  style.textContent = `#placeholder svg path { visibility: hidden; }${logo.scale ? `#placeholder svg { transform: scale(${logo.scale}); }` : ""}`;
  (document.head || document.documentElement).appendChild(style);

  function tryReplaceLogo(selectedLogo: (typeof LOGOS)[string]) {
    const path = document.querySelector<SVGPathElement>("#placeholder svg path");
    if (!path) return false;

    const svg = path.closest("svg");
    path.setAttribute("d", selectedLogo.path);
    if (svg) svg.setAttribute("viewBox", selectedLogo.viewBox);

    style.textContent = selectedLogo.scale
      ? `#placeholder svg { transform: scale(${selectedLogo.scale}); }`
      : "";
    return true;
  }

  if (tryReplaceLogo(logo)) return;

  const obs = new MutationObserver(() => {
    if (tryReplaceLogo(logo)) obs.disconnect();
  });

  const waitForBody = setInterval(() => {
    if (!document.body) return;
    clearInterval(waitForBody);
    if (tryReplaceLogo(logo)) return;
    obs.observe(document.body, { childList: true, subtree: true });
  }, 10);
}

void replaceLogo();
