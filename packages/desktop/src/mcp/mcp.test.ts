/// <reference types="bun" />
import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { startBridge } from "./bridge.js";

test("MCP stdio exposes only scoped tools and carries validated requests through the local socket", async () => {
  const dir = await mkdtemp("/tmp/bx-mcp-test-");
  const path = join(dir, "agent", "connection.json");
  let calls = 0;
  const bridge = await startBridge(path, async (command) => {
    calls++;
    return {
      command: command.name,
      posts: [{ id: "123", url: "https://x.com/alice/status/123", text: "Fixture bookmark" }],
    };
  });
  const client = new Client({ name: "betterx-test", version: "1.0.0" });
  const entry = process.env.BETTERX_MCP_TEST_ENTRY;
  const transport = new StdioClientTransport({
    command: entry ? "node" : "bun",
    args: [entry ?? resolve(import.meta.dir, "index.ts")],
    env: { ...process.env, BETTERX_MCP_CONNECTION: path } as Record<string, string>,
  });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "collect_bookmarks",
      "get_status",
      "open_bookmarks",
      "open_thread",
      "read_visible_posts",
      "scroll_feed",
      "search_collected_posts",
    ]);
    const result = await client.callTool({ name: "read_visible_posts", arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          untrustedWebsiteData: true,
          result: {
            command: "read_visible_posts",
            posts: [{ id: "123", url: "https://x.com/alice/status/123", text: "Fixture bookmark" }],
          },
        }),
      },
    ]);
    // SDK may reject with a protocol exception or a tool error; neither may reach Electron.
    const bad = await client
      .callTool({ name: "open_bookmarks", arguments: { code: "document.cookie" } })
      .catch(() => ({ isError: true }));
    expect(bad.isError).toBe(true);
    expect(calls).toBe(1);
    await bridge.close();
    const disabled = await client.callTool({ name: "get_status", arguments: {} });
    expect(disabled.isError).toBe(true);
  } finally {
    await client.close();
    await bridge.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 15_000);
