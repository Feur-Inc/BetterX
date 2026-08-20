import { Devs, OptionType, definePlugin } from "@betterx/core";
import { DOMObserver } from "../SharedObserver/index.js";

let unsubscribeObserver: (() => void) | null = null;
const dontOverthinkTimers = new Set<ReturnType<typeof setInterval>>();

export default definePlugin({
  name: "DontOverthink",
  description: "Adds a timer to automatically send tweets after a customizable duration",
  authors: [Devs.Mopi, Devs.TPM28],
  dependencies: ["SharedObserver"],
  requiresRestart: true,
  options: {
    timerDuration: {
      type: OptionType.NUMBER,
      default: 10,
      min: 1,
      max: 300,
      label: "Timer duration (seconds)",
      description: "How long to wait before auto-posting (1–300 seconds)",
    },
  },

  start() {
    const getDuration = (): number => this.settings.store.timerDuration ?? 10;

    const addTimer = (composerBox: Element): void => {
      if (composerBox.parentElement?.querySelector("[data-betterx-tweet-timer]")) return;
      const timerDiv = document.createElement("div");
      timerDiv.dataset.betterxTweetTimer = "1";
      timerDiv.style.cssText =
        "color:rgb(29,155,240);font-size:14px;font-weight:700;margin-top:10px;font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
      composerBox.parentElement?.insertBefore(timerDiv, composerBox.nextSibling);

      let timerId: ReturnType<typeof setInterval> | null = null;

      const findPostButton = (): HTMLButtonElement | null => {
        let scope: Element | null = composerBox.parentElement;
        while (scope && scope !== document.body) {
          const button = scope.querySelector<HTMLButtonElement>(
            '[data-testid="tweetButton"],[data-testid="tweetButtonInline"]'
          );
          if (button) return button;
          scope = scope.parentElement;
        }
        return null;
      };

      const checkAndStart = setInterval(() => {
        const btn = findPostButton();
        if (btn && !btn.disabled) {
          if (!timerId) {
            let left = getDuration();
            timerDiv.textContent = `Time remaining: ${left} seconds`;
            timerId = setInterval(() => {
              left--;
              timerDiv.textContent = `Time remaining: ${left} seconds`;
              if (left <= 0) {
                if (timerId) {
                  clearInterval(timerId);
                  dontOverthinkTimers.delete(timerId);
                }
                timerId = null;
                timerDiv.textContent = "Time's up!";
                btn.click();
              }
            }, 1000);
            dontOverthinkTimers.add(timerId);
          }
        } else if (timerId) {
          clearInterval(timerId);
          dontOverthinkTimers.delete(timerId);
          timerId = null;
          timerDiv.textContent = "";
        }
      }, 500);
      dontOverthinkTimers.add(checkAndStart);
    };

    const checkForComposer = (): void => {
      document
        .querySelectorAll('[data-testid="tweetTextarea_0"],[data-testid="tweetTextarea_1"]')
        .forEach((box) => {
          if (!box.parentElement?.querySelector("[data-betterx-tweet-timer]")) addTimer(box);
        });
    };

    unsubscribeObserver = DOMObserver.subscribe(checkForComposer);
    checkForComposer();
  },

  stop() {
    unsubscribeObserver?.();
    unsubscribeObserver = null;
    for (const id of dontOverthinkTimers) clearInterval(id);
    dontOverthinkTimers.clear();
    document.querySelectorAll("[data-betterx-tweet-timer]").forEach((timer) => timer.remove());
  },
});
