// ─── BetterX Nav Button ───────────────────────────────────────────────────────
// Injects the BetterX button into X.com on desktop, extension, and Android.

import { BETTERX_LOGO_SVG } from "../utils/constants.js";
import { injectStyle, removeStyle } from "../utils/dom.js";

type OnClickFn = () => void;
type Platform = "desktop" | "extension" | "android";

const BUTTON_ID = "betterx-nav-btn";
const MOBILE_STYLE_ID = "betterx-mobile-drawer-style";
const MOBILE_DRAWER_ATTR = "data-betterx-account-drawer";

const NAV_SELECTORS = [
  'nav[aria-label="Primary"] a[href="/explore"]',
  'nav[aria-label="Primary"] a[href="/notifications"]',
  'nav[aria-label="Primary"] a[href="/messages"]',
  '[data-testid="AppTabBar_Home_Link"]',
  'a[href="/home"]',
];

const DRAWER_SELECTORS = ['div[aria-label="Account"]', 'div[role="dialog"]'];

const DRAWER_TEMPLATE_SELECTORS = [
  'a[href="/logout"]',
  'a[data-testid="logout"]',
  'a[href="/settings"]',
  'a[href="/i/bookmarks"]',
];

const MOBILE_CSS = `
[${MOBILE_DRAWER_ATTR}="1"] a[href="/logout"],
[${MOBILE_DRAWER_ATTR}="1"] a[data-testid="logout"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 0 !important;
  width: fit-content !important;
  min-width: 0 !important;
  padding: 1px 8px !important;
  margin: 8px 0 5px 0 !important;
  font-size: 11px !important;
  line-height: 1 !important;
  font-weight: 400 !important;
  color: inherit !important;
  text-decoration: none !important;
  align-self: flex-start !important;
}

[${MOBILE_DRAWER_ATTR}="1"] a[href="/logout"] > div,
[${MOBILE_DRAWER_ATTR}="1"] a[data-testid="logout"] > div {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 0 !important;
  width: auto !important;
  min-width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  text-align: left !important;
}

[${MOBILE_DRAWER_ATTR}="1"] a[href="/logout"] svg,
[${MOBILE_DRAWER_ATTR}="1"] a[data-testid="logout"] svg {
  display: none !important;
}

[${MOBILE_DRAWER_ATTR}="1"] a[href="/logout"] span,
[${MOBILE_DRAWER_ATTR}="1"] a[data-testid="logout"] span {
  color: inherit !important;
  font: inherit !important;
}

[${MOBILE_DRAWER_ATTR}="1"] a[href="/logout"] [dir="ltr"],
[${MOBILE_DRAWER_ATTR}="1"] a[data-testid="logout"] [dir="ltr"] {
  color: inherit !important;
  font-size: 11px !important;
  font-weight: 400 !important;
  line-height: 1 !important;
  letter-spacing: 0 !important;
}
`;

let desktopOnClick: OnClickFn | null = null;
let desktopTemplate: HTMLAnchorElement | null = null;
let desktopTemplateObserver: MutationObserver | null = null;
let desktopSyncRaf = 0;

function findDesktopTemplateAnchor(): HTMLAnchorElement | null {
  for (const sel of NAV_SELECTORS) {
    const anchor = document.querySelector<HTMLAnchorElement>(sel);
    if (anchor) return anchor;
  }
  return null;
}

function buildDesktopButton(
  templateAnchor: HTMLAnchorElement,
  onClick: OnClickFn
): HTMLAnchorElement {
  const anchor = templateAnchor.cloneNode(true) as HTMLAnchorElement;
  anchor.id = BUTTON_ID;
  anchor.href = "#";
  anchor.setAttribute("role", "button");
  anchor.setAttribute("aria-label", "BetterX");
  anchor.setAttribute("title", "BetterX");
  anchor.setAttribute("data-testid", "betterx");
  anchor.removeAttribute("aria-current");

  const icon = anchor.querySelector("svg");
  if (icon instanceof SVGSVGElement) {
    const replacement = createLogoIcon(icon);
    if (replacement) icon.replaceWith(replacement);
  }

  const label = anchor.querySelector<HTMLElement>('div[dir="ltr"]');
  if (label) label.textContent = "BetterX";

  anchor.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  anchor.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    }
  });

  return anchor;
}

function scheduleDesktopSync(): void {
  if (desktopSyncRaf) return;
  desktopSyncRaf = requestAnimationFrame(() => {
    desktopSyncRaf = 0;

    const current = document.getElementById(BUTTON_ID);
    const template = findDesktopTemplateAnchor();
    if (!current || !template?.parentElement || !desktopOnClick) return;

    observeDesktopTemplate(template);
    const next = buildDesktopButton(template, desktopOnClick);
    if (current.parentElement === template.parentElement) {
      current.replaceWith(next);
    } else {
      current.remove();
      template.parentElement.appendChild(next);
    }
  });
}

function observeDesktopTemplate(template: HTMLAnchorElement): void {
  if (desktopTemplate === template) return;

  desktopTemplateObserver?.disconnect();
  desktopTemplate = template;
  desktopTemplateObserver = new MutationObserver(scheduleDesktopSync);
  desktopTemplateObserver.observe(template, { childList: true, subtree: true });
}

function injectDesktopNavButton(onClick: OnClickFn, logoUrl: string): void {
  void logoUrl;
  desktopOnClick = onClick;
  if (document.getElementById(BUTTON_ID)) {
    const template = findDesktopTemplateAnchor();
    if (template) {
      observeDesktopTemplate(template);
      scheduleDesktopSync();
    }
    return;
  }

  const templateAnchor = findDesktopTemplateAnchor();
  if (!templateAnchor?.parentElement) return;

  templateAnchor.parentElement.appendChild(buildDesktopButton(templateAnchor, onClick));
  observeDesktopTemplate(templateAnchor);
}

function ensureMobileStyles(): void {
  injectStyle(MOBILE_CSS, MOBILE_STYLE_ID);
}

function findAccountDrawer(): HTMLElement | null {
  for (const selector of DRAWER_SELECTORS) {
    const candidates = document.querySelectorAll<HTMLElement>(selector);
    for (const candidate of candidates) {
      if (
        candidate.querySelector(
          'a[href="/logout"], a[data-testid="logout"], a[href="/settings"], a[href="/i/bookmarks"]'
        )
      ) {
        return candidate;
      }
    }
  }
  return null;
}

function findTemplateAnchor(drawer: HTMLElement): HTMLAnchorElement | null {
  for (const selector of DRAWER_TEMPLATE_SELECTORS) {
    const anchor = drawer.querySelector<HTMLAnchorElement>(selector);
    if (anchor) return anchor;
  }
  return null;
}

function createLogoIcon(existingIcon: SVGSVGElement): SVGSVGElement | null {
  const template = document.createElement("template");
  template.innerHTML = BETTERX_LOGO_SVG.trim();
  const next = template.content.firstElementChild as SVGSVGElement | null;
  if (!next) return null;

  for (const attr of ["class", "style", "aria-hidden", "data-testid", "focusable"]) {
    const value = existingIcon.getAttribute(attr);
    if (value !== null) {
      next.setAttribute(attr, value);
    }
  }

  return next;
}

function buildMobileButton(drawer: HTMLElement, onClick: OnClickFn): HTMLElement | null {
  const templateAnchor = findTemplateAnchor(drawer);
  const templateRow = templateAnchor?.parentElement as HTMLElement | null;
  if (!templateRow) return null;

  const row = templateRow.cloneNode(true) as HTMLElement;
  row.id = BUTTON_ID;

  const anchor = row.querySelector<HTMLAnchorElement>("a[href]");
  if (!anchor) return null;

  anchor.setAttribute("href", "#");
  anchor.setAttribute("role", "button");
  anchor.setAttribute("aria-label", "BetterX");
  anchor.setAttribute("title", "BetterX");
  anchor.setAttribute("data-testid", "betterx");
  anchor.removeAttribute("target");
  anchor.removeAttribute("rel");

  anchor.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });

  anchor.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    }
  });

  const icon = row.querySelector("svg");
  if (icon instanceof SVGSVGElement) {
    const replacement = createLogoIcon(icon);
    if (replacement) {
      icon.replaceWith(replacement);
    }
  }

  const label = row.querySelector<HTMLElement>('div[dir="ltr"]');
  if (label) {
    label.textContent = "BetterX";
  }

  return row;
}

function insertMobileButton(drawer: HTMLElement, row: HTMLElement): void {
  const logoutRow = drawer.querySelector(
    'a[href="/logout"], a[data-testid="logout"]'
  )?.parentElement;
  const separatorWrapper = drawer.querySelector('[role="separator"]')?.parentElement;
  if (separatorWrapper?.parentElement) {
    separatorWrapper.parentElement.insertBefore(row, separatorWrapper);
    if (logoutRow?.parentElement) {
      separatorWrapper.insertAdjacentElement("afterend", logoutRow);
    }
    return;
  }

  if (logoutRow?.parentElement) {
    logoutRow.insertAdjacentElement("beforebegin", row);
    return;
  }

  drawer.appendChild(row);
}

function injectMobileNavButton(onClick: OnClickFn): void {
  ensureMobileStyles();

  if (document.getElementById(BUTTON_ID)) return;

  const drawer = findAccountDrawer();
  if (!drawer) return;

  drawer.setAttribute(MOBILE_DRAWER_ATTR, "1");

  const row = buildMobileButton(drawer, onClick);
  if (!row) return;

  insertMobileButton(drawer, row);
}

export function injectNavButton(
  onClick: OnClickFn,
  logoUrl: string,
  platform: Platform = "desktop"
): void {
  if (platform === "android") {
    injectMobileNavButton(onClick);
    return;
  }

  injectDesktopNavButton(onClick, logoUrl);
}

export function removeNavButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
  if (desktopSyncRaf) cancelAnimationFrame(desktopSyncRaf);
  desktopSyncRaf = 0;
  desktopTemplateObserver?.disconnect();
  desktopTemplateObserver = null;
  desktopTemplate = null;
  desktopOnClick = null;

  for (const el of document.querySelectorAll<HTMLElement>(`[${MOBILE_DRAWER_ATTR}="1"]`)) {
    el.removeAttribute(MOBILE_DRAWER_ATTR);
  }
  removeStyle(MOBILE_STYLE_ID);
}

export function ensureNavButton(
  onClick: OnClickFn,
  logoUrl: string,
  platform: Platform = "desktop"
): void {
  if (!document.getElementById(BUTTON_ID)) {
    injectNavButton(onClick, logoUrl, platform);
  }
}

/**
 * Watch for the BetterX nav item being removed by SPA rerenders.
 */
export function watchNavButton(
  onClick: OnClickFn,
  logoUrl: string,
  platform: Platform = "desktop"
): () => void {
  if (platform === "android") {
    ensureMobileStyles();
  }

  let rafId = 0;

  const observer = new MutationObserver(() => {
    if (document.getElementById(BUTTON_ID)) {
      if (platform !== "android") {
        const template = findDesktopTemplateAnchor();
        if (template && template !== desktopTemplate) {
          observeDesktopTemplate(template);
          scheduleDesktopSync();
        }
      }
      return;
    }
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!document.getElementById(BUTTON_ID)) {
        injectNavButton(onClick, logoUrl, platform);
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
    removeNavButton();
  };
}
