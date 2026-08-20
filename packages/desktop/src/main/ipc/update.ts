import { BrowserWindow, ipcMain } from "electron";
import { applyBundleUpdate, checkForBundleUpdate } from "../services/bundle-updater.js";
import { getSetting } from "../services/settings.js";
import { assertTrustedSender } from "./security.js";

// ─── Update IPC Handlers ──────────────────────────────────────────────────────

type UpdateHandlerOptions = {
  managedBundlePath: string;
  onApplied: (remoteHash: string) => void;
};

export function registerUpdateHandlers(options: UpdateHandlerOptions): void {
  ipcMain.handle("update:check-bundle", async (event) => {
    assertTrustedSender(event);
    const currentHash = getSetting("currentHash");
    return checkForBundleUpdate(currentHash);
  });

  ipcMain.handle("update:apply-bundle", async (event, remoteHash: string) => {
    assertTrustedSender(event);
    if (!/^[a-f0-9]{64}$/.test(remoteHash)) throw new Error("Invalid bundle hash");
    await applyBundleUpdate(options.managedBundlePath, remoteHash);
    options.onApplied(remoteHash);

    // Notify all renderers to reload
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("update:bundle-applied");
    }
  });
}
