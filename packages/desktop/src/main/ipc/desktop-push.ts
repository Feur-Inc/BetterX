import { type IpcMainInvokeEvent, type Session, ipcMain } from "electron";
import type { DesktopPushService } from "../services/desktop-push.js";
import { getSetting, setSetting } from "../services/settings.js";
import { assertTrustedSender, isTrustedRendererUrl, validateDesktopPushScope } from "./security.js";

export function configureDesktopNotificationPermissions(desktopSession: Session): void {
  desktopSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
    callback(
      (permission === "notifications" || permission === "fullscreen") &&
        isTrustedRendererUrl(details.requestingUrl)
    );
  });
  desktopSession.setPermissionCheckHandler((_contents, permission, requestingOrigin) => {
    return (
      (permission === "notifications" || permission === "fullscreen") &&
      isTrustedRendererUrl(requestingOrigin)
    );
  });
}

export function registerDesktopPushHandlers(service: DesktopPushService): void {
  function checkScope(event: IpcMainInvokeEvent, scope: unknown): string {
    assertTrustedSender(event);
    return validateDesktopPushScope(scope, event.senderFrame?.url ?? event.sender.getURL());
  }

  ipcMain.handle("desktop-push:get-subscription", (event, scope: unknown) => {
    return service.getSubscription(checkScope(event, scope));
  });
  ipcMain.handle("desktop-push:subscribe", async (event, scope: unknown, key: unknown) => {
    const validatedScope = checkScope(event, scope);
    if (typeof key !== "string" || !/^[A-Za-z0-9_+/-]{87}={0,1}$/.test(key)) {
      throw new Error("Invalid push application server key");
    }
    const decodedKey = Buffer.from(key, "base64url");
    if (decodedKey.length !== 65 || decodedKey[0] !== 4) {
      throw new Error("Invalid push application server key");
    }
    const subscription = await service.subscribe(validatedScope, key);
    if (!getSetting("minimizeToTray")) setSetting("minimizeToTray", true);
    return subscription;
  });
  ipcMain.handle("desktop-push:unsubscribe", (event, scope: unknown) => {
    return service.unsubscribe(checkScope(event, scope));
  });
}
