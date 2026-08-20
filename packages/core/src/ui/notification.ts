import type {
  NotificationAction,
  NotificationOptions,
  NotificationType,
} from "../types/notification.js";

// ─── Notification Manager ─────────────────────────────────────────────────────

type NotificationState = {
  element: HTMLElement;
  timeout: ReturnType<typeof setTimeout> | null;
  startTime: number;
  remainingTime: number;
  paused: boolean;
  progress: boolean;
  duration: number;
};

const CONTAINER_ID = "betterx-notification-container";

export class NotificationManager {
  private container: HTMLElement | null = null;
  private notifications = new Map<string, NotificationState>();
  private counter = 0;
  private _defaultDuration = 5000;

  setDefaultDuration(ms: number): void {
    this._defaultDuration = ms > 0 ? ms : 5000;
  }

  setPosition(pos: "bottom-right" | "bottom-left" | "top-right" | "top-left"): void {
    this.ensureContainer().dataset.position = pos;
  }

  private ensureContainer(): HTMLElement {
    if (this.container && document.body.contains(this.container)) {
      return this.container;
    }
    let el = document.getElementById(CONTAINER_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = CONTAINER_ID;
      el.className = "betterx-notification-container";
      document.body.appendChild(el);
    }
    this.container = el;
    return el;
  }

  show(opts: NotificationOptions): string {
    const id = `bxn-${++this.counter}`;
    const {
      title,
      message,
      type = "info",
      duration = this._defaultDuration,
      progress = true,
      actions = [],
      icon = null,
      html = false,
    } = opts;

    const elOpts: Parameters<NotificationManager["buildElement"]>[1] = {
      message,
      type,
      actions,
      icon: icon ?? null,
      html: html ?? false,
      progress: progress ?? true,
      duration,
    };
    if (title !== undefined) elOpts.title = title;
    const el = this.buildElement(id, elOpts);
    this.ensureContainer().appendChild(el);

    // Entrance animation
    requestAnimationFrame(() => {
      el.classList.add("betterx-notification-show");
    });

    const state: NotificationState = {
      element: el,
      timeout: null,
      startTime: 0,
      remainingTime: duration,
      paused: false,
      progress,
      duration,
    };
    this.notifications.set(id, state);

    if (duration > 0) {
      this.startTimer(id);
      el.addEventListener("mouseenter", () => this.pause(id));
      el.addEventListener("mouseleave", () => this.resume(id));
    }

    return id;
  }

  showInfo(message: string, opts?: Partial<NotificationOptions>): string {
    return this.show({ ...opts, message, type: "info" });
  }

  showSuccess(message: string, opts?: Partial<NotificationOptions>): string {
    return this.show({ ...opts, message, type: "success" });
  }

  showWarning(message: string, opts?: Partial<NotificationOptions>): string {
    return this.show({ ...opts, message, type: "warning" });
  }

  showError(message: string, opts?: Partial<NotificationOptions>): string {
    return this.show({ ...opts, message, type: "error", duration: opts?.duration ?? 0 });
  }

  update(id: string, opts: Partial<NotificationOptions>): boolean {
    const state = this.notifications.get(id);
    if (!state) return false;
    const { element: el } = state;

    if (opts.title !== undefined) {
      const titleEl = el.querySelector(".betterx-notification-title");
      if (titleEl) titleEl.textContent = opts.title;
    }
    if (opts.message !== undefined) {
      const msgEl = el.querySelector(".betterx-notification-message");
      if (msgEl) {
        if (opts.html) msgEl.innerHTML = opts.message;
        else msgEl.textContent = opts.message;
      }
    }
    if (opts.type) {
      el.className = el.className.replace(
        /betterx-notification-\w+/,
        `betterx-notification-${opts.type}`
      );
    }
    if (opts.duration !== undefined) {
      if (state.timeout) clearTimeout(state.timeout);
      state.timeout = null;
      state.duration = opts.duration;
      state.remainingTime = opts.duration;
      state.paused = false;
      if (opts.duration > 0) this.startTimer(id);
    }
    return true;
  }

  remove(id: string): boolean {
    const state = this.notifications.get(id);
    if (!state) return false;
    const { element: el, timeout } = state;
    if (timeout) clearTimeout(timeout);

    el.classList.add("betterx-notification-hide");
    setTimeout(() => {
      el.remove();
      this.notifications.delete(id);
    }, 300);
    return true;
  }

  clearAll(): void {
    for (const id of this.notifications.keys()) this.remove(id);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private startTimer(id: string): void {
    const state = this.notifications.get(id);
    if (!state || state.remainingTime <= 0) return;

    state.startTime = Date.now();
    state.timeout = setTimeout(() => this.remove(id), state.remainingTime);

    if (state.progress) {
      const bar = state.element.querySelector<HTMLElement>(".betterx-notification-progress");
      if (bar) {
        bar.style.width = "100%";
        bar.style.transition = "none";
        void bar.offsetWidth; // force reflow
        bar.style.transition = `width ${state.remainingTime}ms linear`;
        requestAnimationFrame(() => {
          bar.style.width = "0%";
        });
      }
    }
  }

  private pause(id: string): void {
    const state = this.notifications.get(id);
    if (!state || !state.timeout || state.paused) return;

    const elapsed = Date.now() - state.startTime;
    state.remainingTime = Math.max(0, state.remainingTime - elapsed);
    clearTimeout(state.timeout);
    state.timeout = null;
    state.paused = true;

    if (state.progress) {
      const bar = state.element.querySelector<HTMLElement>(".betterx-notification-progress");
      if (bar) {
        const currentWidth = getComputedStyle(bar).width;
        bar.style.transition = "none";
        void bar.offsetWidth;
        bar.style.width = currentWidth;
      }
    }
  }

  private resume(id: string): void {
    const state = this.notifications.get(id);
    if (!state || !state.paused) return;
    state.paused = false;
    if (state.remainingTime > 0) this.startTimer(id);
  }

  private buildElement(
    id: string,
    opts: {
      title?: string;
      message: string;
      type: NotificationType;
      actions: NotificationAction[];
      icon: string | null;
      html: boolean;
      progress: boolean;
      duration: number;
    }
  ): HTMLElement {
    const el = document.createElement("div");
    el.id = id;
    el.className = `betterx-notification betterx-notification-${opts.type}`;

    const iconSvg = this.getIcon(opts.type);
    const closeBtn = `<button class="betterx-notification-close" aria-label="Close">✕</button>`;

    let actionsHtml = "";
    if (opts.actions.length > 0) {
      actionsHtml = `<div class="betterx-notification-actions">${opts.actions
        .map(
          (a, i) =>
            `<button class="betterx-notification-action" data-action-index="${i}">${this.escHtml(a.label)}</button>`
        )
        .join("")}</div>`;
    }

    const progressHtml =
      opts.progress && opts.duration > 0
        ? `<div class="betterx-notification-progress-bar"><div class="betterx-notification-progress"></div></div>`
        : "";

    el.innerHTML = `
      <div class="betterx-notification-icon">${opts.icon ?? iconSvg}</div>
      <div class="betterx-notification-content">
        ${opts.title ? `<h3 class="betterx-notification-title">${this.escHtml(opts.title)}</h3>` : ""}
        <p class="betterx-notification-message">${opts.html ? opts.message : this.escHtml(opts.message)}</p>
        ${actionsHtml}
      </div>
      ${closeBtn}
      ${progressHtml}
    `;

    el.querySelector(".betterx-notification-close")?.addEventListener("click", () =>
      this.remove(id)
    );

    const actionBtns = el.querySelectorAll<HTMLButtonElement>(".betterx-notification-action");
    actionBtns.forEach((btn) => {
      const idx = Number.parseInt(btn.dataset.actionIndex ?? "0", 10);
      btn.addEventListener("click", () => {
        const action = opts.actions[idx];
        if (action) {
          action.callback();
          if (action.autoClose !== false) this.remove(id);
        }
      });
    });

    return el;
  }

  private getIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      info: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
      success: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
      error: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`,
    };
    return icons[type];
  }

  private escHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

// Singleton export
export const notifications = new NotificationManager();
