import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, lstat, mkdir, mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { type Socket, createServer } from "node:net";
import { dirname, join } from "node:path";
import { type Command, MAX_REQUEST_BYTES, MAX_RESPONSE_BYTES, parseCommand } from "./protocol.js";

export async function startBridge(
  path: string,
  execute: (command: Command, signal: AbortSignal) => Promise<unknown>
) {
  if (process.platform === "win32")
    throw new Error("This local bridge prototype supports macOS and Linux only");
  const dir = dirname(path);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const info = await lstat(dir);
  if (!info.isDirectory() || info.uid !== process.getuid?.())
    throw new Error("Unsafe agent directory");
  await chmod(dir, 0o700);
  // Do not silently replace an active instance's connection descriptor.
  try {
    const previous = JSON.parse(await readFile(path, "utf8"));
    if (Number.isInteger(previous.pid)) {
      try {
        process.kill(previous.pid, 0);
        throw new Error("Another BetterX agent bridge is active");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    }
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const socketDir = await mkdtemp("/tmp/betterx-mcp-");
  const socketPath = join(socketDir, "bridge.sock");
  const token = randomBytes(32).toString("hex");
  const sockets = new Set<Socket>();
  const abort = new AbortController();
  let busy = false;
  let closed = false;
  const server = createServer((socket) => {
    if (closed || sockets.size >= 4) {
      socket.destroy();
      return;
    }
    sockets.add(socket);
    socket.on("error", () => {});
    socket.on("close", () => sockets.delete(socket));
    socket.setTimeout(3000, () => socket.destroy());
    let buffer = Buffer.alloc(0);
    let accepted = false;
    const reply = (value: unknown) => {
      const message = JSON.stringify(value);
      socket.end(
        `${Buffer.byteLength(message) <= MAX_RESPONSE_BYTES ? message : JSON.stringify({ ok: false, error: "Result too large; request fewer posts" })}\n`
      );
    };
    socket.on("data", (chunk: Buffer) => {
      if (accepted) {
        socket.destroy();
        return;
      }
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > MAX_REQUEST_BYTES) {
        socket.destroy();
        return;
      }
      const newline = buffer.indexOf(10);
      if (newline < 0) return;
      accepted = true;
      if (newline !== buffer.length - 1) {
        reply({ ok: false, error: "One request per connection" });
        return;
      }
      let command: Command;
      try {
        const request = JSON.parse(buffer.subarray(0, newline).toString("utf8"));
        if (
          typeof request.token !== "string" ||
          request.token.length !== token.length ||
          !timingSafeEqual(Buffer.from(request.token), Buffer.from(token))
        )
          throw new Error("Unauthorized");
        command = parseCommand(request.command);
      } catch {
        reply({ ok: false, error: "Unauthorized or invalid command" });
        return;
      }
      if (busy) {
        reply({
          ok: false,
          error: "BetterX is handling another agent command; retry when it finishes",
        });
        return;
      }
      busy = true;
      socket.setTimeout(45_000);
      const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(40_000)]);
      const disconnected = new AbortController();
      socket.once("close", () => disconnected.abort());
      void execute(command, AbortSignal.any([signal, disconnected.signal]))
        .then((result) => {
          if (!closed && !socket.destroyed) reply({ ok: true, result });
        })
        .catch((error) => {
          if (!closed && !socket.destroyed)
            reply({
              ok: false,
              error: error instanceof Error ? error.message.slice(0, 300) : "Agent command failed",
            });
        })
        .finally(() => {
          busy = false;
        });
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, resolve);
    });
    await chmod(socketPath, 0o600);
    await writeFile(path, JSON.stringify({ version: 1, pid: process.pid, socketPath, token }), {
      mode: 0o600,
      flag: "wx",
    });
  } catch (error) {
    server.close();
    await unlink(socketPath).catch(() => {});
    await rmdir(socketDir).catch(() => {});
    throw error;
  }
  return {
    async close() {
      if (closed) return;
      closed = true;
      abort.abort();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        const descriptor = JSON.parse(await readFile(path, "utf8"));
        if (descriptor.token === token) await unlink(path);
      } catch {
        /* already removed */
      }
      await unlink(socketPath).catch(() => {});
      await rmdir(socketDir).catch(() => {});
    },
  };
}
