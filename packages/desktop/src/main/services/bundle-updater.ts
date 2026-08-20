import { createHash } from "node:crypto";
import { createWriteStream, renameSync, unlinkSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// ─── Bundle Updater ───────────────────────────────────────────────────────────
// Fixed update system: uses bundle.js.sha256 sidecar file to avoid
// the original bug where stream hash ≠ decompressed file hash.

const BASE_URL = "https://feur-inc.github.io/BetterX/desktop/v2";
const BUNDLE_URL = `${BASE_URL}/bundle.js`;
const HASH_URL = `${BASE_URL}/bundle.js.sha256`;
const MAX_BUNDLE_BYTES = 10_000_000;

export type BundleUpdateResult =
  | { updateAvailable: false }
  | { updateAvailable: true; remoteHash: string };

/**
 * Fetch the remote SHA-256 hash from the sidecar file.
 * Does NOT hash the bundle stream - just reads the tiny text file.
 */
export async function checkForBundleUpdate(
  currentHash: string | null
): Promise<BundleUpdateResult> {
  const remoteHash = await fetchText(HASH_URL);
  if (!remoteHash) throw new Error("Failed to fetch remote bundle hash");

  const normalizedHash = remoteHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedHash)) throw new Error("Remote bundle hash is invalid");

  if (normalizedHash === currentHash) {
    return { updateAvailable: false };
  }
  return { updateAvailable: true, remoteHash: normalizedHash };
}

/**
 * Download bundle.js to a temp file, verify its SHA-256 against the remote hash,
 * then atomically rename it into place.
 */
export async function applyBundleUpdate(bundlePath: string, remoteHash: string): Promise<void> {
  const tempPath = `${bundlePath}.tmp`;

  try {
    await downloadFile(BUNDLE_URL, tempPath);
    const downloadedHash = await hashFileFromDisk(tempPath);
    if (downloadedHash !== remoteHash) {
      throw new Error(`Bundle hash mismatch: expected ${remoteHash}, got ${downloadedHash}`);
    }

    renameSync(tempPath, bundlePath);
    await writeFile(`${bundlePath}.sha256`, remoteHash, "utf-8");
  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch {
      // ignore cleanup error
    }
    throw error;
  }
}

/**
 * Read the persisted bundle hash from disk (written by applyBundleUpdate).
 */
export async function readPersistedHash(bundlePath: string): Promise<string | null> {
  try {
    const hash = await readFile(`${bundlePath}.sha256`, "utf-8");
    return hash.trim() || null;
  } catch {
    return null;
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading bundle`);
  if (!res.body) throw new Error("No response body");
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BUNDLE_BYTES) throw new Error("Remote bundle is too large");

  const writeStream = createWriteStream(destPath);
  await pipeline(
    Readable.fromWeb(res.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
    writeStream
  );
  if ((await stat(destPath)).size > MAX_BUNDLE_BYTES) throw new Error("Remote bundle is too large");
}

async function hashFileFromDisk(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}
