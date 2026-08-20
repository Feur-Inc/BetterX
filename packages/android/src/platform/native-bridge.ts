type StorageAreaName = "sync" | "local";

type NativeBridge = {
  postMessage(message: string): void;
  onmessage: ((event: { data: string }) => void) | null;
};

export type NativePayload = {
  type: string;
  area?: StorageAreaName | undefined;
  keys?: string[] | undefined;
  items?: Record<string, unknown> | undefined;
  url?: string | undefined;
  method?: string | undefined;
  headers?: Record<string, string> | undefined;
  body?: string | undefined;
  credentials?: "include" | "omit" | undefined;
};

const BRIDGE_TOKEN = "__BETTERX_NATIVE_TOKEN__";
const initialBridge = (
  globalThis as typeof globalThis & { BetterXAndroid?: NativeBridge | undefined }
).BetterXAndroid;
const nativePostMessage = initialBridge?.postMessage.bind(initialBridge);
try {
  (globalThis as typeof globalThis & { BetterXAndroid?: NativeBridge | undefined }).BetterXAndroid =
    undefined;
} catch {
  // Some WebView versions expose the bridge as non-configurable. The native
  // capability token still rejects calls made outside this closure.
}

type NativeResponse = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

const pendingRequests = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason: Error) => void }
>();

let requestSeq = 0;
let hookedNativeBridge = false;

export function getBridge(): NativeBridge | undefined {
  return initialBridge;
}

export async function requestNative<T>(payload: NativePayload): Promise<T> {
  const bridge = getBridge();
  if (!bridge) {
    throw new Error("BetterXAndroid bridge unavailable");
  }

  if (!hookedNativeBridge) {
    hookedNativeBridge = true;
    bridge.onmessage = (event) => {
      let message: NativeResponse | null = null;
      try {
        message = JSON.parse(event.data) as NativeResponse;
      } catch {
        return;
      }

      if (!message?.id) return;
      const pending = pendingRequests.get(message.id);
      if (!pending) return;
      pendingRequests.delete(message.id);

      if (message.ok) {
        pending.resolve(message.result);
      } else {
        pending.reject(new Error(message.error ?? "Native bridge request failed"));
      }
    };
  }

  const id = `${Date.now().toString(36)}-${++requestSeq}`;
  const request = { id, token: BRIDGE_TOKEN, ...payload };

  return await new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`BetterXAndroid request timed out: ${payload.type}`));
    }, 15_000);

    pendingRequests.set(id, {
      resolve: (value) => {
        window.clearTimeout(timeout);
        resolve(value as T);
      },
      reject: (reason) => {
        window.clearTimeout(timeout);
        reject(reason);
      },
    });

    try {
      if (!nativePostMessage) throw new Error("BetterXAndroid bridge unavailable");
      nativePostMessage(JSON.stringify(request));
    } catch (error) {
      pendingRequests.delete(id);
      window.clearTimeout(timeout);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
