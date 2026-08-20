import {
  Devs,
  OptionType,
  definePlugin,
  injectStyle,
  notifications,
  removeStyle,
} from "@betterx/core";

const BLUR_CSS = `
/* Blur the entire media container for sensitive tweets */
article[data-betterx-sensitive] [data-testid="tweetPhoto"] {
  filter: blur(25px) !important;
  overflow: hidden !important;
  transition: filter 0.25s ease !important;
}
article[data-betterx-sensitive] [data-testid="videoPlayer"] {
  filter: blur(25px) !important;
  overflow: hidden !important;
  transition: filter 0.25s ease !important;
}

/* Reveal on hover */
article[data-betterx-sensitive] [data-testid="tweetPhoto"]:hover,
article[data-betterx-sensitive] [data-testid="videoPlayer"]:hover {
  filter: none !important;
}
`;

export default definePlugin({
  name: "SensitiveMedia",
  description: "Automatically reveals age-restricted media without age verification",
  authors: [Devs.Mopi],
  requiresRestart: true,
  options: {
    blurSensitive: {
      type: OptionType.BOOLEAN,
      default: false,
      label: "Blur sensitive media",
      description: "Keep sensitive media blurred and reveal on hover instead of showing directly",
      onChange(value) {
        localStorage.setItem("betterx:sensitiveMedia:blur", value ? "1" : "0");
        notifications.showWarning(`"SensitiveMedia" requires a page refresh to apply.`, {
          duration: 0,
          actions: [{ label: "Refresh now", callback: () => location.reload() }],
        });
      },
    },
  },

  start() {
    localStorage.setItem("betterx:sensitiveMedia", "1");
    const blur = this.settings.store.blurSensitive;
    localStorage.setItem("betterx:sensitiveMedia:blur", blur ? "1" : "0");
    if (blur) {
      injectStyle(BLUR_CSS, "betterx-sensitive-blur");
    }
  },

  stop() {
    localStorage.setItem("betterx:sensitiveMedia", "0");
    removeStyle("betterx-sensitive-blur");
  },
});
