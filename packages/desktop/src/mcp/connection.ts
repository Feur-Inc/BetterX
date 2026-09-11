import { homedir } from "node:os";
import { join } from "node:path";

export function connectionFile(): string {
  if (process.env.BETTERX_MCP_CONNECTION) return process.env.BETTERX_MCP_CONNECTION;
  const base =
    process.platform === "darwin"
      ? join(homedir(), "Library", "Application Support")
      : process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "BetterX", "agent", "connection.json");
}
