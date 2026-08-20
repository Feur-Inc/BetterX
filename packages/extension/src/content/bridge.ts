// ─── Main-world bridge - extension side ───────────────────────────────────────
// Registers the CustomEvent transport with @betterx/core so that any plugin
// calling `callMainWorld()` or `dispatchReactState()` is routed through the
// main-world shim (main-world.ts) automatically.

import { setMainWorldBridge } from "@betterx/core";

export function registerMainWorldBridge(): void {
  setMainWorldBridge(
    (action, args) =>
      new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        const eventName = `betterx:result:${id}`;
        const onResult = (event: Event): void => {
          clearTimeout(timer);
          resolve((event as CustomEvent).detail);
        };
        const timer = setTimeout(() => {
          document.removeEventListener(eventName, onResult);
          reject(new Error(`[BetterX] callMainWorld timeout: ${action}`));
        }, 5_000);
        document.addEventListener(eventName, onResult, { once: true });
        document.dispatchEvent(new CustomEvent("betterx:call", { detail: { id, action, args } }));
      })
  );
}
