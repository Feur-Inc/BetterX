import { Devs, definePlugin, notifications } from "@betterx/core";

const SCREENSHOT_BTN_HTML = `
<button aria-label="Screenshot" role="button"
  class="css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l"
  data-testid="bx-screenshot" type="button">
  <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q" style="color:rgb(113,118,123)">
    <div class="css-175oi2r r-xoduu5">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi">
        <path d="M9.697 3H14.303l1.046 2H19.5C20.881 5 22 6.119 22 7.5v11c0 1.381-1.119 2.5-2.5 2.5h-15C3.119 21 2 19.881 2 18.5v-11C2 6.119 3.119 5 4.5 5h4.151l1.046-2zM12 8c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-5zm0 2c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"/>
      </svg>
    </div>
  </div>
</button>
`.trim();

let screenshotObserver: MutationObserver | null = null;
let screenshotFrame: number | null = null;

function dataUrlToBlob(dataUrl: string): Blob {
  const [header = "", b64 = ""] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function copyDataUrlToClipboard(dataUrl: string): Promise<void> {
  const blob = dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

async function captureTweet(tweet: HTMLElement): Promise<void> {
  try {
    // Use html2canvas if available, otherwise notify that we need it
    const win = window as unknown as Record<string, unknown>;
    const h2c = win.html2canvas as
      | ((el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>)
      | undefined;

    if (!h2c) {
      // In Electron, use the IPC capture API
      const electronAPI = win.electronAPI as
        | {
            captureElement?: (rect: {
              x: number;
              y: number;
              width: number;
              height: number;
            }) => Promise<string>;
          }
        | undefined;

      if (electronAPI?.captureElement) {
        tweet.scrollIntoView({ block: "center" });
        await new Promise((r) => setTimeout(r, 100));
        // DOMRect properties are prototype getters - serialize to a plain object
        // so structured clone over IPC doesn't drop them
        const r = tweet.getBoundingClientRect();
        await electronAPI.captureElement({ x: r.x, y: r.y, width: r.width, height: r.height });
        // Main process (capture.ts) already wrote to clipboard via nativeImage
        notifications.showSuccess("Tweet screenshot copied to clipboard!");
      } else {
        notifications.showInfo("Screenshot requires the Electron desktop app.");
      }
      return;
    }

    tweet.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 100));

    const canvas = await h2c(tweet, { useCORS: true, allowTaint: false });
    const dataUrl = canvas.toDataURL("image/png");
    await copyDataUrlToClipboard(dataUrl);
    notifications.showSuccess("Tweet screenshot copied to clipboard!");
  } catch (err) {
    notifications.showError("Screenshot failed. Check console for details.");
    console.error("TweetScreenshot:", err);
  }
}

function addScreenshotButton(tweet: HTMLElement): void {
  if (tweet.querySelector('[data-testid="bx-screenshot"]')) return;

  // Find the action bar
  const actionBar = tweet.querySelector<HTMLElement>('[role="group"]');
  if (!actionBar) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = SCREENSHOT_BTN_HTML;
  const btn = wrapper.firstElementChild as HTMLElement;
  actionBar.appendChild(btn);

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await captureTweet(tweet);
  });
}

export default definePlugin({
  name: "TweetScreenshot",
  description: "Adds a screenshot button to tweets that copies the tweet as an image",
  authors: [Devs.TPM28],
  platform: "desktop",

  start() {
    const pending = new Set<HTMLElement>();
    let scheduled = false;

    screenshotObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.matches('article[data-testid="tweet"]')) pending.add(element);
            element
              .querySelectorAll<HTMLElement>('article[data-testid="tweet"]')
              .forEach((t) => pending.add(t));
          }
        }
      }
      if (!scheduled) {
        scheduled = true;
        screenshotFrame = requestAnimationFrame(() => {
          screenshotFrame = null;
          pending.forEach((t) => addScreenshotButton(t));
          pending.clear();
          scheduled = false;
        });
      }
    });
    screenshotObserver.observe(document.body, { childList: true, subtree: true });
    document
      .querySelectorAll<HTMLElement>('article[data-testid="tweet"]')
      .forEach((t) => addScreenshotButton(t));
  },

  stop() {
    screenshotObserver?.disconnect();
    screenshotObserver = null;
    if (screenshotFrame !== null) cancelAnimationFrame(screenshotFrame);
    screenshotFrame = null;
    document.querySelectorAll('[data-testid="bx-screenshot"]').forEach((btn) => btn.remove());
  },
});
