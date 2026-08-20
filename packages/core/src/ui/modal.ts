import { BETTERX_LOGO_SVG, BETTERX_VERSION } from "../utils/constants.js";
import { injectStyle } from "../utils/dom.js";
import { BETTERX_STYLES } from "./styles.js";
import type { BetterXContext, SettingsTab } from "./tab-registry.js";
import { TabRegistry } from "./tab-registry.js";

// ─── Settings Modal ───────────────────────────────────────────────────────────

const STYLE_ID = "betterx-ui-styles";
const OVERLAY_ID = "betterx-modal-overlay";

let _instance: SettingsModal | null = null;
export function getSettingsModal(): SettingsModal | null {
  return _instance;
}

export class SettingsModal {
  private ctx: BetterXContext;
  private overlay: HTMLElement | null = null;
  private activeTabId: string | null = null;
  private initialized = new Set<string>();
  private _closeCallbacks: (() => void)[] = [];
  private _closeInterceptor: (() => boolean | undefined) | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  setCloseInterceptor(fn: (() => boolean | undefined) | null): void {
    this._closeInterceptor = fn;
  }

  constructor(ctx: BetterXContext) {
    this.ctx = ctx;
    _instance = this;
    injectStyle(BETTERX_STYLES, STYLE_ID);
  }

  hide(): void {
    if (this.overlay) this.overlay.style.display = "none";
  }
  show(): void {
    if (this.overlay) this.overlay.style.display = "";
    else this.open();
  }

  onClose(cb: () => void): () => void {
    this._closeCallbacks.push(cb);
    return () => {
      this._closeCallbacks = this._closeCallbacks.filter((c) => c !== cb);
    };
  }

  open(): void {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = this.buildModalHTML();
    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Close on overlay click (interceptor can cancel)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Close on Escape (interceptor can cancel)
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.close();
      }
    };
    document.addEventListener("keydown", this.keydownHandler);

    // Close button
    overlay.querySelector(".betterx-modal-close")?.addEventListener("click", () => this.close());

    // Tab buttons
    const tabs = TabRegistry.getTabs();
    const tabBtns = overlay.querySelectorAll<HTMLButtonElement>(".betterx-tab");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.tabId;
        if (id) this.activateTab(id);
      });
    });

    // Activate first tab
    if (tabs.length > 0 && tabs[0]) {
      this.activateTab(tabs[0].id);
    }
  }

  close(force = false): boolean {
    if (!force && this._closeInterceptor?.() === false) return false;
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    this.overlay?.remove();
    this.overlay = null;
    this.activeTabId = null;
    this.initialized.clear();
    const cbs = this._closeCallbacks.slice();
    this._closeCallbacks = [];
    for (const cb of cbs) cb();
    return true;
  }

  toggle(): void {
    if (this.overlay) {
      this.close();
    } else {
      this.open();
    }
  }

  activateTab(id: string): void {
    if (!this.overlay) return;
    const tab = TabRegistry.getTab(id);
    if (!tab) return;

    // Update tab button styles
    this.overlay.querySelectorAll<HTMLButtonElement>(".betterx-tab").forEach((btn) => {
      btn.classList.toggle("betterx-tab-active", btn.dataset.tabId === id);
    });

    // Show correct panel
    this.overlay.querySelectorAll<HTMLElement>(".betterx-tab-panel").forEach((panel) => {
      panel.style.display = panel.dataset.tabId === id ? "" : "none";
    });

    const panel = this.overlay.querySelector<HTMLElement>(
      `.betterx-tab-panel[data-tab-id="${id}"]`
    );
    if (!panel) return;

    if (!this.initialized.has(id)) {
      this.initialized.add(id);
      tab.initialize(panel, this.ctx);
    }

    tab.onActivate?.(panel, this.ctx);
    this.activeTabId = id;
  }

  private buildModalHTML(): string {
    const tabs = TabRegistry.getTabs();

    const tabButtons = tabs
      .map(
        (t) => `<button class="betterx-tab" data-tab-id="${t.id}">${this.escHtml(t.name)}</button>`
      )
      .join("");

    const tabPanels = tabs
      .map(
        (t) => `<div class="betterx-tab-panel" data-tab-id="${t.id}" style="display:none;"></div>`
      )
      .join("");

    return `
      <div id="betterx-modal" role="dialog" aria-modal="true" aria-label="BetterX Settings">
        <div class="betterx-modal-header">
          <div class="betterx-modal-title">
            <span class="betterx-modal-title-logo">${BETTERX_LOGO_SVG}</span>
            BetterX Settings
            <span class="betterx-modal-version">v${BETTERX_VERSION}</span>
          </div>
          <button class="betterx-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="betterx-tabs" role="tablist">${tabButtons}</div>
        <div class="betterx-modal-body">${tabPanels}</div>
      </div>
    `;
  }

  private escHtml(str: string): string {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
}
