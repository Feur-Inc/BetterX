// ─── Accent Color ─────────────────────────────────────────────────────────────
// X.com stores the user's chosen accent color in IndexedDB:
//   localforage > keyvaluepairs > "device:rweb.settings" > local.themeColor
// The value is a string like "blue500", "purple500", etc.

const ACCENT_CSS_ID = "betterx-accent-color";

const ACCENT_COLORS: Record<string, string> = {
  blue: "#1d9bf0",
  yellow: "#ffd400",
  magenta: "#f91880",
  purple: "#7856ff",
  orange: "#ff7a00",
  green: "#00ba7c",
};

const DEFAULT_COLOR = "#1d9bf0";

function readFromIndexedDB(): Promise<string> {
  return new Promise((resolve) => {
    const req = indexedDB.open("localforage");
    req.onerror = () => resolve(DEFAULT_COLOR);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(["keyvaluepairs"], "readonly");
        const get = tx.objectStore("keyvaluepairs").get("device:rweb.settings");
        get.onerror = () => resolve(DEFAULT_COLOR);
        get.onsuccess = () => {
          const data = get.result as { local?: { themeColor?: string } } | undefined;
          const themeColor = data?.local?.themeColor;
          if (themeColor) {
            const match = themeColor.match(/^([a-z]+)500$/);
            const name = match?.[1];
            if (name && ACCENT_COLORS[name]) {
              resolve(ACCENT_COLORS[name]);
              return;
            }
          }
          resolve(DEFAULT_COLOR);
        };
      } catch {
        resolve(DEFAULT_COLOR);
      }
    };
  });
}

/** Detect X.com's current accent color from IndexedDB. */
export async function detectAccentColor(): Promise<string> {
  try {
    return await readFromIndexedDB();
  } catch {
    return DEFAULT_COLOR;
  }
}

/** Detect if dark mode is active on X.com. */
export function detectThemeMode(): "dark" | "light" | "dim" {
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-background")
    .trim();
  if (bg === "#000000" || bg === "rgb(0, 0, 0)") return "dark";
  if (bg && bg !== "#ffffff" && bg !== "rgb(255, 255, 255)") return "dim";
  return "light";
}

/** Apply the detected accent color as --betterx-accentColor. */
export async function applyAccentColor(): Promise<void> {
  const color = await detectAccentColor();
  let style = document.getElementById(ACCENT_CSS_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = ACCENT_CSS_ID;
    document.head.appendChild(style);
  }
  style.textContent = `:root { --betterx-accentColor: ${color}; }`;
}

/**
 * Watch for accent color changes. Polls IndexedDB every 5 seconds - X.com
 * writes to IndexedDB when the user changes their color, so MutationObserver
 * on html attributes won't catch it.
 */
export function watchAccentColor(callback: (color: string) => void): () => void {
  let lastColor = DEFAULT_COLOR;

  const check = async (): Promise<void> => {
    const current = await detectAccentColor();
    if (current !== lastColor) {
      lastColor = current;
      callback(current);
    }
  };

  void check();
  const id = window.setInterval(() => void check(), 5000);
  return () => window.clearInterval(id);
}
