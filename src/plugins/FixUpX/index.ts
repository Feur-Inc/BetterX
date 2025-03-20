import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { logger } from "@utils/logger";

export default definePlugin({
    name: "FixUpX",
    description: "Transforms copied URLs to use FixupX domain and more",
    authors: [Devs.Mopi],
    requiresRestart: false,
    options: {
        domain: {
            type: OptionType.SELECT,
            default: "fixupx.com",
            description: "Domain to transform X URLs to",
            options: [
                { label: "FixupX", value: "fixupx.com" },
                { label: "vxTwitter", value: "vxtwitter.com" },
                { label: "FxTwitter", value: "fxtwitter.com" }
            ]
        }
    },

    // Track the last transformed URL and timestamp
    lastTransformedUrl: null as string | null,
    lastTransformTime: 0,
    debounceTime: 1000, // 1 second debounce
    boundClipboardHandler: null as ((event: ClipboardEvent) => void) | null,

    transformUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            if ((urlObj.hostname === 'x.com' || urlObj.hostname === 'twitter.com') && 
                 urlObj.pathname.includes('/status/')) {
                if (this.settings?.store?.domain) {
                    urlObj.hostname = this.settings.store.domain;
                    return urlObj.toString();
                }
            }
        } catch (e) {
            logger.error("Failed to parse URL:", e);
        }
        return url;
    },

    clipboardCopyHandler(event: ClipboardEvent): void {
        // Check if it's a text copy
        if (event.clipboardData && typeof event.clipboardData.getData === 'function') {
            setTimeout(() => {
                // Use timeout to access the clipboard data after the copy event
                navigator.clipboard.readText().then((text: string) => {
                    // Check if it looks like an X URL
                    if (/(https?:\/\/(www\.)?(x|twitter)\.com\/[^\/]+\/status\/\d+)/i.test(text)) {
                        const transformedUrl = this.transformUrl(text);
                        if (transformedUrl !== text) {
                            // Check if this is a duplicate transformation within debounce period
                            const now = Date.now();
                            if (this.lastTransformedUrl === transformedUrl && 
                                now - this.lastTransformTime < this.debounceTime) {
                                // Skip duplicate transformation
                                return;
                            }
                            
                            // Write the transformed URL to clipboard
                            navigator.clipboard.writeText(transformedUrl).catch(() => {});
                            
                            // Update the last transformed URL and timestamp
                            this.lastTransformedUrl = transformedUrl;
                            this.lastTransformTime = now;
                        }
                    }
                }).catch((err) => {
                    logger.error("Failed to read clipboard:", err);
                });
            }, 100);
        }
    },

    start(): void {
        this.boundClipboardHandler = this.clipboardCopyHandler.bind(this);
        document.addEventListener('copy', this.boundClipboardHandler);
        
        // Reset tracking variables when starting
        this.lastTransformedUrl = null;
        this.lastTransformTime = 0;
    },

    stop(): void {
        if (this.boundClipboardHandler) {
            document.removeEventListener('copy', this.boundClipboardHandler);
            this.boundClipboardHandler = null;
        }
    }
});
