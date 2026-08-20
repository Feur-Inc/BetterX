import { ipcMain } from "electron";
import { updateActivity } from "../services/discord-rpc.js";
import { getSetting } from "../services/settings.js";
import { assertTrustedSender } from "./security.js";

// ─── Discord RPC IPC Handlers ────────────────────────────────────────────────

export function registerDiscordRPCHandlers(): void {
  ipcMain.on("discord-rpc:update-activity", (event, details: string, state: string) => {
    assertTrustedSender(event);
    if (!getSetting("enableDiscordRPC")) return;
    if (
      typeof details !== "string" ||
      typeof state !== "string" ||
      details.length > 128 ||
      state.length > 128
    ) {
      return;
    }
    void updateActivity(details, state);
  });
}
