import { Devs, OptionType, definePlugin } from "@betterx/core";

const STYLE_ID = "betterx-custom-accent-color";
const DEFAULT_COLOR = "#1d9bf0";

// X.com's known accent colors (all six choices available in settings)
const X_ACCENT_COLORS = [
  "29, 155, 240", // blue  #1d9bf0
  "255, 212, 0", // yellow #ffd400
  "249, 24, 128", // magenta #f91880
  "120, 86, 255", // purple #7856ff
  "255, 122, 0", // orange #ff7a00
  "0, 186, 124", // green #00ba7c
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  const [, red, green, blue] = m ?? [];
  if (!red || !green || !blue) return null;
  return {
    r: Number.parseInt(red, 16),
    g: Number.parseInt(green, 16),
    b: Number.parseInt(blue, 16),
  };
}

function buildCSS(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return "";
  const { r, g, b } = rgb;

  // Build selectors that override every X.com accent color variant
  const inlineColorSelectors = X_ACCENT_COLORS.map(
    (c) => `[style*="color: rgb(${c})"]:not([style*="background-color: rgb(${c})"])`
  ).join(",\n");

  const inlineBgSelectors = X_ACCENT_COLORS.map(
    (c) => `[style*="background-color: rgb(${c})"]`
  ).join(",\n");

  const inlineBorderSelectors = X_ACCENT_COLORS.map(
    (c) => `[style*="border-color: rgb(${c})"]`
  ).join(",\n");

  const inlineStrokeSelectors = X_ACCENT_COLORS.map((c) => `[style*="stroke: rgb(${c})"]`).join(
    ",\n"
  );

  return `
/* ── BetterX Custom Accent Color ─────────────────────────────────────────── */

/* Override BetterX UI accent */
:root {
  --betterx-accentColor: ${color} !important;
}

/* Override X.com's accent backgrounds */
.r-l5o3uw {
  background-color: ${color} !important;
}

/* Accent hover */
.r-1vtznih {
  background-color: ${color} !important;
  filter: brightness(0.85) !important;
}

/* Accent active */
.r-yuvema {
  background-color: ${color} !important;
  filter: brightness(0.78) !important;
}

/* Light accent backgrounds (10-20% opacity variants) */
.r-1peqgm7 {
  background-color: rgba(${r}, ${g}, ${b}, 0.1) !important;
}
.r-r18ze4 {
  background-color: rgba(${r}, ${g}, ${b}, 0.2) !important;
}

/* Accent text color (bell icon on notifications) */
.r-1cvl2hr {
  color: ${color} !important;
}

/* Override inline style accent text colors */
${inlineColorSelectors} {
  color: ${color} !important;
}

/* Override inline style accent backgrounds */
${inlineBgSelectors} {
  background-color: ${color} !important;
}

/* Override inline style accent borders */
${inlineBorderSelectors} {
  border-color: ${color} !important;
}

/* Override inline style accent strokes (spinners, progress circles) */
${inlineStrokeSelectors} {
  stroke: ${color} !important;
}

/* Accent border classes */
.r-vhj8yc {
  border-color: ${color} !important;
}
.r-1pbtemp {
  border-right-color: ${color} !important;
}
.r-b5kvu3 {
  border-color: ${color} !important;
}

/* Notification unread dot */
[aria-label*="unread"].r-4nw3r4 {
  background-color: ${color} !important;
}

/* Checkmark accent circle */
.r-4nw3r4.r-b5kvu3 {
  background-color: ${color} !important;
}

/* Poll winning bar fill */
.r-1er0wu3 {
  background-color: rgba(${r}, ${g}, ${b}, 0.55) !important;
}

/* Selected option border/outline */
.r-edyy15 {
  border-color: ${color} !important;
}

/* Tweet/Post button */
[data-testid="tweetButton"],
[data-testid="tweetButtonInline"] {
  background-color: ${color} !important;
}

/* Scrollbar thumb */
[style*="scrollbar-color: rgb(62, 65, 68) rgb(22, 24, 28)"] {
  scrollbar-color: ${color} transparent !important;
}

/* Focus rings on inputs */
[data-testid="SearchBox_Search_Input"]:focus {
  border-color: ${color} !important;
  box-shadow: 0 0 0 1px ${color} !important;
}

/* Bottom tab indicator (active nav) */
[role="tab"][aria-selected="true"] > div > div > div {
  background-color: ${color} !important;
}

/* Poll accent */
.r-eok2q2 {
  background-color: rgba(${r}, ${g}, ${b}, 0.55) !important;
}
.r-9cip40 {
  box-shadow: ${color} 0 0 0 1px !important;
}

/* Spaces border */
.r-1blqq69 {
  border-color: ${color} !important;
}

/* DM accent bubble */
.r-eff69c {
  background-color: ${color} !important;
  filter: brightness(0.92) !important;
}

/* Link color / accent text in tweets */
a[role="link"][href*="/status/"] .r-1nao33i,
[data-testid="tweetText"] a {
  color: ${color} !important;
}

/* SVG accent fills */
path[fill="rgb(29, 155, 240)"],
path[fill="#1d9bf0"],
path[fill="#1DA1F2"] {
  fill: ${color} !important;
}

/* SVG accent strokes */
[stroke="#1D9BF0" i],
[style*="stroke: rgb(29, 155, 240)"] {
  stroke: ${color} !important;
}

/* X logo colorization (uses accent in some contexts) */
path[d^="M18.244 2.25h3.308l"] {
  fill: ${color} !important;
}
`;
}

function injectAccentCSS(color: string): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildCSS(color);
}

function removeAccentCSS(): void {
  document.getElementById(STYLE_ID)?.remove();
}

export default definePlugin({
  name: "Custom Accent Color",
  description: "Override X.com's accent color with any color you want.",
  authors: [Devs.Mopi],
  version: "1.0.0",

  options: {
    accentColor: {
      type: OptionType.COLOR,
      default: DEFAULT_COLOR,
      label: "Accent Color",
      onChange(newValue) {
        const color = newValue as string;
        if (/^#[0-9a-f]{6}$/i.test(color)) {
          injectAccentCSS(color);
        }
      },
    },
  },

  start() {
    const color = this.settings.store.accentColor;
    if (/^#[0-9a-f]{6}$/i.test(color)) {
      injectAccentCSS(color);
    }
  },

  stop() {
    removeAccentCSS();
  },
});
