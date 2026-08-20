import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { BrowserWindow, ipcMain, shell } from "electron";
import { THEMES_DIR } from "../paths.js";
import { assertTrustedSender } from "./security.js";

// ─── Theme IPC Handlers ───────────────────────────────────────────────────────

async function ensureThemesDir(): Promise<void> {
  await mkdir(THEMES_DIR, { recursive: true });
}

function validateThemeId(id: unknown): string {
  if (typeof id !== "string" || id !== basename(id) || !/^[a-zA-Z0-9._ -]+\.css$/.test(id)) {
    throw new Error("Invalid theme id");
  }
  return id;
}

export function registerThemeHandlers(): void {
  ipcMain.handle("themes:list", async (event) => {
    assertTrustedSender(event);
    await ensureThemesDir();
    const files = await readdir(THEMES_DIR);
    return files.filter((f) => f.endsWith(".css"));
  });

  ipcMain.handle("themes:read", async (_event, id: string) => {
    assertTrustedSender(_event);
    const validId = validateThemeId(id);
    await ensureThemesDir();
    const filePath = join(THEMES_DIR, validId);
    try {
      return await readFile(filePath, "utf-8");
    } catch {
      return "";
    }
  });

  ipcMain.handle("themes:write", async (_event, id: string, css: string) => {
    assertTrustedSender(_event);
    const validId = validateThemeId(id);
    if (typeof css !== "string" || css.length > 2_000_000) throw new Error("Invalid theme CSS");
    await ensureThemesDir();
    const filePath = join(THEMES_DIR, validId);
    await writeFile(filePath, css, "utf-8");

    // Notify all renderer windows of the change
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("themes:changed", validId, css);
    }
  });

  ipcMain.handle("themes:delete", async (_event, id: string) => {
    assertTrustedSender(_event);
    const validId = validateThemeId(id);
    await ensureThemesDir();
    try {
      await unlink(join(THEMES_DIR, validId));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  });

  ipcMain.handle("themes:openFolder", async (event) => {
    assertTrustedSender(event);
    await ensureThemesDir();
    const error = await shell.openPath(THEMES_DIR);
    if (error) throw new Error(error);
  });
}
