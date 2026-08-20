import { Devs, OptionType, definePlugin, logger } from "@betterx/core";

const URL_PATTERN = /(https?:\/\/(www\.)?(x|twitter)\.com\/[^/]+\/status\/\d+)/i;

let fixupxHandler: ((e: ClipboardEvent) => void) | null = null;
let fixupxLastUrl: string | null = null;
let fixupxLastTime = 0;

export default definePlugin({
  name: "FixUpX",
  description: "Transforms copied tweet URLs to use FixupX, vxTwitter, or FxTwitter domain",
  authors: [Devs.Mopi],
  options: {
    domain: {
      type: OptionType.SELECT,
      default: "fixupx.com",
      description: "Domain to transform tweet URLs to",
      options: [
        { label: "FixupX", value: "fixupx.com" },
        { label: "VxTwitter", value: "vxtwitter.com" },
        { label: "FxTwitter", value: "fxtwitter.com" },
        { label: "GirlCockX", value: "girlcockx.com" },
      ],
    },
  },

  start() {
    const settings = this.settings;
    fixupxHandler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      setTimeout(() => {
        navigator.clipboard
          .readText()
          .then((text) => {
            if (!URL_PATTERN.test(text)) return;
            try {
              const url = new URL(text);
              if (
                (url.hostname === "x.com" || url.hostname === "twitter.com") &&
                url.pathname.includes("/status/")
              ) {
                url.hostname = settings.store.domain;
                const transformed = url.toString();
                const now = Date.now();
                if (fixupxLastUrl === transformed && now - fixupxLastTime < 1000) return;
                fixupxLastUrl = transformed;
                fixupxLastTime = now;
                navigator.clipboard.writeText(transformed).catch(() => undefined);
              }
            } catch (err) {
              logger.error("FixUpX: failed to parse URL", err);
            }
          })
          .catch((err) => logger.error("FixUpX: failed to read clipboard", err));
      }, 100);
    };
    document.addEventListener("copy", fixupxHandler);
  },

  stop() {
    if (fixupxHandler) {
      document.removeEventListener("copy", fixupxHandler);
      fixupxHandler = null;
    }
    fixupxLastUrl = null;
    fixupxLastTime = 0;
  },
});
