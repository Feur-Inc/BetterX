import { Devs, OptionType, definePlugin } from "@betterx/core";

const TWITTER_LOGO =
  "M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z";
const BLUESKY_LOGO =
  "m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z";
const BETTERX_LOGO =
  "M136.6551,95.4922l3.4292-1.7013c18.0529-8.4865,18.7141-38.0995,4.8879-50.394-9.7757-8.6925-27.7556-10.5765-40.3856-11.0118-19.4186-.6679-39.2259.5283-58.6811.0133v135.4084l65.772.0166c20.3324-.8706,42.994-6.4729,47.5031-29.4203,3.6053-18.3686-3.3627-37.621-22.5254-42.911ZM123.5365,45.5169c6.3399.9005,13.6767,3.9774,17.0826,9.6761,3.283,5.496,3.8179,14.7965,1.8674,20.7942-2.6716,8.2074-11.0916,11.2411-18.9501,12.4207v-42.891ZM73.2024,156.8182h-16.3051V43.3903h16.3051v113.4279ZM112.9035,156.466l-29.0681.3522v-55.6507l29.0681.3555v54.9429ZM112.9035,89.8234l-29.0681.3555v-46.7887l29.0681.3522v46.0809ZM123.5365,154.3394v-50.6897c15.1255,2.861,24.5058,10.0814,25.5126,22.4922,1.2029,14.8165-6.649,24.7285-25.5126,28.1975Z";

type LogoChoice = "x" | "twitter" | "bluesky" | "betterx";

const LOGO_CONFIG: Record<LogoChoice, { path: string; viewBox: string }> = {
  x: { path: "", viewBox: "" }, // keep original
  twitter: { path: TWITTER_LOGO, viewBox: "0 0 24 24" },
  bluesky: { path: BLUESKY_LOGO, viewBox: "0 0 600 500" },
  betterx: { path: BETTERX_LOGO, viewBox: "0 0 200 200" },
};
// X logo path starts with this prefix - use startsWith() to avoid whitespace mismatch
const X_LOGO_PREFIX = "M21.742 21.75l";

// Prefixes for all logo paths so we can find the SVG even after replacement
const KNOWN_LOGO_PREFIXES = [
  X_LOGO_PREFIX,
  TWITTER_LOGO.slice(0, 20),
  BLUESKY_LOGO.slice(0, 20),
  BETTERX_LOGO.slice(0, 20),
];

function findAllLogoPaths(): SVGPathElement[] {
  const results: SVGPathElement[] = [];
  for (const path of document.querySelectorAll<SVGPathElement>("svg path")) {
    // Skip every BetterX UI element (nav button, modal, badges, etc.).
    // All betterx-owned elements have IDs or classes prefixed with "betterx-".
    if (path.closest('[id^="betterx-"], [class*="betterx-"]')) continue;
    const d = path.getAttribute("d") ?? "";
    if (KNOWN_LOGO_PREFIXES.some((p) => d.startsWith(p))) results.push(path);
  }
  return results;
}

let btbObservers: MutationObserver[] = [];
let btbStyleEl: HTMLStyleElement | null = null;
let btbLogoScaleStyleEl: HTMLStyleElement | null = null;
let btbDebounce: ReturnType<typeof setTimeout> | null = null;
let btbUpdateUI: (() => void) | null = null;

const LOGO_SCALE: Record<LogoChoice, string> = {
  x: "",
  twitter: "",
  bluesky: "0.75",
  betterx: "1",
};

function applyLogoScale(choice: LogoChoice): void {
  const scale = LOGO_SCALE[choice];
  if (!btbLogoScaleStyleEl) {
    btbLogoScaleStyleEl = document.createElement("style");
    document.head.appendChild(btbLogoScaleStyleEl);
  }
  btbLogoScaleStyleEl.textContent = scale
    ? `h1[role="heading"] a svg, #placeholder svg { transform: scale(${scale}); }`
    : "";
}

function applyLogo(choice: LogoChoice): void {
  const logoPaths = findAllLogoPaths();
  if (logoPaths.length === 0) return;

  for (const logoPath of logoPaths) {
    const svg = logoPath.closest("svg");
    if (!svg) continue;

    if (choice === "x") {
      const origD = svg.dataset.btbOrigD;
      const origVB = svg.dataset.btbOrigVB;
      if (origD) logoPath.setAttribute("d", origD);
      if (origVB) svg.setAttribute("viewBox", origVB);
    } else {
      if (!svg.dataset.btbOrigD) {
        svg.dataset.btbOrigD = logoPath.getAttribute("d") ?? "";
        svg.dataset.btbOrigVB = svg.getAttribute("viewBox") ?? "";
      }
      const config = LOGO_CONFIG[choice];
      logoPath.setAttribute("d", config.path);
      svg.setAttribute("viewBox", config.viewBox);
    }
  }
  applyLogoScale(choice);
}

function findAccentColor(): string {
  const stored = localStorage.getItem("twitter-accent-color");
  // Primary: ScrollSnap color picker (settings page)
  const el = document.querySelector<HTMLElement>(
    'div[data-testid="ScrollSnap-List"] div[style*="background-color:"]'
  );
  if (el) {
    const color = getComputedStyle(el).backgroundColor;
    if (color) {
      localStorage.setItem("twitter-accent-color", color);
      return color;
    }
  }
  // Fallback: tinted link to /X profile
  const xLink = document.querySelector<HTMLElement>('a[href="/X"][role="link"][style*="color:"]');
  if (xLink) {
    const color = getComputedStyle(xLink).color;
    if (color) {
      localStorage.setItem("twitter-accent-color", color);
      return color;
    }
  }
  return stored ?? "rgb(29, 155, 240)";
}

function darkenColor(color: string): string {
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return color;
  const [, r, g, b] = m;
  return `rgb(${Math.max(0, Number(r) - 24)},${Math.max(0, Number(g) - 24)},${Math.max(0, Number(b) - 24)})`;
}

function replaceExact(selector: string, from: string, to: string): void {
  document.querySelectorAll(selector).forEach((el) => {
    if (el.textContent === from) el.textContent = to;
  });
}

function updateTitle(): void {
  const title = document.querySelector("title");
  if (!title?.textContent) return;
  const t = title.textContent;
  const updated = t
    .replace(" / X", " / Twitter")
    .replace(" on X: ", " on Twitter: ")
    .replace("X. It's what's happening", "Twitter. It's what's happening")
    .replace(/^X$/, "Twitter");
  if (updated !== t) document.title = updated;
}

export default definePlugin({
  name: "BringTwitterBack",
  description: "Reverts X branding back to Twitter",
  authors: [Devs.Mopi, Devs.TPM28],
  requiresRestart: true,
  options: {
    accentColorButton: {
      type: OptionType.BOOLEAN,
      default: true,
      description: "Use Twitter's accent color for Tweet buttons",
    },
    logoChoice: {
      type: OptionType.SELECT,
      default: "twitter",
      description: "Which logo to show in the sidebar",
      options: [
        { label: "X (default)", value: "x" },
        { label: "Twitter", value: "twitter" },
        { label: "Bluesky", value: "bluesky" },
        { label: "BetterX", value: "betterx" },
      ],
      onChange(value) {
        applyLogo(value as LogoChoice);
        btbUpdateUI?.();
      },
    },
  },

  start() {
    const store = this.settings.store;

    const styleEl = document.createElement("style");
    document.head.appendChild(styleEl);
    btbStyleEl = styleEl;

    const updateStyles = (): void => {
      if (!store.accentColorButton || !styleEl.sheet) return;
      const color = findAccentColor();
      const hover = darkenColor(color);
      const sheet = styleEl.sheet;
      while (sheet.cssRules.length > 0) sheet.deleteRule(0);
      sheet.insertRule(
        `[data-testid="tweetButtonInline"],[data-testid="SideNav_NewTweet_Button"],[data-testid="tweetButton"]{background-color:${color}!important;transition:background-color 0.1s ease!important;}`,
        0
      );
      sheet.insertRule(
        `[data-testid="tweetButtonInline"]:hover,[data-testid="SideNav_NewTweet_Button"]:hover,[data-testid="tweetButton"]:hover{background-color:${hover}!important;}`,
        1
      );
      // Keeps button text readable in dark mode when accent color is light
      sheet.insertRule(
        `[data-testid="tweetButtonInline"] div[style*="color: rgb(15, 20, 25)"],[data-testid="SideNav_NewTweet_Button"] div[style*="color: rgb(15, 20, 25)"],[data-testid="tweetButton"] div[style*="color: rgb(15, 20, 25)"]{color:rgb(231,233,234)!important;}`,
        2
      );
    };

    const updateUI = (): void => {
      // ── Logo ──────────────────────────────────────────────────────────────────
      applyLogo(store.logoChoice as LogoChoice);

      // ── Button / label text ───────────────────────────────────────────────────
      replaceExact('[data-testid="tweetButtonInline"] span', "Post", "Tweet");
      replaceExact('button[data-testid="tweetButton"] span', "Post", "Tweet");
      replaceExact('div[data-testid="retweetConfirm"] span', "Repost", "Retweet");
      // Profile tab
      replaceExact('a[role="tab"] span', "Posts", "Tweets");
      // Compose dialog heading
      replaceExact('h2[dir="ltr"][aria-level="2"][role="heading"] span', "Post", "Tweet");
      // Tweet stats (e.g. "42 Reposts")
      replaceExact('div[role="group"] span', "Reposts", "Retweets");
      // Repost context menu items
      replaceExact('div[data-testid="repost"] span', "Repost", "Retweet");
      replaceExact('div[data-testid="quotePost"] span', "Quote", "Quote Tweet");

      // ── Toast alerts (partial match) ─────────────────────────────────────────
      document
        .querySelectorAll<HTMLElement>('div[role="alert"][data-testid="toast"] span')
        .forEach((el) => {
          if (el.textContent?.includes("post")) {
            el.textContent = el.textContent
              .replace(/\bpost\b/g, "tweet")
              .replace(/\bPost\b/g, "Tweet");
          }
        });

      // ── Title ────────────────────────────────────────────────────────────────
      updateTitle();
      updateStyles();
    };

    // ── Title observer - body MutationObserver doesn't see <head> changes ──────
    const attachTitleObserver = (): void => {
      const titleEl = document.querySelector("title");
      if (!titleEl) return;
      const obs = new MutationObserver(updateTitle);
      obs.observe(titleEl, { childList: true });
      btbObservers.push(obs);
    };

    if (document.querySelector("title")) {
      attachTitleObserver();
    } else {
      // <title> not yet in DOM (early injection) - wait for it
      const headObs = new MutationObserver(() => {
        if (document.querySelector("title")) {
          attachTitleObserver();
          headObs.disconnect();
        }
      });
      headObs.observe(document.head, { childList: true });
      btbObservers.push(headObs);
    }

    // ── Body observer for dynamic content ────────────────────────────────────
    // Also watch `d` attribute - React may patch the logo path instead of replacing the node
    const observer = new MutationObserver(() => {
      if (btbDebounce) clearTimeout(btbDebounce);
      btbDebounce = setTimeout(() => {
        btbDebounce = null;
        updateUI();
      }, 200);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["d"],
    });
    btbObservers.push(observer);

    btbUpdateUI = updateUI;
    updateUI();
  },

  stop() {
    for (const obs of btbObservers) obs.disconnect();
    btbObservers = [];
    if (btbDebounce) clearTimeout(btbDebounce);
    btbDebounce = null;
    btbUpdateUI = null;
    btbStyleEl?.remove();
    btbLogoScaleStyleEl?.remove();
    btbStyleEl = null;
    btbLogoScaleStyleEl = null;
  },
});
