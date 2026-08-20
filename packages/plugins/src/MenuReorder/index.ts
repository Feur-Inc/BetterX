import { Devs, definePlugin, injectStyle, removeStyle } from "@betterx/core";
import { DOMObserver } from "../SharedObserver/index.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "betterx_menu_order";
const HIDDEN_KEY = "betterx_menu_hidden";
const DEFAULT_KEY = "betterx_menu_default";
const STYLE_ID = "bx-menu-reorder-styles";
const ATTR = "data-bx-reorder";

/** Multiple selectors to find the primary nav, matching core/button.ts strategy. */
const NAV_SELECTORS = [
  'nav[aria-label="Primary"]',
  '[data-testid="AppTabBar_Home_Link"]',
  'a[href="/home"]',
];

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
/* Drag feedback */
[${ATTR}] > [draggable="true"] {
  cursor: grab;
  transition: opacity 0.15s, transform 0.15s;
}
[${ATTR}] > [draggable="true"]:active {
  cursor: grabbing;
}
[${ATTR}] > .bx-dragging {
  opacity: 0.4;
  transform: scale(0.97);
}
[${ATTR}] > .bx-drag-above {
  box-shadow: 0 -2px 0 0 var(--bx-reorder-accent, #1d9bf0);
}
[${ATTR}] > .bx-drag-below {
  box-shadow: 0 2px 0 0 var(--bx-reorder-accent, #1d9bf0);
}
[${ATTR}] > .bx-hidden-item {
  display: none !important;
}

/* Context menu */
.bx-reorder-ctx {
  position: fixed;
  z-index: 10002;
  background: var(--bx-reorder-ctx-bg, #15202b);
  border: 1px solid var(--bx-reorder-ctx-border, #38444d);
  border-radius: 12px;
  padding: 4px;
  min-width: 180px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.bx-reorder-ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--bx-reorder-ctx-text, #e7e9ea);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
}
.bx-reorder-ctx-item:hover {
  background: var(--bx-reorder-ctx-hover, rgba(239, 243, 244, 0.1));
}
.bx-reorder-ctx-item.bx-danger {
  color: #f4212e;
}
.bx-reorder-ctx-sep {
  height: 1px;
  background: var(--bx-reorder-ctx-border, #38444d);
  margin: 4px 8px;
}
`;

// ─── State ────────────────────────────────────────────────────────────────────

let unsubscribeObserver: (() => void) | null = null;
let cleanupFns: (() => void)[] = [];
let hiddenIds: Set<string> = new Set();
let currentNav: HTMLElement | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get a stable identifier for a nav item.
 *  The item itself may be an <a> or <button>, so check attributes on the element
 *  first before searching children. */
function getItemId(el: HTMLElement): string {
  // Direct attributes (current Twitter layout: <a href="..."> or <button data-testid="...">)
  for (const attribute of ["href", "data-testid", "aria-label"]) {
    const value = el.getAttribute(attribute);
    if (value) return value;
  }
  // Child search fallback (older layouts with <li> wrappers)
  const link = el.querySelector("a[href]");
  if (link) return link.getAttribute("href") ?? "";
  const testId = el.querySelector("[data-testid]");
  if (testId) return testId.getAttribute("data-testid") ?? "";
  const label = el.querySelector("[aria-label]");
  if (label) return label.getAttribute("aria-label") ?? "";
  return "";
}

function findNav(): HTMLElement | null {
  for (const sel of NAV_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    // First selector targets the nav directly, others target children
    if (sel === NAV_SELECTORS[0]) return el;
    // Walk up to find the nav/ul parent
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      if (parent.tagName === "NAV") return parent;
      parent = parent.parentElement;
    }
  }
  return null;
}

/** BetterX nav button ID - skip this when collecting reorderable items. */
const BX_NAV_BTN_ID = "betterx-nav-btn";

function getNavItems(nav: HTMLElement): HTMLElement[] {
  // Current Twitter layout: direct <a> and <button> children inside <nav>.
  // Older layout: <ul> > <li> children.
  const list = nav.querySelector("ul") ?? nav;
  return Array.from(list.children).filter((el): el is HTMLElement => {
    if (!(el instanceof HTMLElement)) return false;
    // Skip the BetterX nav button
    if (el.id === BX_NAV_BTN_ID) return false;
    // Accept <a>, <button>, or <li> (covers both old and new layouts)
    return el.tagName === "A" || el.tagName === "BUTTON" || el.tagName === "LI";
  });
}

function getSavedOrder(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveOrder(nav: HTMLElement): void {
  const ids = getNavItems(nav).map(getItemId).filter(Boolean);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function loadHidden(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveHidden(): void {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hiddenIds]));
}

function detectCtxTheme(menu: HTMLElement): void {
  const bg = getComputedStyle(document.body).backgroundColor;
  const match = bg.match(/\d+/g);
  if (match && match.length >= 3) {
    const [r, g, b] = match.map(Number) as [number, number, number];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum > 0.5) {
      menu.style.setProperty("--bx-reorder-ctx-bg", "#ffffff");
      menu.style.setProperty("--bx-reorder-ctx-border", "#cfd9de");
      menu.style.setProperty("--bx-reorder-ctx-text", "#0f1419");
      menu.style.setProperty("--bx-reorder-ctx-hover", "rgba(15, 20, 25, 0.06)");
    }
  }
}

// ─── Context menu ─────────────────────────────────────────────────────────────

function showContextMenu(e: MouseEvent, item: HTMLElement, nav: HTMLElement): void {
  e.preventDefault();
  document.querySelector(".bx-reorder-ctx")?.remove();

  const menu = document.createElement("div");
  menu.className = "bx-reorder-ctx";
  detectCtxTheme(menu);

  // Position ensuring it stays in viewport
  let top = e.clientY;
  let left = e.clientX;
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
  if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
  if (top < 8) top = 8;
  if (left < 8) left = 8;
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  const addItem = (icon: string, label: string, danger: boolean, onClick: () => void): void => {
    const el = document.createElement("div");
    el.className = `bx-reorder-ctx-item${danger ? " bx-danger" : ""}`;
    el.innerHTML = `<span>${icon}</span><span>${label}</span>`;
    el.addEventListener("click", () => {
      menu.remove();
      onClick();
    });
    menu.appendChild(el);
  };

  const addSep = (): void => {
    const sep = document.createElement("div");
    sep.className = "bx-reorder-ctx-sep";
    menu.appendChild(sep);
  };

  const id = getItemId(item);
  const isHidden = hiddenIds.has(id);

  if (isHidden) {
    addItem("👁", "Show this item", false, () => {
      hiddenIds.delete(id);
      saveHidden();
      item.classList.remove("bx-hidden-item");
    });
  } else {
    addItem("🙈", "Hide this item", false, () => {
      hiddenIds.add(id);
      saveHidden();
      item.classList.add("bx-hidden-item");
    });
  }

  addItem("⬆", "Move to top", false, () => {
    const list = item.parentElement;
    if (list) {
      list.insertBefore(item, list.firstElementChild);
      saveOrder(nav);
    }
  });

  addItem("⬇", "Move to bottom", false, () => {
    const list = item.parentElement;
    if (list) {
      list.appendChild(item);
      saveOrder(nav);
    }
  });

  addSep();

  if (hiddenIds.size > 0) {
    addItem("👁", "Show all hidden items", false, () => {
      hiddenIds.clear();
      saveHidden();
      getNavItems(nav).forEach((li) => li.classList.remove("bx-hidden-item"));
    });
  }

  addItem("↩", "Reset menu order", true, () => {
    hiddenIds.clear();
    localStorage.removeItem(HIDDEN_KEY);
    localStorage.removeItem(STORAGE_KEY);
    saveHidden();

    // Reset visibility immediately
    getNavItems(nav).forEach((li) => li.classList.remove("bx-hidden-item"));

    // Reset order immediately if we have a captured default
    const defaultOrderRaw = localStorage.getItem(DEFAULT_KEY);
    if (defaultOrderRaw) {
      try {
        const defaultOrder = JSON.parse(defaultOrderRaw) as string[];
        const list = nav.querySelector("ul") ?? nav;
        const items = getNavItems(nav);
        const byId = new Map(items.map((el) => [getItemId(el), el]));

        for (const id of defaultOrder) {
          const el = byId.get(id);
          if (el) {
            list.appendChild(el);
            byId.delete(id);
          }
        }
        // Any new items not in our captured default go at the bottom
        for (const el of byId.values()) {
          list.appendChild(el);
        }
      } catch (err) {
        console.error("[BetterX] Failed to restore default menu order:", err);
        window.location.reload();
      }
    } else {
      // If we don't have a default yet, we have to reload to get it back
      window.location.reload();
    }
  });

  // Close on outside click
  const close = (ev: MouseEvent): void => {
    if (!menu.contains(ev.target as Node)) {
      menu.remove();
      document.removeEventListener("mousedown", close, true);
    }
  };
  requestAnimationFrame(() => document.addEventListener("mousedown", close, true));
  cleanupFns.push(() => {
    menu.remove();
    document.removeEventListener("mousedown", close, true);
  });
}

// ─── Drag and drop ────────────────────────────────────────────────────────────

function setupReorder(nav: HTMLElement): void {
  const items = getNavItems(nav);
  if (items.length === 0) return;

  // Apply saved order
  const saved = getSavedOrder();
  if (saved.length > 0) {
    const list = nav.querySelector("ul") ?? nav;
    const byId = new Map(items.map((el) => [getItemId(el), el]));
    const sorted: HTMLElement[] = [];
    for (const id of saved) {
      const el = byId.get(id);
      if (el) {
        sorted.push(el);
        byId.delete(id);
      }
    }
    // Append any new/unknown items at the end
    for (const el of byId.values()) sorted.push(el);
    for (const el of sorted) list.appendChild(el);
  } else {
    // If we have no saved order, this IS currently the default order.
    // Update our captured default to stay in sync with Twitter's default.
    const ids = items.map(getItemId).filter(Boolean);
    if (ids.length > 0) {
      localStorage.setItem(DEFAULT_KEY, JSON.stringify(ids));
    }
  }

  // Apply hidden state
  for (const item of items) {
    if (hiddenIds.has(getItemId(item))) {
      item.classList.add("bx-hidden-item");
    }
  }

  // Drag and drop
  let dragged: HTMLElement | null = null;

  for (const item of items) {
    item.setAttribute("draggable", "true");

    const onDragStart = (e: DragEvent): void => {
      dragged = item;
      item.classList.add("bx-dragging");
      // Required for Firefox
      e.dataTransfer?.setData("text/plain", "");
    };

    const onDragEnd = (): void => {
      item.classList.remove("bx-dragging");
      // Clear all indicators
      for (const li of getNavItems(nav)) {
        li.classList.remove("bx-drag-above", "bx-drag-below");
      }
      if (dragged) {
        saveOrder(nav);
        dragged = null;
      }
    };

    const onDragOver = (e: DragEvent): void => {
      e.preventDefault();
      if (!dragged || dragged === item) return;

      // Clear previous indicators
      for (const li of getNavItems(nav)) {
        li.classList.remove("bx-drag-above", "bx-drag-below");
      }

      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        item.classList.add("bx-drag-above");
      } else {
        item.classList.add("bx-drag-below");
      }
    };

    const onDrop = (e: DragEvent): void => {
      e.preventDefault();
      if (!dragged || dragged === item) return;

      const parent = item.parentElement;
      if (!parent) return;

      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        parent.insertBefore(dragged, item);
      } else {
        parent.insertBefore(dragged, item.nextSibling);
      }

      item.classList.remove("bx-drag-above", "bx-drag-below");
    };

    const onDragLeave = (): void => {
      item.classList.remove("bx-drag-above", "bx-drag-below");
    };

    const onContextMenu = (e: MouseEvent): void => showContextMenu(e, item, nav);

    item.addEventListener("dragstart", onDragStart);
    item.addEventListener("dragend", onDragEnd);
    item.addEventListener("dragover", onDragOver);
    item.addEventListener("drop", onDrop);
    item.addEventListener("dragleave", onDragLeave);
    item.addEventListener("contextmenu", onContextMenu);

    cleanupFns.push(() => {
      item.removeEventListener("dragstart", onDragStart);
      item.removeEventListener("dragend", onDragEnd);
      item.removeEventListener("dragover", onDragOver);
      item.removeEventListener("drop", onDrop);
      item.removeEventListener("dragleave", onDragLeave);
      item.removeEventListener("contextmenu", onContextMenu);
      item.removeAttribute("draggable");
      item.classList.remove("bx-dragging", "bx-drag-above", "bx-drag-below", "bx-hidden-item");
    });
  }
}

// ─── Plugin definition ────────────────────────────────────────────────────────

export default definePlugin({
  name: "MenuReorder",
  description: "Drag-and-drop reordering and hiding of navigation menu items",
  authors: [Devs.TPM28, Devs.Mopi],
  dependencies: ["SharedObserver"],
  start() {
    injectStyle(CSS, STYLE_ID);
    hiddenIds = loadHidden();

    const tryInit = (): void => {
      const nav = findNav();
      if (!nav) return;

      // If the nav was already set up and is still the same DOM node, skip
      if (nav === currentNav && nav.hasAttribute(ATTR)) return;

      // If the nav was reconstructed (SPA navigation), clean up old listeners
      if (currentNav && currentNav !== nav) {
        for (const fn of cleanupFns) fn();
        cleanupFns = [];
      }

      nav.setAttribute(ATTR, "1");
      currentNav = nav;
      setupReorder(nav);
    };

    unsubscribeObserver = DOMObserver.subscribe(tryInit);
    tryInit();
  },

  stop() {
    unsubscribeObserver?.();
    unsubscribeObserver = null;
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    document.querySelector(".bx-reorder-ctx")?.remove();
    if (currentNav) {
      currentNav.removeAttribute(ATTR);
      getNavItems(currentNav).forEach((li) => {
        li.classList.remove("bx-hidden-item", "bx-dragging", "bx-drag-above", "bx-drag-below");
      });
    }
    currentNav = null;
    hiddenIds.clear();
    removeStyle(STYLE_ID);
  },
});
