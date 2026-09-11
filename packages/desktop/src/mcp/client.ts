import { lstat, readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { connectionFile } from "./connection.js";
import { MAX_RESPONSE_BYTES, parseCommand } from "./protocol.js";

export async function callBridge(input: unknown, path = connectionFile()): Promise<unknown> {
  const command = parseCommand(input);
  let descriptor: { token: string; socketPath: string; version: number };
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.uid !== process.getuid?.() || (info.mode & 0o077) !== 0)
      throw new Error("Unsafe connection file");
    descriptor = JSON.parse(await readFile(path, "utf8"));
    if (
      descriptor.version !== 1 ||
      !/^[a-f0-9]{64}$/.test(descriptor.token) ||
      !/^\/tmp\/betterx-mcp-[A-Za-z0-9]+\/bridge\.sock$/.test(descriptor.socketPath)
    )
      throw new Error("Invalid connection file");
  } catch {
    throw new Error(
      "Open BetterX and enable Agent access in its menu. The private connection file is missing or invalid."
    );
  }
  return new Promise((resolve, reject) => {
    const socket = createConnection(descriptor.socketPath);
    let buffer = Buffer.alloc(0);
    let done = false;
    const fail = (message: string) => {
      if (!done) {
        done = true;
        socket.destroy();
        reject(new Error(message));
      }
    };
    socket.setTimeout(45_000, () => fail("BetterX command timed out"));
    socket.on("error", () =>
      fail("Cannot connect to BetterX; reopen the app and enable Agent access")
    );
    socket.on("end", () => {
      if (!done) fail("BetterX closed the connection before returning a result");
    });
    socket.on("connect", () =>
      socket.write(`${JSON.stringify({ token: descriptor.token, command })}\n`)
    );
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > MAX_RESPONSE_BYTES) {
        fail("BetterX response exceeded the limit");
        return;
      }
      const newline = buffer.indexOf(10);
      if (newline < 0) return;
      try {
        const response = JSON.parse(buffer.subarray(0, newline).toString("utf8"));
        if (!response.ok) {
          fail(String(response.error ?? "BetterX command failed"));
          return;
        }
        done = true;
        socket.destroy();
        resolve(response.result);
      } catch {
        fail("Invalid response from BetterX");
      }
    });
  });
}
