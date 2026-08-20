// ─── Main-world bridge registry ───────────────────────────────────────────────
// Mirrors the image/fetch proxy pattern: the platform registers an implementation
// at startup; plugins call the public helpers without caring which platform runs.
//
// On the extension the implementation routes through CustomEvents to the
// main-world shim (main-world.ts). On desktop there is no shim, so calls
// reject immediately - callers should handle that gracefully.
//
// Usage in a plugin:
//
//   import { dispatchReactState } from "@betterx/core";
//
//   // Flip a useState(true) hook to false on the element's ancestor fiber:
//   const ok = await dispatchReactState(el, true, false).catch(() => false);

type BridgeFn = (action: string, args: unknown[]) => Promise<unknown>;
let _bridge: BridgeFn | undefined;

/**
 * Register the platform's main-world bridge implementation.
 * Called once by the platform layer - plugins must not call this.
 */
export function setMainWorldBridge(fn: BridgeFn): void {
  _bridge = fn;
}

/**
 * Call an action on the main-world shim and await its result.
 * Rejects immediately if no bridge has been registered (e.g. on desktop).
 */
export function callMainWorld<T = unknown>(action: string, ...args: unknown[]): Promise<T> {
  if (!_bridge) return Promise.reject(new Error("[BetterX] No main-world bridge registered"));
  return _bridge(action, args) as Promise<T>;
}

/**
 * Walk up the React fiber tree from `el` and dispatch a state update,
 * flipping the first hook whose current value equals `from` to `to`.
 *
 * Requires the main-world shim to be running. Falls back gracefully (returns
 * false) if the bridge is unavailable or the element has no matching fiber.
 *
 * @example
 * // Reveal Twitter's sensitive-media overlay by toggling its hidden state:
 * const revealed = await dispatchReactState(showButton, true, false);
 */
export async function dispatchReactState(
  el: Element,
  from: unknown,
  to: unknown
): Promise<boolean> {
  // Stamp a temporary unique attribute so the main world can find the element
  const attr = "data-betterx-fiber-target";
  const id = crypto.randomUUID();
  el.setAttribute(attr, id);
  try {
    return await callMainWorld<boolean>("dispatchReactState", `[${attr}="${id}"]`, from, to);
  } catch {
    return false;
  } finally {
    el.removeAttribute(attr);
  }
}
