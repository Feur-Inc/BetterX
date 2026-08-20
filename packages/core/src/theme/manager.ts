import type { IStorage } from "../types/storage.js";
import type { Theme, ThemeStorageState } from "../types/theme.js";
import { logger } from "../utils/logger.js";
import { processCSS } from "./processor.js";

// ─── Theme Manager ────────────────────────────────────────────────────────────

const STYLE_PREFIX = "betterx-theme-";

/**
 * BetterX themes historically overrode X's atomic utility classes by giving
 * every ordinary declaration `!important`. Do this through the parsed CSSOM
 * so multiline declarations, data URLs, nesting, and keyframes remain valid.
 */
export function prioritizeThemeRules(rules: CSSRuleList): void {
  for (const rule of rules) {
    if (rule.type === 1) {
      const declaration = (rule as CSSStyleRule).style;
      for (const property of declaration) {
        if (declaration.getPropertyPriority(property) !== "important") {
          declaration.setProperty(property, declaration.getPropertyValue(property), "important");
        }
      }
    }

    const nestedRules = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules;
    if (nestedRules) prioritizeThemeRules(nestedRules);
  }
}

export class ThemeManager {
  private storage: IStorage;
  private themes: Theme[] = [];
  private unsubscribeStorage: (() => void) | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async initialize(): Promise<void> {
    const [state, ids] = await Promise.all([
      this.storage.getThemeState(),
      this.storage.listThemes(),
    ]);

    // Load CSS for each theme id
    const loaded = (
      await Promise.all(
        ids.map(async (id): Promise<Theme | null> => {
          try {
            const css = await this.storage.readTheme(id);
            return {
              id,
              name: id.replace(/\.css$/i, ""),
              css,
              enabled: state.active.includes(id),
            };
          } catch (err) {
            logger.warn(`ThemeManager: failed to load theme "${id}"`, err);
            return null;
          }
        })
      )
    ).filter((theme): theme is Theme => theme !== null);

    // Respect saved order
    this.themes = this.sortByOrder(loaded, state.order);

    // Apply enabled themes to DOM
    for (const theme of this.themes) {
      if (theme.enabled) {
        this.applyToDom(theme);
      }
    }

    // Listen for external changes (e.g. file watcher in Electron)
    this.unsubscribeStorage = this.storage.onThemeChanged((id, css) => {
      const theme = this.themes.find((t) => t.id === id);
      if (theme) {
        theme.css = css;
        if (theme.enabled) {
          this.applyToDom(theme);
        }
      } else if (css) {
        this.themes.push({ id, name: id.replace(/\.css$/i, ""), css, enabled: false });
        void this.persistState().catch((error) =>
          logger.warn(`ThemeManager: failed to register external theme "${id}"`, error)
        );
      }
    });

    logger.info(`ThemeManager: ${this.themes.length} themes loaded`);
  }

  destroy(): void {
    this.unsubscribeStorage?.();
    this.unsubscribeStorage = null;
    for (const theme of this.themes) this.removeDom(theme.id);
  }

  getAll(): Theme[] {
    return [...this.themes];
  }

  get(id: string): Theme | undefined {
    return this.themes.find((t) => t.id === id);
  }

  async create(name: string, css = ""): Promise<Theme> {
    const id = this.uniqueId(name);
    await this.storage.writeTheme(id, css);

    const externallyRegistered = this.themes.find((theme) => theme.id === id);
    if (externallyRegistered) {
      externallyRegistered.name = name;
      externallyRegistered.css = css;
      return externallyRegistered;
    }

    const theme: Theme = { id, name, css, enabled: false };
    this.themes.push(theme);
    await this.persistState();
    return theme;
  }

  async update(id: string, css: string): Promise<void> {
    const theme = this.themes.find((t) => t.id === id);
    if (!theme) return;

    await this.storage.writeTheme(id, css);
    theme.css = css;

    if (theme.enabled) {
      this.applyToDom(theme);
    }
  }

  async delete(id: string): Promise<void> {
    const idx = this.themes.findIndex((t) => t.id === id);
    if (idx === -1) return;

    this.removeDom(id);
    this.themes.splice(idx, 1);
    await this.storage.deleteTheme(id);
    await this.persistState();
  }

  async toggle(id: string): Promise<void> {
    const theme = this.themes.find((t) => t.id === id);
    if (!theme) return;

    theme.enabled = !theme.enabled;

    if (theme.enabled) {
      this.applyToDom(theme);
    } else {
      this.removeDom(id);
    }

    await this.persistState();
  }

  async reorder(ids: string[]): Promise<void> {
    const map = new Map(this.themes.map((t) => [t.id, t]));
    const reordered = ids.map((id) => map.get(id)).filter((t): t is Theme => t !== undefined);
    const included = new Set(reordered.map((theme) => theme.id));
    this.themes = [...reordered, ...this.themes.filter((theme) => !included.has(theme.id))];

    await this.persistState();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private applyToDom(theme: Theme): void {
    const processed = processCSS(theme.css);
    let style = document.getElementById(STYLE_PREFIX + theme.id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_PREFIX + theme.id;
      document.head.appendChild(style);
    }
    style.textContent = processed;
    try {
      if (style.sheet) prioritizeThemeRules(style.sheet.cssRules);
    } catch (error) {
      logger.warn(`ThemeManager: could not prioritize theme "${theme.id}"`, error);
    }
  }

  private removeDom(id: string): void {
    document.getElementById(STYLE_PREFIX + id)?.remove();
  }

  private async persistState(): Promise<void> {
    const state: ThemeStorageState = {
      order: this.themes.map((t) => t.id),
      active: this.themes.filter((t) => t.enabled).map((t) => t.id),
    };
    await this.storage.setThemeState(state);
  }

  private sortByOrder(themes: Theme[], order: string[]): Theme[] {
    const indexed = new Map(themes.map((t) => [t.id, t]));
    const sorted: Theme[] = [];

    for (const id of order) {
      const t = indexed.get(id);
      if (t) {
        sorted.push(t);
        indexed.delete(id);
      }
    }

    // Append any new themes not in saved order
    for (const t of indexed.values()) {
      sorted.push(t);
    }

    return sorted;
  }

  private uniqueId(name: string): string {
    const base = name
      .trim()
      .replace(/[^a-z0-9_-]/gi, "_")
      .toLowerCase();
    const id = base.endsWith(".css") ? base : `${base}.css`;

    if (!this.themes.some((t) => t.id === id)) return id;

    let n = 1;
    while (this.themes.some((t) => t.id === `${base}_${n}.css`)) n++;
    return `${base}_${n}.css`;
  }
}
