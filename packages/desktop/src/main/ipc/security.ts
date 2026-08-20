import { isIP } from "node:net";
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";

const TRUSTED_RENDERER_HOSTS = new Set(["x.com", "twitter.com"]);

export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) {
      const mappedAddress = normalized.slice("::ffff:".length);
      if (isIP(mappedAddress) === 4) return isPrivateAddress(mappedAddress);
    }
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }
  return (
    /^127\./.test(address) ||
    /^10\./.test(address) ||
    /^192\.168\./.test(address) ||
    /^169\.254\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address) ||
    address === "0.0.0.0"
  );
}

export function isTrustedRendererUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && TRUSTED_RENDERER_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function assertTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): void {
  if (!isTrustedRendererUrl(event.senderFrame?.url ?? event.sender.getURL())) {
    throw new Error("Blocked IPC request from an untrusted renderer");
  }
}

export function parseExternalHttpUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP(S) URLs are allowed");
  }
  return url;
}

export function parsePublicProxyUrl(rawUrl: unknown): URL {
  if (typeof rawUrl !== "string" || rawUrl.length > 2048) throw new Error("Invalid proxy URL");
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("External proxy requests require an HTTPS URL without credentials");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("[") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error("Private network proxy targets are not allowed");
  }
  return url;
}

export function validateProxyMethod(method: unknown): "GET" | "POST" | "PUT" | "PATCH" | "DELETE" {
  const normalized = method === undefined ? "GET" : String(method).toUpperCase();
  if (!new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]).has(normalized)) {
    throw new Error("Unsupported proxy method");
  }
  return normalized as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

export function parseCloudServerUrl(rawUrl: unknown): URL {
  if (typeof rawUrl !== "string" || rawUrl.length > 2048)
    throw new Error("Invalid cloud server URL");
  const url = new URL(rawUrl);
  const loopback =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error("Cloud servers must use HTTPS (HTTP is allowed only on loopback)");
  }
  if (
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error("Cloud server must be an origin without credentials, path, query, or fragment");
  }
  return url;
}

export function validateCloudRequest(
  path: unknown,
  method: unknown
): { path: string; method: "GET" | "POST" } {
  if (typeof path !== "string") throw new Error("Invalid cloud path");
  const normalizedMethod = method === undefined ? "GET" : String(method).toUpperCase();
  const allowed = new Map<string, ReadonlySet<string>>([
    ["/api/config", new Set(["GET", "POST"])],
    ["/api/me", new Set(["GET"])],
    ["/auth/logout", new Set(["POST"])],
  ]);
  if (!allowed.get(path)?.has(normalizedMethod)) throw new Error("Cloud request is not allowed");
  return { path, method: normalizedMethod as "GET" | "POST" };
}
