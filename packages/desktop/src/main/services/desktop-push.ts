import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { logger } from "@betterx/core";
import { type BrowserWindow, Notification, shell } from "electron";
import WebSocket, { type RawData } from "ws";
import { BETTERX_DIR } from "../paths.js";

const require = createRequire(import.meta.url);
const ece = require("http_ece") as {
  decrypt(
    data: Buffer,
    params: {
      version: "aesgcm" | "aes128gcm";
      authSecret: Buffer;
      privateKey: ReturnType<typeof createECDH>;
      dh?: string;
      salt?: string;
    }
  ): Buffer;
};

const AUTOPUSH_WS_URL = "wss://push.services.mozilla.com/";
const STORE_PATH = join(BETTERX_DIR, "desktop-push-subscriptions.json");
const FALLBACK_X_URL = "https://x.com/notifications";

const WS_REGISTER_TIMEOUT_MS = 20_000;
const WS_UNREGISTER_TIMEOUT_MS = 8_000;
const WS_RECONNECT_DELAY_MS = 3_000;
const WS_PING_INTERVAL_MS = 4 * 60 * 1000;

export type DesktopPushSubscriptionInfo = {
  scope: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  appServerKey: string;
  createdAt: number;
};

type StoredDesktopPushSubscription = DesktopPushSubscriptionInfo & {
  channelId: string;
  privateKey: string;
  lastVersion: string | null;
};

type DesktopPushStore = {
  version: 2;
  uaid: string | null;
  subscriptions: Record<string, StoredDesktopPushSubscription>;
};

type PendingRegisterRequest = {
  scope: string;
  resolve: (pushEndpoint: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type PendingUnregisterRequest = {
  resolve: (ok: boolean) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type NotificationPayload = {
  title: string;
  body: string;
  targetUrl: string;
  icon?: string;
  debugKind: string;
};

function findStringDeep(
  value: unknown,
  targetKeys: Set<string>,
  maxDepth = 6,
  depth = 0
): string | null {
  if (depth > maxDepth || value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = findStringDeep(entry, targetKeys, maxDepth, depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const [key, candidate] of Object.entries(record)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!targetKeys.has(normalizedKey)) {
      continue;
    }

    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }

  for (const nestedValue of Object.values(record)) {
    const nested = findStringDeep(nestedValue, targetKeys, maxDepth, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function normalizeBase64Url(value: string): string {
  return value.trim().replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function padBase64Url(value: string): string {
  const normalized = normalizeBase64Url(value);
  const missingPadding = normalized.length % 4;
  if (missingPadding === 0) {
    return normalized;
  }

  return `${normalized}${"=".repeat(4 - missingPadding)}`;
}

function toBase64Url(value: ArrayLike<number>): string {
  return normalizeBase64Url(Buffer.from(value).toString("base64"));
}

function fromBase64Url(value: string): Buffer {
  const padded = padBase64Url(value);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function normalizeScope(scope: string): string {
  const parsed = new URL(scope);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Unsupported push scope protocol: ${parsed.protocol}`);
  }
  const normalized = parsed.toString();
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function toView(subscription: StoredDesktopPushSubscription): DesktopPushSubscriptionInfo {
  return {
    scope: subscription.scope,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    appServerKey: subscription.appServerKey,
    createdAt: subscription.createdAt,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function pickString(...candidates: Array<unknown>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isXUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname;
    return (
      host === "x.com" ||
      host === "twitter.com" ||
      host.endsWith(".x.com") ||
      host.endsWith(".twitter.com")
    );
  } catch {
    return false;
  }
}

function parseJsonIfPossible(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractHeaderParam(headerValue: string | null, key: string): string | null {
  if (!headerValue) return null;
  const pattern = new RegExp(`(?:^|[;,\\s])${key}=([^;,\\s]+)`, "i");
  const match = pattern.exec(headerValue);
  return match?.[1] ?? null;
}

function normalizePushHeaders(headers: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value !== "string") {
      continue;
    }

    const normalizedKey = key.toLowerCase().replace(/_/g, "-").trim();
    const normalizedValue = value.trim();
    if (!normalizedKey || !normalizedValue) {
      continue;
    }
    normalized[normalizedKey] = normalizedValue;
  }

  return normalized;
}

function describeError(error: unknown): string {
  if (!error) {
    return "Unknown error";
  }

  if (error instanceof Error) {
    const responseData = asRecord(
      (error as Error & { response?: { data?: unknown } }).response
    )?.data;
    const responseJson = responseData != null ? ` response=${JSON.stringify(responseData)}` : "";
    return `${error.name}: ${error.message || "(no message)"}${responseJson}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function extractDisplayPayload(rawNotification: unknown): NotificationPayload {
  const parsedRoot =
    typeof rawNotification === "string"
      ? asRecord(parseJsonIfPossible(rawNotification))
      : asRecord(rawNotification);
  const root = parsedRoot ?? {};
  const rootData =
    typeof root.data === "string" ? asRecord(parseJsonIfPossible(root.data)) : asRecord(root.data);
  const rootNotification =
    typeof root.notification === "string"
      ? asRecord(parseJsonIfPossible(root.notification))
      : asRecord(root.notification);

  const source = rootNotification ?? rootData ?? root;
  const fcmOptions = asRecord(root.fcmOptions) ?? asRecord(rootData?.fcmOptions);

  const deepTitle = findStringDeep(
    root,
    new Set([
      "title",
      "notificationtitle",
      "heading",
      "subject",
      "sender",
      "sendername",
      "username",
    ])
  );
  const deepBody = findStringDeep(
    root,
    new Set(["body", "text", "message", "content", "alert", "subtitle", "description", "tweettext"])
  );

  const title =
    pickString(source?.title, root.title, rootData?.title, rootNotification?.title, deepTitle) ??
    "X";
  const body =
    pickString(source?.body, root.body, rootData?.body, rootNotification?.body) ??
    deepBody ??
    "New activity on X";
  const icon = pickString(source?.icon, root.icon, rootData?.icon, rootNotification?.icon);

  const targetUrl =
    pickString(
      source?.click_action,
      source?.clickAction,
      source?.url,
      source?.link,
      source?.targetUrl,
      root.click_action,
      root.url,
      rootData?.click_action,
      rootData?.url,
      rootData?.link,
      fcmOptions?.link
    ) ?? FALLBACK_X_URL;

  const debugKind = rootNotification
    ? "notification-object"
    : rootData
      ? "data-object"
      : "root-object";

  return {
    title,
    body,
    targetUrl: isHttpUrl(targetUrl) ? targetUrl : FALLBACK_X_URL,
    ...(icon ? { icon } : {}),
    debugKind,
  };
}

export class DesktopPushService {
  private initialized = false;
  private store: DesktopPushStore = {
    version: 2,
    uaid: null,
    subscriptions: {},
  };
  private writeQueue: Promise<void> = Promise.resolve();

  private ws: WebSocket | null = null;
  private wsReady = false;
  private helloPromise: Promise<void> | null = null;
  private helloResolve: (() => void) | null = null;
  private helloReject: ((error: Error) => void) | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  private readonly pendingRegisters = new Map<string, PendingRegisterRequest>();
  private readonly pendingUnregisters = new Map<string, PendingUnregisterRequest>();

  constructor(private readonly getMainWindow: () => BrowserWindow | null) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    await mkdir(BETTERX_DIR, { recursive: true });
    this.store = await this.readStore();

    if (Object.keys(this.store.subscriptions).length > 0) {
      void this.ensureConnected().catch((error) => {
        logger.warn("[BetterX][desktop-push] Initial connection failed", error);
      });
    }
  }

  dispose(): void {
    this.disposed = true;

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.failAllPendingRequests(new Error("Desktop push service disposed"));

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.wsReady = false;
    this.rejectHello(new Error("Desktop push service disposed"));
  }

  async getSubscription(scope: string): Promise<DesktopPushSubscriptionInfo | null> {
    const normalizedScope = normalizeScope(scope);
    const subscription = this.store.subscriptions[normalizedScope];
    if (!subscription) return null;
    return toView(subscription);
  }

  async subscribe(scope: string, appServerKey: string): Promise<DesktopPushSubscriptionInfo> {
    const normalizedScope = normalizeScope(scope);
    const normalizedAppServerKey = normalizeBase64Url(appServerKey);
    if (!normalizedAppServerKey) {
      throw new Error("Desktop push subscribe failed: appServerKey is empty");
    }

    const existing = this.store.subscriptions[normalizedScope];
    if (existing && existing.appServerKey === normalizedAppServerKey) {
      await this.ensureConnected();
      logger.info(`[BetterX][desktop-push] Reusing existing subscription for ${normalizedScope}`);
      return toView(existing);
    }

    if (existing) {
      await this.unsubscribe(normalizedScope);
    }

    await this.ensureConnected();

    const channelId = randomUUID().toLowerCase();

    try {
      const pushEndpoint = await this.requestRegister(
        channelId,
        normalizedScope,
        normalizedAppServerKey
      );

      const ecdh = createECDH("prime256v1");
      ecdh.generateKeys();

      const subscription: StoredDesktopPushSubscription = {
        scope: normalizedScope,
        channelId,
        endpoint: pushEndpoint,
        appServerKey: normalizedAppServerKey,
        p256dh: toBase64Url(ecdh.getPublicKey()),
        privateKey: toBase64Url(ecdh.getPrivateKey()),
        auth: toBase64Url(randomBytes(16)),
        createdAt: Date.now(),
        lastVersion: null,
      };

      this.store.subscriptions[normalizedScope] = subscription;
      this.enqueueStoreWrite();

      logger.info(
        `[BetterX][desktop-push] Subscription ready scope=${normalizedScope} channel=${channelId}`
      );

      return toView(subscription);
    } catch (error) {
      throw new Error(`Desktop push subscribe failed: ${describeError(error)}`);
    }
  }

  async unsubscribe(scope: string): Promise<boolean> {
    const normalizedScope = normalizeScope(scope);
    const existing = this.store.subscriptions[normalizedScope];
    if (!existing) {
      return false;
    }

    if (this.wsReady) {
      await this.requestUnregister(existing.channelId).catch((error) => {
        logger.warn(
          `[BetterX][desktop-push] Unregister request failed for ${normalizedScope}`,
          error
        );
      });
    }

    delete this.store.subscriptions[normalizedScope];
    this.enqueueStoreWrite();
    logger.info(`[BetterX][desktop-push] Unsubscribed scope=${normalizedScope}`);
    return true;
  }

  private async ensureConnected(): Promise<void> {
    if (this.disposed) {
      throw new Error("Desktop push service is disposed");
    }

    if (this.wsReady && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (!this.helloPromise) {
      this.openWebSocket();
    }

    if (!this.helloPromise) {
      throw new Error("Desktop push websocket initialization failed");
    }

    return this.helloPromise;
  }

  private openWebSocket(): void {
    if (this.disposed) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.wsReady = false;

    this.helloPromise = new Promise<void>((resolve, reject) => {
      this.helloResolve = resolve;
      this.helloReject = reject;
    });

    const ws = new WebSocket(AUTOPUSH_WS_URL);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("[BetterX][desktop-push] WebSocket connected to Mozilla Autopush");
      this.sendMessage({
        messageType: "hello",
        uaid: this.store.uaid ?? "",
        channelIDs: Object.values(this.store.subscriptions).map(
          (subscription) => subscription.channelId
        ),
        use_webpush: true,
      });
    });

    ws.on("message", (rawData: RawData) => {
      this.handleWebSocketMessage(rawData.toString());
    });

    ws.on("error", (error: Error) => {
      logger.warn("[BetterX][desktop-push] WebSocket error", error);
    });

    ws.on("close", (code: number, reason: Buffer) => {
      logger.warn(
        `[BetterX][desktop-push] WebSocket closed code=${code} reason=${reason.toString()}`
      );

      this.wsReady = false;

      if (this.ws) {
        this.ws.removeAllListeners();
        this.ws = null;
      }

      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }

      if (this.helloPromise) {
        this.rejectHello(new Error(`Autopush websocket closed before hello (code=${code})`));
      }

      this.failAllPendingRequests(new Error(`Autopush websocket closed (code=${code})`));

      if (!this.disposed && Object.keys(this.store.subscriptions).length > 0) {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.disposed) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openWebSocket();
      if (this.helloPromise) {
        this.helloPromise.catch((error) => {
          logger.warn("[BetterX][desktop-push] Reconnect attempt failed", error);
          this.scheduleReconnect();
        });
      }
    }, WS_RECONNECT_DELAY_MS);
  }

  private requestRegister(channelId: string, scope: string, appServerKey: string): Promise<string> {
    if (!this.wsReady) {
      throw new Error("Autopush websocket is not ready");
    }

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRegisters.delete(channelId);
        reject(new Error(`Timed out waiting for register reply (channel=${channelId})`));
      }, WS_REGISTER_TIMEOUT_MS);

      this.pendingRegisters.set(channelId, { scope, resolve, reject, timeout });

      this.sendMessage({
        messageType: "register",
        channelID: channelId,
        key: padBase64Url(appServerKey),
      });
    });
  }

  private requestUnregister(channelId: string): Promise<boolean> {
    if (!this.wsReady) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingUnregisters.delete(channelId);
        reject(new Error(`Timed out waiting for unregister reply (channel=${channelId})`));
      }, WS_UNREGISTER_TIMEOUT_MS);

      this.pendingUnregisters.set(channelId, { resolve, reject, timeout });

      this.sendMessage({
        messageType: "unregister",
        channelID: channelId,
      });
    });
  }

  private handleWebSocketMessage(rawMessage: string): void {
    if (!rawMessage || rawMessage === "{}") {
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      const message = JSON.parse(rawMessage);
      parsed = asRecord(message) ?? {};
    } catch (error) {
      logger.warn("[BetterX][desktop-push] Failed to parse websocket message", error);
      return;
    }

    const messageType = pickString(parsed.messageType);
    if (!messageType) {
      return;
    }

    switch (messageType) {
      case "hello": {
        this.handleHelloReply(parsed);
        break;
      }
      case "register": {
        this.handleRegisterReply(parsed);
        break;
      }
      case "unregister": {
        this.handleUnregisterReply(parsed);
        break;
      }
      case "notification": {
        this.handleNotificationReply(parsed);
        break;
      }
      default: {
        break;
      }
    }
  }

  private handleHelloReply(message: Record<string, unknown>): void {
    const uaid = pickString(message.uaid);
    if (!uaid) {
      this.rejectHello(new Error("Autopush hello reply is missing uaid"));
      return;
    }

    if (this.store.uaid && this.store.uaid !== uaid) {
      logger.warn(
        "[BetterX][desktop-push] Autopush assigned a new uaid; dropping existing local subscriptions"
      );
      this.store.subscriptions = {};
    }

    this.store.uaid = uaid;
    this.enqueueStoreWrite();

    this.wsReady = true;
    this.resolveHello();

    if (!this.pingTimer) {
      this.pingTimer = setInterval(() => {
        if (!this.wsReady) return;
        this.sendMessage({});
      }, WS_PING_INTERVAL_MS);
    }

    logger.info(
      `[BetterX][desktop-push] Autopush hello complete uaid=${uaid} webpush=${Boolean(message.use_webpush)}`
    );
  }

  private handleRegisterReply(message: Record<string, unknown>): void {
    const channelId = pickString(message.channelID);
    if (!channelId) return;

    const pending = this.pendingRegisters.get(channelId);
    if (!pending) return;

    this.pendingRegisters.delete(channelId);
    clearTimeout(pending.timeout);

    const status = Number(message.status);
    const pushEndpoint = pickString(message.pushEndpoint);

    if (status === 200 && pushEndpoint) {
      pending.resolve(pushEndpoint);
      return;
    }

    pending.reject(
      new Error(
        `Autopush register failed for ${pending.scope}: status=${status} payload=${JSON.stringify(message)}`
      )
    );
  }

  private handleUnregisterReply(message: Record<string, unknown>): void {
    const channelId = pickString(message.channelID);
    if (!channelId) return;

    const pending = this.pendingUnregisters.get(channelId);
    if (!pending) return;

    this.pendingUnregisters.delete(channelId);
    clearTimeout(pending.timeout);

    pending.resolve(Number(message.status) === 200);
  }

  private handleNotificationReply(message: Record<string, unknown>): void {
    const updates = Array.isArray(message.updates) ? message.updates : [message];

    for (const update of updates) {
      const payload = asRecord(update);
      if (!payload) continue;
      this.handleNotificationUpdate(payload);
    }
  }

  private handleNotificationUpdate(update: Record<string, unknown>): void {
    const channelId = pickString(update.channelID);
    if (!channelId) return;

    const versionRaw = pickString(update.version) ?? String(update.version ?? "");
    const version = versionRaw.length > 0 ? versionRaw : `${Date.now()}`;

    const subscription = Object.values(this.store.subscriptions).find(
      (candidate) => candidate.channelId === channelId
    );
    if (!subscription) {
      this.sendAck(channelId, version, 102);
      return;
    }

    try {
      const decrypted = this.decryptNotification(update, subscription);
      const decryptedKeys = Object.keys(asRecord(decrypted) ?? {})
        .slice(0, 12)
        .join(",");
      const displayPayload = extractDisplayPayload(decrypted);

      logger.info(
        `[BetterX][desktop-push] Notification received scope=${subscription.scope} ` +
          `kind=${displayPayload.debugKind} title=${displayPayload.title} ` +
          `body=${displayPayload.body.slice(0, 140)} keys=${decryptedKeys}`
      );

      subscription.lastVersion = version;
      this.enqueueStoreWrite();
      this.sendAck(channelId, version, 100);

      this.showDesktopNotification(
        displayPayload.title,
        displayPayload.body,
        displayPayload.targetUrl,
        displayPayload.icon
      );
    } catch (error) {
      logger.warn(
        `[BetterX][desktop-push] Failed to process notification scope=${subscription.scope}`,
        error
      );
      this.sendAck(channelId, version, 101);
    }
  }

  private decryptNotification(
    update: Record<string, unknown>,
    subscription: StoredDesktopPushSubscription
  ): unknown {
    const data = pickString(update.data);
    if (!data) {
      return update;
    }

    const headersRaw = asRecord(update.headers) ?? {};
    const headers = normalizePushHeaders(headersRaw);

    const contentEncoding =
      pickString(
        headers["content-encoding"],
        headers.encoding,
        headers.contentencoding,
        update["content-encoding"],
        update.encoding
      ) ?? "";

    const cryptoKeyHeader = pickString(headers["crypto-key"], headers["encryption-key"]) ?? null;
    const encryptionHeader = pickString(headers.encryption) ?? null;

    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(fromBase64Url(subscription.privateKey));

    const encryptedPayload = fromBase64Url(data);
    const authSecret = fromBase64Url(subscription.auth);

    const dh = extractHeaderParam(cryptoKeyHeader, "dh") ?? null;
    const salt = extractHeaderParam(encryptionHeader, "salt") ?? null;

    const encodingLower = contentEncoding.toLowerCase();
    const versionCandidates: Array<"aes128gcm" | "aesgcm"> = [];
    if (encodingLower.includes("aes128gcm") || encodingLower.includes("128")) {
      versionCandidates.push("aes128gcm", "aesgcm");
    } else if (encodingLower.includes("aesgcm")) {
      versionCandidates.push("aesgcm", "aes128gcm");
    } else {
      // Some servers omit content-encoding metadata in websocket payloads.
      versionCandidates.push("aes128gcm", "aesgcm");
    }

    const seen = new Set<"aes128gcm" | "aesgcm">();
    const errors: string[] = [];

    for (const version of versionCandidates) {
      if (seen.has(version)) continue;
      seen.add(version);

      if (version === "aesgcm" && (!dh || !salt)) {
        errors.push("aesgcm skipped (missing dh/salt)");
        continue;
      }

      try {
        const decryptedBuffer = ece.decrypt(encryptedPayload, {
          version,
          authSecret,
          privateKey: ecdh,
          ...(dh ? { dh } : {}),
          ...(salt ? { salt } : {}),
        });

        return parseJsonIfPossible(decryptedBuffer.toString("utf-8"));
      } catch (error) {
        errors.push(`${version} failed: ${describeError(error)}`);
      }
    }

    // Rare fallback: if payload is already plain JSON/base text (no ECE),
    // parse it directly instead of dropping the notification.
    const plainText = encryptedPayload.toString("utf-8");
    if (plainText.startsWith("{") || plainText.startsWith("[")) {
      return parseJsonIfPossible(plainText);
    }

    throw new Error(
      `Unable to decrypt push payload; encoding=${contentEncoding || "(none)"}; ` +
        `headers=${Object.keys(headers).join(",")}; attempts=${errors.join(" | ")}`
    );
  }

  private sendAck(channelId: string, version: string, code: 100 | 101 | 102): void {
    if (!this.wsReady) return;

    this.sendMessage({
      messageType: "ack",
      updates: [{ channelID: channelId, version, code }],
    });
  }

  private sendMessage(message: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  private resolveHello(): void {
    this.helloResolve?.();
    this.helloResolve = null;
    this.helloReject = null;
    this.helloPromise = null;
  }

  private rejectHello(error: Error): void {
    this.helloReject?.(error);
    this.helloResolve = null;
    this.helloReject = null;
    this.helloPromise = null;
  }

  private failAllPendingRequests(error: Error): void {
    for (const [channelId, pending] of this.pendingRegisters) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pendingRegisters.delete(channelId);
    }

    for (const [channelId, pending] of this.pendingUnregisters) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pendingUnregisters.delete(channelId);
    }
  }

  private showDesktopNotification(
    title: string,
    body: string,
    targetUrl: string,
    icon?: string
  ): void {
    if (!Notification.isSupported()) {
      logger.warn("[BetterX][desktop-push] Notification API unsupported on this platform");
      return;
    }

    const notification = new Notification({
      title,
      body,
      ...(icon ? { icon } : {}),
    });

    notification.on("click", () => {
      this.openTargetUrl(targetUrl);
    });

    notification.show();
  }

  private openTargetUrl(targetUrl: string): void {
    const safeTarget = isHttpUrl(targetUrl) ? targetUrl : FALLBACK_X_URL;
    if (isXUrl(safeTarget)) {
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        void win.loadURL(safeTarget);
        if (win.isMinimized()) {
          win.restore();
        }
        win.show();
        win.focus();
        return;
      }
    }

    void shell.openExternal(safeTarget);
  }

  private async readStore(): Promise<DesktopPushStore> {
    if (!existsSync(STORE_PATH)) {
      return {
        version: 2,
        uaid: null,
        subscriptions: {},
      };
    }

    try {
      const raw = await readFile(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Partial<DesktopPushStore>;
      if (parsed.version !== 2 || !parsed.subscriptions) {
        throw new Error("Unsupported desktop push store format");
      }

      return {
        version: 2,
        uaid: typeof parsed.uaid === "string" ? parsed.uaid : null,
        subscriptions: parsed.subscriptions,
      };
    } catch (error) {
      logger.warn("[BetterX][desktop-push] Failed to read push store, starting clean", error);
      return {
        version: 2,
        uaid: null,
        subscriptions: {},
      };
    }
  }

  private enqueueStoreWrite(): void {
    this.writeQueue = this.writeQueue
      .then(async () => {
        await writeFile(STORE_PATH, JSON.stringify(this.store, null, 2), "utf-8");
      })
      .catch((error) => {
        logger.error("[BetterX][desktop-push] Failed to write push store", error);
      });
  }
}
