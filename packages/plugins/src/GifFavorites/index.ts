import { Devs, definePlugin } from "@betterx/core";
import { DOMObserver } from "../SharedObserver/index.js";

const STORAGE_KEY = "xcomGifFavorites";

type GifFavorites = Record<string, string>;

const FAVORITES_GROUP = {
  display_name: "★ Favorites",
  id: "_favorites_",
  thumbnail_images: [{ url: "", width: 0, height: 0, byte_count: 0, still_image_url: "" }],
  original_image: { url: "", width: 0, height: 0, byte_count: 0, still_image_url: "" },
  object_type: "group",
};

function getFavorites(): GifFavorites {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as GifFavorites;
  } catch {
    return {};
  }
}

function saveFavorites(favs: GifFavorites): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

function buildFavoritesResponse(): unknown {
  const favs = getFavorites();
  const items = Object.entries(favs).map(([altText, url]) => ({
    id: `bxfav_${Math.random().toString(36).slice(2)}`,
    object_type: "gif",
    provider: { name: "favorites", display_name: "Favorites", icon_images: [] },
    media: [
      {
        type: "gif",
        url,
        alt_text: altText,
        video_info: { aspect_ratio: [1, 1], duration_millis: 0, variants: [] },
      },
    ],
  }));
  return { data: { timeline: { instructions: [{ type: "TimelineAddEntries", entries: items }] } } };
}

// XHR interception helpers - module-level to avoid `this` binding issues
type PatchedXHR = XMLHttpRequest & { _bxUrl?: string };
// Simplified open signature without overloads, for safe .call() usage
type OpenFn = (
  method: string,
  url: string | URL,
  async?: boolean,
  username?: string | null,
  password?: string | null
) => void;

let origOpen: typeof XMLHttpRequest.prototype.open | null = null;
let origSend: typeof XMLHttpRequest.prototype.send | null = null;

function patchXHR(): void {
  if (origOpen) return; // already patched

  origOpen = XMLHttpRequest.prototype.open;
  origSend = XMLHttpRequest.prototype.send;

  const capturedOpen = origOpen as OpenFn;
  XMLHttpRequest.prototype.open = function (
    this: PatchedXHR,
    ...args: Parameters<typeof XMLHttpRequest.prototype.open>
  ): void {
    this._bxUrl = String(args[1]);
    Reflect.apply(capturedOpen, this, args);
  } as typeof XMLHttpRequest.prototype.open;

  const capturedSend = origSend;
  XMLHttpRequest.prototype.send = function (
    this: PatchedXHR,
    body?: Document | XMLHttpRequestBodyInit | null
  ): void {
    const origOnready = this.onreadystatechange;

    this.onreadystatechange = function (ev: Event) {
      const self = this as PatchedXHR;
      if (self.readyState === 4 && self._bxUrl) {
        if (self._bxUrl.includes("/foundmedia/categories.json")) {
          try {
            const data = JSON.parse(self.responseText) as { data?: { groups?: unknown[] } };
            if (data.data?.groups) {
              data.data.groups.unshift(FAVORITES_GROUP);
              Object.defineProperty(self, "responseText", {
                writable: true,
                value: JSON.stringify(data),
              });
            }
          } catch {
            /* ignore */
          }
        } else if (self._bxUrl.includes("/foundmedia/categories/_favorites_.json")) {
          try {
            Object.defineProperty(self, "responseText", {
              writable: true,
              value: JSON.stringify(buildFavoritesResponse()),
            });
          } catch {
            /* ignore */
          }
        }
      }
      origOnready?.call(this, ev);
    };

    capturedSend.call(this, body);
  };
}

function unpatchXHR(): void {
  if (origOpen) XMLHttpRequest.prototype.open = origOpen;
  if (origSend) XMLHttpRequest.prototype.send = origSend;
  origOpen = null;
  origSend = null;
}

let unsubscribeObserver: (() => void) | null = null;
const positionedParents = new Map<HTMLElement, string>();

function injectStars(): void {
  document
    .querySelectorAll<HTMLImageElement>('img[alt][src*="tenor.com"], img[alt][src*="giphy.com"]')
    .forEach((img) => {
      if (img.parentElement?.querySelector("[data-bx-gif-star]")) return;
      const btn = document.createElement("button");
      btn.dataset.bxGifStar = "1";
      const favs = getFavorites();
      btn.textContent = favs[img.alt ?? ""] ? "★" : "☆";
      btn.style.cssText =
        "position:absolute;top:4px;right:4px;z-index:100;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:1;padding:0;";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const f = getFavorites();
        const key = img.alt ?? img.src;
        if (f[key]) {
          delete f[key];
          btn.textContent = "☆";
        } else {
          f[key] = img.src;
          btn.textContent = "★";
        }
        saveFavorites(f);
      });
      const parent = img.parentElement;
      if (parent) {
        if (!positionedParents.has(parent)) positionedParents.set(parent, parent.style.position);
        parent.style.position = "relative";
        parent.appendChild(btn);
      }
    });
}

export default definePlugin({
  name: "GifFavorites",
  description: "Add a favorites category to the GIF picker (like Discord)",
  authors: [Devs.Mopi, Devs.TPM28],
  dependencies: ["SharedObserver"],
  requiresRestart: true,

  start() {
    patchXHR();

    unsubscribeObserver = DOMObserver.subscribe(injectStars);
    injectStars();
  },

  stop() {
    unpatchXHR();
    unsubscribeObserver?.();
    unsubscribeObserver = null;
    document.querySelectorAll("[data-bx-gif-star]").forEach((el) => el.remove());
    for (const [parent, position] of positionedParents) parent.style.position = position;
    positionedParents.clear();
  },
});
