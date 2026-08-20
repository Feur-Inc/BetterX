import { Devs, OptionType, definePlugin, proxyImage } from "@betterx/core";

// Oneko - the classic cat that follows your cursor
// Ported from adryd325/oneko.js, MIT license

const THEME_BASE_URL = "https://raw.githubusercontent.com/MCHAMSTERYT2/onekocord/main/onekoskins/";
const DEFAULT_GIF_URL =
  "https://raw.githubusercontent.com/adryd325/oneko.js/c4ee66353b11a44e4a5b7e914a81f8d33111555e/oneko.gif";

const SPRITE_SETS: Record<string, number[][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [
    [-5, 0],
    [-6, 0],
    [-7, 0],
  ],
  scratchWallN: [
    [0, 0],
    [0, -1],
  ],
  scratchWallS: [
    [-7, -1],
    [-6, -2],
  ],
  scratchWallE: [
    [-2, -2],
    [-2, -3],
  ],
  scratchWallW: [
    [-4, 0],
    [-4, -1],
  ],
  tired: [[-3, -2]],
  sleeping: [
    [-2, 0],
    [-2, -1],
  ],
  N: [
    [-1, -2],
    [-1, -3],
  ],
  NE: [
    [0, -2],
    [0, -3],
  ],
  E: [
    [-3, 0],
    [-3, -1],
  ],
  SE: [
    [-5, -1],
    [-5, -2],
  ],
  S: [
    [-6, -3],
    [-7, -2],
  ],
  SW: [
    [-5, -3],
    [-6, -1],
  ],
  W: [
    [-4, -2],
    [-4, -3],
  ],
  NW: [
    [-1, 0],
    [-1, -1],
  ],
};

// Module-level state
let nekoEl: HTMLDivElement | null = null;
let nekoPosX = 32;
let nekoPosY = 32;
let mousePosX = 0;
let mousePosY = 0;
let frameCount = 0;
let idleTime = 0;
let idleAnimation: string | null = null;
let idleAnimationFrame = 0;
let lastFrameTimestamp: number | null = null;
let animationFrameId: number | null = null;
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let nekoSpeed = 10;
let lifecycleGeneration = 0;

function setSprite(name: string, frame: number): void {
  if (!nekoEl) return;
  const sprites = SPRITE_SETS[name];
  if (!sprites) return;
  const coords = sprites[frame % sprites.length] ?? [0, 0];
  nekoEl.style.backgroundPosition = `${(coords[0] ?? 0) * 32}px ${(coords[1] ?? 0) * 32}px`;
}

function resetIdleAnimation(): void {
  idleAnimation = null;
  idleAnimationFrame = 0;
}

function idle(): void {
  idleTime += 1;

  if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation === null) {
    const available = ["sleeping", "scratchSelf"];
    if (nekoPosX < 32) available.push("scratchWallW");
    if (nekoPosY < 32) available.push("scratchWallN");
    if (nekoPosX > window.innerWidth - 32) available.push("scratchWallE");
    if (nekoPosY > window.innerHeight - 32) available.push("scratchWallS");
    idleAnimation = available[Math.floor(Math.random() * available.length)] ?? null;
  }

  switch (idleAnimation) {
    case "sleeping":
      if (idleAnimationFrame < 8) {
        setSprite("tired", 0);
        break;
      }
      setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
      if (idleAnimationFrame > 192) resetIdleAnimation();
      break;
    case "scratchWallN":
    case "scratchWallS":
    case "scratchWallE":
    case "scratchWallW":
    case "scratchSelf":
      setSprite(idleAnimation, idleAnimationFrame);
      if (idleAnimationFrame > 9) resetIdleAnimation();
      break;
    default:
      setSprite("idle", 0);
      return;
  }
  idleAnimationFrame += 1;
}

function frame(nekoSpeed: number): void {
  frameCount += 1;
  const diffX = nekoPosX - mousePosX;
  const diffY = nekoPosY - mousePosY;
  const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

  if (distance < nekoSpeed || distance < 48) {
    idle();
    return;
  }

  idleAnimation = null;
  idleAnimationFrame = 0;

  if (idleTime > 1) {
    setSprite("alert", 0);
    idleTime = Math.min(idleTime, 7);
    idleTime -= 1;
    return;
  }

  let direction = "";
  direction += diffY / distance > 0.5 ? "N" : "";
  direction += diffY / distance < -0.5 ? "S" : "";
  direction += diffX / distance > 0.5 ? "W" : "";
  direction += diffX / distance < -0.5 ? "E" : "";
  setSprite(direction, frameCount);

  nekoPosX -= (diffX / distance) * nekoSpeed;
  nekoPosY -= (diffY / distance) * nekoSpeed;
  nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
  nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

  if (nekoEl) {
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }
}

function onAnimationFrame(timestamp: number): void {
  if (!nekoEl?.isConnected) return;
  if (lastFrameTimestamp === null) lastFrameTimestamp = timestamp;
  if (timestamp - lastFrameTimestamp > 100) {
    lastFrameTimestamp = timestamp;
    frame(nekoSpeed);
  }
  animationFrameId = requestAnimationFrame(onAnimationFrame);
}

export default definePlugin({
  name: "Oneko",
  description: "A cat that follows your cursor around the screen",
  authors: [Devs.Mopi],
  options: {
    speed: {
      type: OptionType.NUMBER,
      default: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Speed",
      description: "Speed multiplier (0.1 – 5).",
      onChange(val) {
        nekoSpeed = 10 * (Number(val) || 1);
      },
    },
    theme: {
      type: OptionType.SELECT,
      default: "default",
      label: "Theme",
      description: "Cat skin.",
      onChange(val) {
        if (!nekoEl) return;
        const rawUrl = val === "default" ? DEFAULT_GIF_URL : `${THEME_BASE_URL}${val}.png`;
        proxyImage(rawUrl).then((url) => {
          if (nekoEl) nekoEl.style.backgroundImage = `url('${url}')`;
        });
      },
      options: [
        { label: "Default", value: "default" },
        { label: "Ace", value: "ace" },
        { label: "Black", value: "black" },
        { label: "Calico", value: "calico" },
        { label: "Fox", value: "fox" },
        { label: "Ghost", value: "ghost" },
        { label: "Gray", value: "gray" },
        { label: "Jess", value: "jess" },
        { label: "Kina", value: "kina" },
        { label: "Lucy", value: "lucy" },
        { label: "Maia", value: "maia" },
        { label: "Mike", value: "mike" },
        { label: "Moka", value: "moka" },
        { label: "Silver", value: "silver" },
        { label: "Silversky", value: "silversky" },
        { label: "Spirit", value: "spirit" },
        { label: "Valentine", value: "valentine" },
      ],
    },
  },

  async start() {
    const generation = ++lifecycleGeneration;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const speed = this.settings.store.speed;
    const theme = this.settings.store.theme;
    nekoSpeed = 10 * (Number(speed) || 1);
    const rawUrl = theme === "default" ? DEFAULT_GIF_URL : `${THEME_BASE_URL}${theme}.png`;
    const bgUrl = await proxyImage(rawUrl);
    if (generation !== lifecycleGeneration) return;

    const el = document.createElement("div");
    el.id = "betterx-oneko";
    el.ariaHidden = "true";
    el.style.cssText = `
      width:32px;height:32px;
      position:fixed;pointer-events:none;z-index:2147483647;
      image-rendering:pixelated;
      background-image:url('${bgUrl}');
      left:${nekoPosX - 16}px;top:${nekoPosY - 16}px;
    `;
    document.body.appendChild(el);
    nekoEl = el;

    // Reset state
    nekoPosX = 32;
    nekoPosY = 32;
    frameCount = 0;
    idleTime = 0;
    idleAnimation = null;
    idleAnimationFrame = 0;
    lastFrameTimestamp = null;

    mouseMoveHandler = (e: MouseEvent): void => {
      mousePosX = e.clientX;
      mousePosY = e.clientY;
    };
    document.addEventListener("mousemove", mouseMoveHandler);

    animationFrameId = requestAnimationFrame(onAnimationFrame);
  },

  stop() {
    lifecycleGeneration++;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    nekoEl?.remove();
    nekoEl = null;
    if (mouseMoveHandler) {
      document.removeEventListener("mousemove", mouseMoveHandler);
      mouseMoveHandler = null;
    }
    lastFrameTimestamp = null;
  },
});
