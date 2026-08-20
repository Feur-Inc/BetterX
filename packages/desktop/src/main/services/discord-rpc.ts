import { logger } from "@betterx/core";
import { Client } from "@xhayper/discord-rpc";

// ─── Discord RPC Service ─────────────────────────────────────────────────────

const CLIENT_ID = "1339350764929290270";
const ASSET_KEY = "betterx_logo";

let client: Client | null = null;
let connected = false;
let lastDetails = "";
let lastState = "";

export async function initializeDiscordRPC(): Promise<void> {
  if (client) return;

  client = new Client({ clientId: CLIENT_ID });

  client.on("ready", async () => {
    connected = true;
    logger.info("[Discord RPC] Connected");
    await setActivity("Browsing X", "");
  });

  try {
    await client.login();
  } catch (err) {
    logger.warn("[Discord RPC] Failed to connect:", err);
    client = null;
  }
}

export async function destroyDiscordRPC(): Promise<void> {
  if (!client) return;
  try {
    await client.destroy();
  } catch {
    // ignore - process is likely exiting
  }
  client = null;
  connected = false;
  lastDetails = "";
  lastState = "";
  logger.info("[Discord RPC] Disconnected");
}

export async function updateActivity(details: string, state: string): Promise<void> {
  const d = clamp(details, 128);
  const s = clamp(state, 128);

  // Dedup - don't send identical updates
  if (d === lastDetails && s === lastState) return;
  lastDetails = d;
  lastState = s;

  await setActivity(d, s);
}

async function setActivity(details: string, state: string): Promise<void> {
  if (!client || !connected) return;
  try {
    await client.user?.setActivity({
      ...(details ? { details } : {}),
      ...(state ? { state } : {}),
      largeImageKey: ASSET_KEY,
      largeImageText: "BetterX",
      startTimestamp: Date.now(),
    });
  } catch (err) {
    logger.warn("[Discord RPC] Failed to set activity:", err);
  }
}

function clamp(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 1)}\u2026` : str;
}
