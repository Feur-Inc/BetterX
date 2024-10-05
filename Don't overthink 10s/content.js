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
    console.log("Timer div inserted successfully");
    startTimerProcess(timerDiv);
  }
}

function startTimerProcess(timerDiv) {
  let timerId;
  let checkDivId;

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
  let composerBox;

  composerBox = document.querySelector('[data-testid="tweetTextarea_0"]');

  if (composerBox && !composerBox.parentNode.querySelector("#tweet-timer")) {
    addTimer(composerBox);
  }
}

const observer = new MutationObserver((mutations) => {
  for (let mutation of mutations) {
    if (mutation.type === "childList") {
      checkAndAddTimer();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

checkAndAddTimer();
