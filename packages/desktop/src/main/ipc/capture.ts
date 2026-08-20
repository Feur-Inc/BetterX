import { clipboard, ipcMain, nativeImage } from "electron";
import type { BrowserWindow } from "electron";
import { assertTrustedSender } from "./security.js";

// ─── Capture IPC Handlers ─────────────────────────────────────────────────────

export function registerCaptureHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle(
    "capture:element",
    async (event, rect: { x: number; y: number; width: number; height: number }) => {
      assertTrustedSender(event);
      const win = getWin();
      if (!win) throw new Error("Window not available");
      if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) {
        throw new Error("Invalid capture rectangle");
      }
      const bounds = win.getContentBounds();
      if (
        rect.x < 0 ||
        rect.y < 0 ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.x + rect.width > bounds.width ||
        rect.y + rect.height > bounds.height
      ) {
        throw new Error("Capture rectangle is outside the window");
      }

      const captureRect = {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };

      const image = await win.webContents.capturePage(captureRect);
      const dataUrl = image.toDataURL();

      // Also copy to clipboard
      clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));

      return dataUrl;
    }
  );
}
