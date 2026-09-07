/// <reference types="bun" />
import { expect, mock, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { PUSH_NOTIFICATIONS_PATCH } from "./desktop-push.js";

function createPage(hostname = "x.com") {
  const data = {
    scope: "https://x.com/",
    endpoint: "https://push.example/subscription",
    p256dh: Buffer.from([4, 1, 2, 3]).toString("base64url"),
    auth: Buffer.from([5, 6, 7]).toString("base64url"),
    appServerKey: Buffer.from([4, 8, 9]).toString("base64url"),
    createdAt: 1,
  };
  const bridge = {
    subscribe: mock(async () => data),
    getSubscription: mock(async () => data),
    unsubscribe: mock(async () => true),
  };
  const nativeSubscribe = mock(async () => null);
  const nativeGetSubscription = mock(async () => null);
  class PushManager {
    subscribe = nativeSubscribe;
    getSubscription = nativeGetSubscription;
  }
  // Browser APIs live on the prototype, where the patch intercepts them.
  PushManager.prototype.subscribe = nativeSubscribe;
  PushManager.prototype.getSubscription = nativeGetSubscription;
  class PushSubscription {}
  class XMLHttpRequest {
    open() {}
    send() {}
  }
  const page = {
    location: { hostname, origin: `https://${hostname}` },
    betterxDesktopPush: bridge,
    navigator: { serviceWorker: { getRegistration: async () => ({ scope: data.scope }) } },
    document: { addEventListener() {} },
    fetch: mock(async () => new Response("{}")),
    setTimeout: () => 1,
    clearTimeout() {},
    console: { info() {}, warn() {} },
    PushManager,
    PushSubscription,
    XMLHttpRequest,
    ArrayBuffer,
    Uint8Array,
    URL,
    btoa,
    atob,
  };
  runInNewContext(PUSH_NOTIFICATIONS_PATCH, { ...page, window: page });
  const manager = Object.create(PushManager.prototype) as globalThis.PushManager;
  return { data, bridge, manager, nativeSubscribe, nativeGetSubscription, PushSubscription };
}

test("page push subscriptions use the scoped bridge and serialize Web Push keys", async () => {
  const { manager, bridge, data, nativeSubscribe, PushSubscription } = createPage();
  const key = new Uint8Array([0, 4, 8, 9, 0]).subarray(1, 4);
  const subscription = await manager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  expect(bridge.subscribe).toHaveBeenCalledWith(data.scope, data.appServerKey);
  expect(nativeSubscribe).not.toHaveBeenCalled();
  expect(subscription).toBeInstanceOf(PushSubscription);
  expect(subscription.toJSON()).toEqual({
    endpoint: data.endpoint,
    expirationTime: null,
    keys: { p256dh: data.p256dh, auth: data.auth },
  });
  expect(Array.from(new Uint8Array(subscription.getKey("auth") ?? new ArrayBuffer(0)))).toEqual([
    5, 6, 7,
  ]);
  expect(await subscription.unsubscribe()).toBe(true);
  expect(bridge.unsubscribe).toHaveBeenCalledWith(data.scope);
});

test("restores persisted desktop subscriptions before asking Chromium", async () => {
  const { manager, bridge, data, nativeGetSubscription } = createPage();
  expect((await manager.getSubscription())?.endpoint).toBe(data.endpoint);
  expect(bridge.getSubscription).toHaveBeenCalledWith(data.scope);
  expect(nativeGetSubscription).not.toHaveBeenCalled();
});

test("does not patch PushManager on unrelated origins", async () => {
  const { manager, bridge, nativeGetSubscription } = createPage("example.com");
  expect(await manager.getSubscription()).toBeNull();
  expect(nativeGetSubscription).toHaveBeenCalledTimes(1);
  expect(bridge.getSubscription).not.toHaveBeenCalled();
});
