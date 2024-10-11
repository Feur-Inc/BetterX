import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let observer;
let checkDivId;

function addTimer(composerBox) {
    if (!composerBox.parentNode.querySelector("#tweet-timer")) {
        const timerDiv = document.createElement("div");
        timerDiv.id = "tweet-timer";
        timerDiv.style.color = "rgb(29, 155, 240)";
        timerDiv.style.fontSize = "14px";
        timerDiv.style.fontWeight = "700";
        timerDiv.style.fontFamily =
            "TwitterChirp, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
        timerDiv.style.marginTop = "10px";
        composerBox.parentNode.insertBefore(timerDiv, composerBox.nextSibling);
        startTimerProcess(timerDiv);
    }
}

function startTimerProcess(timerDiv) {
    let timerId;
    function checkButtonAndStartTimer() {
        const tweetButton = document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
        if (tweetButton && !tweetButton.disabled) {
            if (!timerId) {
                startTimer();
            }
        } else {
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
                timerDiv.textContent = "";
            }
        }
    }
    function startTimer() {
        let timeLeft = 10;
        timerDiv.textContent = `Time remaining: ${timeLeft} seconds`;
        timerId = setInterval(() => {
            timeLeft--;
            timerDiv.textContent = `Time remaining: ${timeLeft} seconds`;
            if (timeLeft < 0) {
                clearInterval(timerId);
                timerId = null;
                timerDiv.textContent = "Time's up!";
                const tweetButton = document.querySelector(
                    '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]'
                );
                if (tweetButton) {
                    tweetButton.click();
                }
            }
        }, 1000);
    }
    checkDivId = setInterval(checkButtonAndStartTimer, 500);
}

function checkAndAddTimer() {
    let composerBox = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (composerBox && !composerBox.parentNode.querySelector("#tweet-timer")) {
        addTimer(composerBox);
    }
}

function initializePlugin() {
    if (document.body) {
        observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === "childList") {
                    checkAndAddTimer();
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        checkAndAddTimer();
    } else {
        window.addEventListener('DOMContentLoaded', initializePlugin);
    }
}

export default definePlugin({
    name: "DontOverthink",
    description: "Adds a timer to automatically send tweets after 10 seconds",
    authors: [Devs.Mopi, Devs.TPM28],
    start() {
        initializePlugin();
    },
    stop() {
        if (observer) {
            observer.disconnect();
        }
        if (checkDivId) {
            clearInterval(checkDivId);
        }
        const timerDiv = document.querySelector("#tweet-timer");
        if (timerDiv) {
            timerDiv.remove();
        }
        // Remove the event listener if it was added
        window.removeEventListener('DOMContentLoaded', initializePlugin);
    }
});