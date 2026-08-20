import { type NativePayload, getBridge, requestNative } from "./native-bridge.js";

type StorageAreaName = "sync" | "local";

type StorageChange = {
  oldValue: unknown;
  newValue: unknown;
};

type StorageListener = (changes: Record<string, StorageChange>, areaName: StorageAreaName) => void;

const STORAGE_PREFIX = "betterx_android";
const MANIFEST_VERSION = "3.0.0";

const storageListeners = new Set<StorageListener>();
function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function fromJson(raw: string | null): unknown {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function areaKey(area: StorageAreaName, key: string): string {
  return `${STORAGE_PREFIX}:${area}:${key}`;
}

function listLocalKeys(area: StorageAreaName): string[] {
  const keys: string[] = [];
  const prefix = `${STORAGE_PREFIX}:${area}:`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      keys.push(key.slice(prefix.length));
    }
  }
  return keys;
}

function readLocalValue(area: StorageAreaName, key: string): unknown {
  return fromJson(localStorage.getItem(areaKey(area, key)));
}

function writeLocalValue(area: StorageAreaName, key: string, value: unknown): void {
  if (value === undefined) {
    removeLocalValue(area, key);
    return;
  }
  localStorage.setItem(areaKey(area, key), toJson(value));
}

function removeLocalValue(area: StorageAreaName, key: string): void {
  localStorage.removeItem(areaKey(area, key));
}

function emitStorageChange(area: StorageAreaName, changes: Record<string, StorageChange>): void {
  if (Object.keys(changes).length === 0) return;
  for (const listener of storageListeners) {
    try {
      listener(changes, area);
    } catch {
      // ignore listener failures
    }
  }
}

function normalizeKeyInput(keys: string | string[] | Record<string, unknown> | undefined): {
  keys?: string[];
  defaults?: Record<string, unknown>;
} {
  if (typeof keys === "string") return { keys: [keys] };
  if (Array.isArray(keys)) return { keys };
  if (isObject(keys)) return { keys: Object.keys(keys), defaults: keys };
  return {};
}

function fillRequestedKeys(
  requested: string[] | undefined,
  defaults: Record<string, unknown> | undefined,
  result: Record<string, unknown>
): Record<string, unknown> {
  if (requested) {
    for (const key of requested) {
      if (!(key in result) || result[key] == null) result[key] = undefined;
    }
  }
  if (defaults) {
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in result) || result[key] == null) result[key] = value;
    }
  }
  return result;
}

async function readStorage(
  area: StorageAreaName,
  keys?: string[]
): Promise<Record<string, unknown>> {
  if (getBridge()) {
    return (
      (await requestNative<Record<string, unknown>>({ type: "STORAGE_GET", area, keys })) ?? {}
    );
  }

  const allKeys = keys ?? listLocalKeys(area);
  const result: Record<string, unknown> = {};
  for (const key of allKeys) {
    result[key] = readLocalValue(area, key);
  }
  return result;
}

async function writeStorage(area: StorageAreaName, items: Record<string, unknown>): Promise<void> {
  if (getBridge()) {
    await requestNative<void>({ type: "STORAGE_SET", area, items });
  } else {
    for (const [key, value] of Object.entries(items)) {
      writeLocalValue(area, key, value);
    }
  }

  const changes: Record<string, StorageChange> = {};
  for (const [key, value] of Object.entries(items)) {
    changes[key] = { oldValue: undefined, newValue: value };
  }
  emitStorageChange(area, changes);
}

async function removeStorage(area: StorageAreaName, keys: string | string[]): Promise<void> {
  const list = Array.isArray(keys) ? keys : [keys];

  if (getBridge()) {
    await requestNative<void>({ type: "STORAGE_REMOVE", area, keys: list });
  } else {
    for (const key of list) removeLocalValue(area, key);
  }

  const changes: Record<string, StorageChange> = {};
  for (const key of list) changes[key] = { oldValue: undefined, newValue: undefined };
  emitStorageChange(area, changes);
}

async function proxyImage(url: string): Promise<string> {
  if (getBridge()) {
    const result = await requestNative<{ dataUrl?: string }>({ type: "PROXY_IMAGE", url });
    return result?.dataUrl ?? url;
  }

  try {
    const res = await fetch(url, { credentials: "include" });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? url));
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read image blob"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function proxyFetch(
  url: string,
  init?: {
    method?: string | undefined;
    headers?: Record<string, string> | undefined;
    body?: string | undefined;
    credentials?: "include" | "omit" | undefined;
  }
) {
  if (getBridge()) {
    return (
      (await requestNative<{ ok: boolean; status: number; text: string; json: unknown }>({
        type: "PROXY_FETCH",
        url,
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
        credentials: init?.credentials,
      })) ?? { ok: false, status: 0, text: "", json: null }
    );
  }

  const requestInit: RequestInit = { credentials: init?.credentials ?? "omit" };
  if (init?.method) requestInit.method = init.method;
  if (init?.headers) requestInit.headers = init.headers;
  if (init?.body !== undefined) requestInit.body = init.body;

  const res = await fetch(url, requestInit);

  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    // ignore
  }

  return { ok: res.ok, status: res.status, text, json };
}

async function openExternalUrl(url: string): Promise<void> {
  if (getBridge()) {
    await requestNative<void>({ type: "OPEN_URL", url });
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function matchesPattern(url: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(url);
}

const browser = {
  runtime: {
    id: "betterx-android",
    getManifest() {
      return { name: "BetterX Android", version: MANIFEST_VERSION };
    },
    getURL(path: string) {
      return path;
    },
    async sendMessage(message: { type?: string; url?: string; [key: string]: unknown }) {
      if (message?.type === "PROXY_IMAGE" && typeof message.url === "string") {
        return { dataUrl: await proxyImage(message.url) };
      }
      if (message?.type === "PROXY_FETCH" && typeof message.url === "string") {
        return await proxyFetch(message.url, {
          method: typeof message.method === "string" ? message.method : undefined,
          headers: isObject(message.headers)
            ? Object.fromEntries(Object.entries(message.headers).map(([k, v]) => [k, String(v)]))
            : undefined,
          body: typeof message.body === "string" ? message.body : undefined,
          credentials: message.credentials === "include" ? "include" : "omit",
        });
      }
      if (message?.type === "OPEN_URL" && typeof message.url === "string") {
        await openExternalUrl(message.url);
        return { opened: true };
      }

      if (!getBridge()) {
        return null;
      }

      return await requestNative<unknown>(message as NativePayload);
    },
  },
  storage: {
    sync: {
      async get(keys?: string | string[] | Record<string, unknown>) {
        const { keys: requested, defaults } = normalizeKeyInput(keys);
        const result = await readStorage("sync", requested);
        return fillRequestedKeys(requested, defaults, result);
      },
      async set(items: Record<string, unknown>) {
        await writeStorage("sync", items);
      },
      async remove(keys: string | string[]) {
        await removeStorage("sync", keys);
      },
    },
    local: {
      async get(keys?: string | string[] | Record<string, unknown>) {
        const { keys: requested, defaults } = normalizeKeyInput(keys);
        const result = await readStorage("local", requested);
        return fillRequestedKeys(requested, defaults, result);
      },
      async set(items: Record<string, unknown>) {
        await writeStorage("local", items);
      },
      async remove(keys: string | string[]) {
        await removeStorage("local", keys);
      },
    },
    onChanged: {
      addListener(listener: StorageListener) {
        storageListeners.add(listener);
      },
      removeListener(listener: StorageListener) {
        storageListeners.delete(listener);
      },
    },
  },
  tabs: {
    async query(queryInfo: { url?: string[] }) {
      const currentUrl = window.location.href;
      if (!queryInfo?.url?.length) {
        return [{ id: 1, active: true, url: currentUrl, title: document.title }];
      }
      if (queryInfo.url.some((pattern) => matchesPattern(currentUrl, pattern))) {
        return [{ id: 1, active: true, url: currentUrl, title: document.title }];
      }
      return [];
    },
    async create(details: { url?: string }) {
      if (details.url) {
        window.open(details.url, "_blank", "noopener,noreferrer");
      }
      return { id: 2, url: details.url ?? window.location.href, active: false };
    },
  },
} as const;

export default browser;
