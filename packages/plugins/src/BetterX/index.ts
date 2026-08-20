import {
  BETTERX_VERSION,
  Devs,
  OptionType,
  TabRegistry,
  definePlugin,
  getSettingsModal,
  notifications,
} from "@betterx/core";

type NotifPos = "bottom-right" | "bottom-left" | "top-right" | "top-left";

function applyPosition(pos: NotifPos): void {
  notifications.setPosition(pos);
}

export default definePlugin({
  name: "BetterX",
  description: "Core settings for BetterX itself.",
  authors: [Devs.Mopi, Devs.TPM28],
  version: BETTERX_VERSION,
  isMeta: true,

  options: {
    notifPosition: {
      type: OptionType.SELECT,
      label: "Notification position",
      description: "Where toast notifications appear on screen.",
      default: "bottom-right",
      options: [
        { label: "Bottom right", value: "bottom-right" },
        { label: "Bottom left", value: "bottom-left" },
        { label: "Top right", value: "top-right" },
        { label: "Top left", value: "top-left" },
      ],
      onChange(pos) {
        applyPosition(pos as NotifPos);
      },
    },
    notifDuration: {
      type: OptionType.NUMBER,
      label: "Notification duration (ms)",
      description: "How long notifications stay visible. Set to 0 to keep them until dismissed.",
      default: 5000,
      min: 0,
      max: 3_600_000,
      step: 500,
      onChange(ms) {
        notifications.setDefaultDuration(ms as number);
      },
    },
    showDevTab: {
      type: OptionType.BOOLEAN,
      label: "Show Developer tab",
      description: "Always show the Developer tab in settings, regardless of environment.",
      default: false,
      onChange(enabled) {
        TabRegistry.setTabHidden("developer", !enabled);
        // If the modal is open, close it so the tab list rebuilds on next open
        getSettingsModal()?.close(true);
      },
    },
  },

  start() {
    applyPosition(this.settings.store.notifPosition as NotifPos);
    notifications.setDefaultDuration(this.settings.store.notifDuration as number);
    TabRegistry.setTabHidden("developer", !this.settings.store.showDevTab);
  },

  stop() {},
});
