/// <reference types="bun" />
import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createConnection } from "node:net";
import { join } from "node:path";
import { startBridge } from "./bridge.js";
import { callBridge } from "./client.js";

test("real local socket authenticates, bounds commands, revokes access and protects files", async () => {
  const dir = await mkdtemp("/tmp/bx-test-");
  const connectionPath = join(dir, "agent", "connection.json");
  let executions = 0;
  const bridge = await startBridge(connectionPath, async () => {
    executions++;
    return { account: "fixture" };
  });
  try {
    expect((await stat(connectionPath)).mode & 0o777).toBe(0o600);
    expect((await stat(join(dir, "agent"))).mode & 0o777).toBe(0o700);
    expect(await callBridge({ name: "get_status", args: {} }, connectionPath)).toEqual({
      account: "fixture",
    });
    const descriptor = JSON.parse(await readFile(connectionPath, "utf8"));
    const rejected = await new Promise<string>((resolve, reject) => {
      const socket = createConnection(descriptor.socketPath);
      let data = "";
      socket.on("connect", () =>
        socket.write(
          `${JSON.stringify({ token: "wrong", command: { name: "get_status", args: {} } })}\n`
        )
      );
      socket.on("data", (chunk) => {
        data += chunk;
      });
      socket.on("end", () => resolve(data));
      socket.on("error", reject);
    });
    expect(JSON.parse(rejected).ok).toBe(false);
    expect(executions).toBe(1);
    await expect(callBridge({ name: "execute_js", args: {} }, connectionPath)).rejects.toThrow();
    expect(executions).toBe(1);
    await bridge.close();
    await expect(callBridge({ name: "get_status", args: {} }, connectionPath)).rejects.toThrow();
  } finally {
    await bridge.close();
    await rm(dir, { recursive: true, force: true });
  }
});
