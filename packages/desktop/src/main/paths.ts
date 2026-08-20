import { join } from "node:path";
import { app } from "electron";

// ─── BetterX Data Directory ──────────────────────────────────────────────────
// Uses a fixed "BetterX" directory under the OS config/appData path,
// separate from Electron's own userData (cache, cookies, etc.).
//   Linux:   ~/.config/BetterX/
//   macOS:   ~/Library/Application Support/BetterX/
//   Windows: %APPDATA%/BetterX/

export const BETTERX_DIR = join(app.getPath("appData"), "BetterX");
export const THEMES_DIR = join(BETTERX_DIR, "Themes");
