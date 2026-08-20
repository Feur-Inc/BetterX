import { Devs, definePlugin } from "@betterx/core";

let curW = 469;
let curH = 530;
let resizeActive = false;
let isResizing = false;
let resizeType = "";
let startX = 0;
let startY = 0;
let startW = 0;
let startH = 0;

let discoveryObserver: MutationObserver | null = null;
let drawerObserver: MutationObserver | null = null;
let currentDrawer: HTMLElement | null = null;
let style: HTMLStyleElement | null = null;
let wrapper: HTMLDivElement | null = null;
let leftHandle: HTMLDivElement | null = null;
let topHandle: HTMLDivElement | null = null;
let cornerHandle: HTMLDivElement | null = null;

function isOpen(target: HTMLElement): boolean {
  const bubble = target.querySelector<HTMLElement>(".rounded-2xl");
  if (!bubble) return false;
  const h = Number.parseInt(bubble.style.height || "0");
  return h > 100; // 55px = fermé, >100 = ouvert
}

function applySize(w: number, h: number): void {
  curW = w;
  curH = h;
  if (style) {
    style.textContent = `
      [data-testid="chat-drawer-root"] {
        width: ${w}px !important;
        height: ${h}px !important;
        max-width: none !important;
        max-height: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
      }
      [data-testid="chat-drawer-root"] > div > .rounded-2xl {
        width: ${w}px !important;
        height: ${h}px !important;
        max-width: none !important;
        max-height: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }
      [data-testid="chat-drawer-main"] {
        width: ${w}px !important;
        height: ${h}px !important;
        max-width: none !important;
        max-height: none !important;
      }
      [data-testid="dm-container"] {
        width: ${w}px !important;
        height: ${h}px !important;
        max-width: none !important;
        min-width: 0 !important;
      }
      [data-testid="dm-inbox-panel"] {
        width: ${w}px !important;
        min-width: 0 !important;
        max-width: none !important;
        flex-shrink: 0 !important;
      }
      [data-testid="chat-drawer-root"] .min-w-\[400px\] {
        min-width: 0 !important;
      }
      [data-testid="chat-drawer-root"] [data-testid="dm-inbox-panel"] > div {
        height: 100% !important;
        max-height: none !important;
      }
    `;
  }
  if (wrapper) {
    wrapper.style.width = `${w}px`;
    wrapper.style.height = `${h}px`;
  }
}

function clearSize(): void {
  if (style) style.textContent = "";
  if (wrapper) {
    wrapper.style.width = "0px";
    wrapper.style.height = "0px";
  }
}

function enableResize(): void {
  if (resizeActive) return;
  resizeActive = true;
  applySize(curW, curH);
  if (wrapper) wrapper.style.display = "block";
}

function disableResize(): void {
  if (!resizeActive) return;
  resizeActive = false;
  clearSize();
  if (wrapper) wrapper.style.display = "none";
}

function makeHandle(css: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `${css}; pointer-events: all; position: absolute; z-index: 99999;`;
  return el;
}

function startResize(e: MouseEvent, type: string): void {
  if (!resizeActive) return;
  isResizing = true;
  resizeType = type;
  startX = e.clientX;
  startY = e.clientY;
  startW = curW;
  startH = curH;
  e.preventDefault();
  e.stopPropagation();
}

const onMouseMove = (e: MouseEvent): void => {
  if (!isResizing) return;
  const dx = startX - e.clientX;
  const dy = startY - e.clientY;
  let w = curW;
  let h = curH;
  if (resizeType === "left" || resizeType === "corner") w = Math.max(300, startW + dx);
  if (resizeType === "top" || resizeType === "corner") h = Math.max(200, startH + dy);
  applySize(w, h);
};

const onMouseUp = (): void => {
  isResizing = false;
};

export default definePlugin({
  name: "DMDrawerResizer",
  description: "Allows resizing the DM drawer",
  authors: [Devs.TPM28, Devs.Mopi],

  start() {
    style = document.createElement("style");
    style.id = "twitter-resize-style";
    document.head.appendChild(style);

    wrapper = document.createElement("div");
    wrapper.id = "resize-wrapper";
    wrapper.style.cssText = `
      position: fixed;
      bottom: 12px;
      right: 20px;
      width: ${curW}px;
      height: ${curH}px;
      z-index: 99998;
      pointer-events: none;
      display: none;
    `;

    leftHandle = makeHandle("left:-5px; top:10px; bottom:10px; width:10px; cursor:ew-resize;");
    topHandle = makeHandle("top:-5px; left:10px; right:10px; height:10px; cursor:ns-resize;");
    cornerHandle = makeHandle("top:-5px; left:-5px; width:20px; height:20px; cursor:nw-resize;");

    leftHandle.addEventListener("mousedown", (e) => startResize(e, "left"));
    topHandle.addEventListener("mousedown", (e) => startResize(e, "top"));
    cornerHandle.addEventListener("mousedown", (e) => startResize(e, "corner"));

    wrapper.appendChild(leftHandle);
    wrapper.appendChild(topHandle);
    wrapper.appendChild(cornerHandle);
    document.body.appendChild(wrapper);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    const attachDrawer = (target: HTMLElement | null): void => {
      if (target === currentDrawer) return;
      drawerObserver?.disconnect();
      currentDrawer = target;
      if (!target) {
        disableResize();
        return;
      }
      drawerObserver = new MutationObserver(() => {
        if (isOpen(target)) enableResize();
        else disableResize();
      });
      drawerObserver.observe(target, {
        subtree: true,
        attributes: true,
        attributeFilter: ["style"],
      });
      if (isOpen(target)) enableResize();
      else disableResize();
    };

    const findDrawer = (): void => {
      attachDrawer(document.querySelector<HTMLElement>('[data-testid="chat-drawer-root"]'));
    };
    discoveryObserver = new MutationObserver(findDrawer);
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
    findDrawer();
  },

  stop() {
    discoveryObserver?.disconnect();
    discoveryObserver = null;
    drawerObserver?.disconnect();
    drawerObserver = null;
    currentDrawer = null;

    style?.remove();
    style = null;

    wrapper?.remove();
    wrapper = null;

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    resizeActive = false;
    isResizing = false;
  },
});
