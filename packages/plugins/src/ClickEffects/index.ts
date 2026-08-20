import { Devs, OptionType, definePlugin, logger } from "@betterx/core";

class ClickEffect {
  private startTime = Date.now();
  constructor(
    public x: number,
    public y: number
  ) {}

  draw(ctx: CanvasRenderingContext2D, color: string): void {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(1, elapsed / 650);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const eased = 1 + c3 * (progress - 1) ** 3 + c1 * (progress - 1) ** 2;
    const radius = eased * 30;
    const alpha = 1 - eased;

    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = applyAlpha(color, alpha);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  isDone(): boolean {
    return Date.now() - this.startTime >= 650;
  }
}

function applyAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && color.length === 7) {
    const r = Number.parseInt(color.slice(1, 3), 16);
    const g = Number.parseInt(color.slice(3, 5), 16);
    const b = Number.parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith("rgba")) {
    return color.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, `rgba($1,$2,$3,${alpha})`);
  }
  if (color.startsWith("rgb")) {
    return color.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/, `rgba($1,$2,$3,${alpha})`);
  }
  return color;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let effects: ClickEffect[] = [];
let raf: number | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;

export default definePlugin({
  name: "ClickEffects",
  description: "Displays animated ripple circles when clicking on the page",
  authors: [Devs.Mopi],
  options: {
    useAccentColor: {
      type: OptionType.BOOLEAN,
      default: true,
      label: "Use accent color",
      description: "Use your X accent color instead of a custom color",
    },
    color: {
      type: OptionType.COLOR,
      default: "#1d9bf0",
      label: "Custom color",
      description: "Only used when accent color is off.",
    },
  },

  start() {
    try {
      canvas = document.createElement("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:9999;";
      document.body.appendChild(canvas);
      ctx = canvas.getContext("2d");

      resizeHandler = (): void => {
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
      };
      window.addEventListener("resize", resizeHandler);

      clickHandler = (e: MouseEvent): void => {
        effects.push(new ClickEffect(e.clientX, e.clientY));
      };
      document.addEventListener("click", clickHandler);

      const store = this.settings.store;
      const render = (): void => {
        const renderContext = ctx;
        if (!renderContext || !canvas) return;
        renderContext.clearRect(0, 0, canvas.width, canvas.height);
        const color = store.useAccentColor
          ? getComputedStyle(document.documentElement)
              .getPropertyValue("--betterx-accentColor")
              .trim() || "#1d9bf0"
          : store.color;
        effects = effects.filter((fx: ClickEffect) => {
          if (fx.isDone()) return false;
          fx.draw(renderContext, color);
          return true;
        });
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
    } catch (err) {
      logger.error("ClickEffects: initialization error", err);
    }
  },

  stop() {
    if (raf !== null) cancelAnimationFrame(raf);
    if (clickHandler) document.removeEventListener("click", clickHandler);
    if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    canvas?.remove();
    canvas = null;
    ctx = null;
    effects = [];
    raf = null;
    clickHandler = null;
    resizeHandler = null;
  },
});
