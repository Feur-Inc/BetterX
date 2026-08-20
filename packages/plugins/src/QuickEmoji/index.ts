import { Devs, OptionType, definePlugin, injectStyle, removeStyle } from "@betterx/core";
import { gemoji, nameToEmoji } from "gemoji";

// ─── Emoji search index built from gemoji ─────────────────────────────────────
// Each entry maps a searchable name to its emoji character.
// gemoji provides `names` (aliases) and `tags` for each emoji.

type EmojiEntry = { name: string; emoji: string; tags: string[] };

const emojiEntries: EmojiEntry[] = [];
for (const g of gemoji) {
  for (const name of g.names) {
    emojiEntries.push({ name, emoji: g.emoji, tags: g.tags });
  }
}

/** Search emojis by prefix, returns up to `limit` results */
function searchEmoji(query: string, limit: number): [string, string][] {
  const q = query.toLowerCase();
  const results: [string, string][] = [];
  const seen = new Set<string>();

  const add = (name: string, emoji: string): boolean => {
    const key = `${name}:${emoji}`;
    if (seen.has(key)) return false;
    seen.add(key);
    results.push([name, emoji]);
    return results.length >= limit;
  };

  // Exact name match first
  const exact = nameToEmoji[q];
  if (exact && add(q, exact)) return results;

  // Prefix matches on names
  for (const entry of emojiEntries) {
    if (results.length >= limit) break;
    if (entry.name === q) continue;
    if (entry.name.startsWith(q)) add(entry.name, entry.emoji);
  }

  // Contains matches on names
  if (results.length < limit) {
    for (const entry of emojiEntries) {
      if (results.length >= limit) break;
      if (entry.name.startsWith(q) || entry.name === q) continue;
      if (entry.name.includes(q)) add(entry.name, entry.emoji);
    }
  }

  // Tag matches (if still room)
  if (results.length < limit) {
    for (const entry of emojiEntries) {
      if (results.length >= limit) break;
      if (entry.tags.some((t) => t.startsWith(q) || t.includes(q))) {
        add(entry.name, entry.emoji);
      }
    }
  }

  return results;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const STYLE_ID = "bx-quick-emoji-styles";
const CSS = `
.bx-emoji-dropdown {
  position: fixed;
  z-index: 10001;
  background: var(--bx-emoji-bg, #15202b);
  border: 1px solid var(--bx-emoji-border, #38444d);
  border-radius: 12px;
  padding: 4px 0;
  min-width: 220px;
  max-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: none;
  overflow: hidden;
}
.bx-emoji-dropdown[data-visible="true"] {
  display: block;
}
.bx-emoji-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
  color: var(--bx-emoji-text, #e7e9ea);
  transition: background 0.1s;
  user-select: none;
}
.bx-emoji-item[data-selected="true"] {
  background: var(--bx-emoji-hover, rgba(239, 243, 244, 0.1));
}
.bx-emoji-item:hover {
  background: var(--bx-emoji-hover, rgba(239, 243, 244, 0.1));
}
.bx-emoji-char {
  font-size: 20px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}
.bx-emoji-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bx-emoji-name-match {
  color: var(--bx-emoji-accent, #1d9bf0);
  font-weight: 600;
}
.bx-emoji-hint {
  font-size: 11px;
  color: var(--bx-emoji-hint-color, #71767b);
  padding: 4px 14px 6px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--bx-emoji-border, #38444d);
  margin-top: 2px;
}
.bx-emoji-hint kbd {
  background: var(--bx-emoji-hover, rgba(239, 243, 244, 0.1));
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: inherit;
}
`;

// ─── Plugin state ─────────────────────────────────────────────────────────────

let dropdown: HTMLDivElement | null = null;
let selectedIndex = 0;
let currentResults: [string, string][] = [];
let currentQuery = "";
let cleanupFns: (() => void)[] = [];
let activeComposer: HTMLElement | null = null;
let maxResults = 7;

function detectThemeColors(): void {
  const bg = getComputedStyle(document.body).backgroundColor;
  // Rough luminance check to determine light vs dark
  const match = bg.match(/\d+/g);
  if (match && match.length >= 3) {
    const [r, g, b] = match.map(Number) as [number, number, number];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const root = dropdown;
    if (!root) return;
    if (lum > 0.5) {
      // Light theme
      root.style.setProperty("--bx-emoji-bg", "#ffffff");
      root.style.setProperty("--bx-emoji-border", "#cfd9de");
      root.style.setProperty("--bx-emoji-text", "#0f1419");
      root.style.setProperty("--bx-emoji-hover", "rgba(15, 20, 25, 0.06)");
      root.style.setProperty("--bx-emoji-hint-color", "#536471");
    } else {
      // Dark theme
      root.style.setProperty("--bx-emoji-bg", "#15202b");
      root.style.setProperty("--bx-emoji-border", "#38444d");
      root.style.setProperty("--bx-emoji-text", "#e7e9ea");
      root.style.setProperty("--bx-emoji-hover", "rgba(239, 243, 244, 0.1)");
      root.style.setProperty("--bx-emoji-hint-color", "#71767b");
    }
  }
}

function createDropdown(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "bx-emoji-dropdown";
  el.setAttribute("data-visible", "false");
  document.body.appendChild(el);
  return el;
}

function renderResults(query: string, results: [string, string][]): void {
  if (!dropdown) return;
  currentResults = results;
  currentQuery = query;
  selectedIndex = 0;

  if (results.length === 0) {
    dropdown.setAttribute("data-visible", "false");
    return;
  }

  const itemsHtml = results
    .map(([name, char], i) => {
      // Highlight the matching portion
      const idx = name.indexOf(query);
      let nameHtml: string;
      if (idx >= 0) {
        const before = name.slice(0, idx);
        const matched = name.slice(idx, idx + query.length);
        const after = name.slice(idx + query.length);
        nameHtml = `${before}<span class="bx-emoji-name-match">${matched}</span>${after}`;
      } else {
        nameHtml = name;
      }

      return `<div class="bx-emoji-item" data-index="${i}" data-selected="${i === 0}">
      <span class="bx-emoji-char">${char}</span>
      <span class="bx-emoji-name">:${nameHtml}:</span>
    </div>`;
    })
    .join("");

  const hintHtml = `<div class="bx-emoji-hint">
    <span><kbd>↑↓</kbd> navigate</span>
    <span><kbd>Tab</kbd> / <kbd>Enter</kbd> select</span>
    <span><kbd>Esc</kbd> close</span>
  </div>`;

  dropdown.innerHTML = itemsHtml + hintHtml;
  dropdown.setAttribute("data-visible", "true");
  detectThemeColors();

  // Click handlers on items
  dropdown.querySelectorAll<HTMLDivElement>(".bx-emoji-item").forEach((item) => {
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number.parseInt(item.dataset.index ?? "0", 10);
      insertEmoji(idx);
    });
  });
}

function updateSelection(newIndex: number): void {
  if (!dropdown || currentResults.length === 0) return;
  selectedIndex =
    ((newIndex % currentResults.length) + currentResults.length) % currentResults.length;
  dropdown.querySelectorAll<HTMLDivElement>(".bx-emoji-item").forEach((item, i) => {
    item.setAttribute("data-selected", String(i === selectedIndex));
  });
  // Scroll selected item into view
  const selected = dropdown.querySelector<HTMLDivElement>('[data-selected="true"]');
  selected?.scrollIntoView({ block: "nearest" });
}

function hideDropdown(): void {
  dropdown?.setAttribute("data-visible", "false");
  currentResults = [];
  currentQuery = "";
  selectedIndex = 0;
}

function positionDropdown(composer: HTMLElement): void {
  if (!dropdown) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) {
    // Fallback: position above composer
    const rect = composer.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    dropdown.style.top = "auto";
    return;
  }

  const range = sel.getRangeAt(0);
  const caretRect = range.getBoundingClientRect();

  // Position above the caret
  const dropdownHeight = dropdown.offsetHeight || 240;
  let top = caretRect.top - dropdownHeight - 8;
  let left = caretRect.left;

  // If it would go above the viewport, show below instead
  if (top < 8) {
    top = caretRect.bottom + 8;
  }
  // Ensure it doesn't go off-screen right
  if (left + 300 > window.innerWidth) {
    left = window.innerWidth - 310;
  }
  if (left < 8) left = 8;

  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${left}px`;
  dropdown.style.bottom = "auto";
}

/** Find the `:query` text before the caret in the active element */
function getColonQuery(el: HTMLElement): string | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? "";
  const offset = range.startOffset;
  const before = text.slice(0, offset);
  // Match :shortcode pattern at end - at least 2 chars after colon
  const match = before.match(/:([a-z0-9_]{2,})$/);
  if (!match || !match[1]) return null;
  return match[1];
}

/** Delete the `:query` text before the caret and insert the emoji using execCommand */
function insertEmoji(index: number): void {
  const result = currentResults[index];
  if (!result || !activeComposer) return;
  const [, emojiChar] = result;
  const query = currentQuery;

  activeComposer.focus();

  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return;

  const text = node.textContent ?? "";
  const offset = range.startOffset;
  const before = text.slice(0, offset);
  const colonIdx = before.lastIndexOf(":");
  if (colonIdx === -1) return;

  // Select the `:query` text
  range.setStart(node, colonIdx);
  range.setEnd(node, offset);
  sel.removeAllRanges();
  sel.addRange(range);

  // Use execCommand to keep React/Draft.js state in sync
  document.execCommand("insertText", false, `${emojiChar} `);

  hideDropdown();
}

function attachToComposer(composer: HTMLElement): void {
  if (composer.dataset.bxEmoji) return;
  composer.dataset.bxEmoji = "1";

  const checkQuery = (): void => {
    activeComposer = composer;
    const query = getColonQuery(composer);
    if (!query) {
      hideDropdown();
      return;
    }
    const results = searchEmoji(query, maxResults);
    renderResults(query, results);
    positionDropdown(composer);
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (currentResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      updateSelection(selectedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateSelection(selectedIndex - 1);
    } else if (e.key === "Tab" || e.key === "Enter") {
      if (currentResults.length > 0 && dropdown?.getAttribute("data-visible") === "true") {
        e.preventDefault();
        e.stopPropagation();
        insertEmoji(selectedIndex);
      }
    } else if (e.key === "Escape") {
      hideDropdown();
    }
  };

  // Re-check after every keyup too - Draft.js sometimes doesn't fire input on backspace
  const onKeyup = (): void => {
    checkQuery();
  };
  const onBlur = (): void => {
    hideDropdown();
  };

  composer.addEventListener("input", checkQuery);
  composer.addEventListener("keyup", onKeyup);
  composer.addEventListener("keydown", onKeydown, true);
  composer.addEventListener("blur", onBlur);
  cleanupFns.push(() => {
    composer.removeEventListener("input", checkQuery);
    composer.removeEventListener("keyup", onKeyup);
    composer.removeEventListener("keydown", onKeydown, true);
    composer.removeEventListener("blur", onBlur);
    delete composer.dataset.bxEmoji;
  });
}

// ─── Plugin definition ────────────────────────────────────────────────────────

export default definePlugin({
  name: "QuickEmoji",
  description: "Type :emoji_name: to search and insert emojis - Discord-style autocomplete",
  authors: [Devs.Mopi],
  options: {
    maxResults: {
      type: OptionType.NUMBER,
      default: 7,
      min: 1,
      max: 15,
      label: "Max suggestions",
      description: "Maximum number of emoji suggestions to show (1-15)",
      onChange(value) {
        maxResults = Number(value);
      },
    },
  },

  start() {
    maxResults = this.settings.store.maxResults;
    injectStyle(CSS, STYLE_ID);
    dropdown = createDropdown();

    // Close dropdown on outside clicks
    const onClickOutside = (e: MouseEvent): void => {
      if (dropdown && !dropdown.contains(e.target as Node)) {
        hideDropdown();
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    cleanupFns.push(() => document.removeEventListener("mousedown", onClickOutside));

    // Observe for tweet composers appearing
    const tryAttach = (): void => {
      document
        .querySelectorAll<HTMLElement>(
          '[data-testid="tweetTextarea_0"], [data-testid="tweetTextarea_1"], [data-testid="dmComposerTextInput"]'
        )
        .forEach(attachToComposer);
    };

    const observer = new MutationObserver(tryAttach);
    observer.observe(document.body, { childList: true, subtree: true });
    cleanupFns.push(() => observer.disconnect());
    tryAttach();
  },

  stop() {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    hideDropdown();
    dropdown?.remove();
    dropdown = null;
    activeComposer = null;
    removeStyle(STYLE_ID);
  },
});
