import { Devs, OptionType, definePlugin } from "@betterx/core";

let magStyle: HTMLStyleElement | null = null;
let magEl: HTMLDivElement | null = null;
let magIsActive = false;
let magZoom = 2;
let magSize = 150;
let magCurrentImg: HTMLImageElement | null = null;
let magOnMouseMove: ((e: MouseEvent) => void) | null = null;
let magOnMouseDown: ((e: MouseEvent) => void) | null = null;
let magOnMouseUp: (() => void) | null = null;
let magOnWheel: ((e: WheelEvent) => void) | null = null;
let magPersistTimer: ReturnType<typeof setTimeout> | null = null;

function updateMagnifier(e: MouseEvent): void {
  if (!magIsActive || !magEl || !magCurrentImg) return;
  const rect = magCurrentImg.getBoundingClientRect();
  const rx = e.clientX - rect.left;
  const ry = e.clientY - rect.top;
  const bgX = -rx * magZoom + magSize / 2;
  const bgY = -ry * magZoom + magSize / 2;

  magEl.style.left = `${e.clientX - magSize / 2}px`;
  magEl.style.top = `${e.clientY - magSize / 2}px`;
  magEl.style.backgroundImage = `url('${magCurrentImg.src}')`;
  magEl.style.backgroundSize = `${rect.width * magZoom}px ${rect.height * magZoom}px`;
  magEl.style.backgroundPosition = `${bgX}px ${bgY}px`;
}

export default definePlugin({
  name: "ImageMagnifier",
  description: "Adds a magnifying glass feature to images for detailed viewing",
  authors: [Devs.Mopi],
  options: {
    defaultZoom: {
      type: OptionType.NUMBER,
      default: 2,
      min: 1,
      max: 6,
      step: 0.1,
      label: "Default zoom level",
      description: "Default zoom level (1–6)",
    },
    magnifierSize: {
      type: OptionType.NUMBER,
      default: 150,
      min: 50,
      max: 400,
      label: "Magnifier size (px)",
      description: "Default magnifier size in pixels (50–400)",
    },
  },

  start() {
    magZoom = this.settings.store.defaultZoom;
    magSize = this.settings.store.magnifierSize;

    const style = document.createElement("style");
    style.textContent = `.bx-magnifier{position:fixed;border:2px solid #333;border-radius:50%;pointer-events:none;display:none;background-repeat:no-repeat;z-index:10000;overflow:hidden;}[data-testid="swipe-to-dismiss"] img{user-select:none;-webkit-user-drag:none;}`;
    document.head.appendChild(style);
    magStyle = style;

    const mag = document.createElement("div");
    mag.className = "bx-magnifier";
    document.body.appendChild(mag);
    magEl = mag;

    magOnMouseMove = (e: MouseEvent): void => updateMagnifier(e);
    magOnMouseDown = (e: MouseEvent): void => {
      const img = (e.target as HTMLElement).closest<HTMLImageElement>(
        '[data-testid="swipe-to-dismiss"] img'
      );
      if (!img) return;
      e.preventDefault();
      magCurrentImg = img;
      magIsActive = true;
      if (magEl) {
        magEl.style.display = "block";
        magEl.style.width = `${magSize}px`;
        magEl.style.height = `${magSize}px`;
      }
      updateMagnifier(e);
    };
    magOnMouseUp = (): void => {
      magIsActive = false;
      magCurrentImg = null;
      if (magEl) magEl.style.display = "none";
    };
    const settings = this.settings;
    magOnWheel = (e: WheelEvent): void => {
      if (!magIsActive) return;
      e.preventDefault();
      if (e.shiftKey) {
        magSize = Math.min(400, Math.max(50, magSize - e.deltaY));
        settings.store.magnifierSize = magSize;
        if (magEl) {
          magEl.style.width = `${magSize}px`;
          magEl.style.height = `${magSize}px`;
        }
      } else {
        magZoom = Math.min(6, Math.max(1, magZoom - e.deltaY * 0.01));
        settings.store.defaultZoom = magZoom;
      }
      if (magPersistTimer) clearTimeout(magPersistTimer);
      magPersistTimer = setTimeout(() => settings.persist(), 300);
    };

    document.addEventListener("mousedown", magOnMouseDown);
    document.addEventListener("mouseup", magOnMouseUp);
    document.addEventListener("mousemove", magOnMouseMove);
    document.addEventListener("wheel", magOnWheel, { passive: false });
  },

  stop() {
    if (magOnMouseDown) document.removeEventListener("mousedown", magOnMouseDown);
    if (magOnMouseUp) document.removeEventListener("mouseup", magOnMouseUp);
    if (magOnMouseMove) document.removeEventListener("mousemove", magOnMouseMove);
    if (magOnWheel) document.removeEventListener("wheel", magOnWheel);
    magStyle?.remove();
    magEl?.remove();
    magStyle = null;
    magEl = null;
    magIsActive = false;
    magCurrentImg = null;
    magOnMouseMove = null;
    magOnMouseDown = null;
    magOnMouseUp = null;
    magOnWheel = null;
    if (magPersistTimer) clearTimeout(magPersistTimer);
    magPersistTimer = null;
  },
});
