import { Devs, definePlugin } from "@betterx/core";
import { DOMObserver } from "../SharedObserver/index.js";

const CAT_PFP =
  "https://lh3.googleusercontent.com/uKLDTLmDr98dhxSjpNa3X4BuLLcPRLncbY9KCvPodXuIg4-Hj0hYfZWcRc29td0Aksm1EoQgHqYA3lf8wlzvugXnAs0";
const CAT_IMG = "https://pbs.twimg.com/media/GMLPkawXcAAvWiQ?format=jpg&name=small";

const MEOW_TEXT = `meow meow mrrow meow mprrr :3 mrow meow :3 mrowww mrrrow :3

mrow meow purrrrr :3 mrow meow mrrrow mrowwww meow meow mrrrrrr mrowww mrow meow purrrrr :3 mrow meow purrrrr meow purrrrr meow

meoww mrrow :3 purrrrr meow :3 meow mrow meowww mrrrow :3`;

let unsubscribeObserver: (() => void) | null = null;

function getAds(): HTMLElement[] {
  const ads: HTMLElement[] = [];
  document
    .querySelectorAll<HTMLElement>("article[data-testid=tweet]:not(.meowified)")
    .forEach((tweet) => {
      const span = tweet.querySelector("div.r-1kkk96v span.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3");
      if (span && (span as HTMLElement).innerText === "Ad") {
        ads.push(tweet);
      }
    });
  return ads;
}

function replaceAds(): void {
  getAds().forEach((tweet) => {
    tweet.classList.add("meowified");

    const pfp = tweet.querySelector<HTMLElement>("[style*=profile_images]");
    const tweetText = tweet.querySelector<HTMLElement>("[data-testid=tweetText]");
    const cardContainer = tweet.querySelector<HTMLElement>(
      "div:has(> [data-testid='card.wrapper'])"
    );
    const card = cardContainer?.querySelector<HTMLElement>("[data-testid='card.wrapper']");
    const profile = tweet.querySelector<HTMLElement>("[data-testid=User-Name]");
    const displayName = profile?.querySelector<HTMLElement>("a:not([tabindex='-1']) span");
    const handle = profile?.querySelector<HTMLElement>("a[tabindex='-1'] span");

    // Replace background images (tweet photos)
    tweet.querySelectorAll<HTMLElement>("div:has(> img)").forEach((imageDiv) => {
      const image = imageDiv.querySelector<HTMLElement>(
        "div[style*=twimg]:not([style*=profile_images])"
      );
      if (image) {
        image.style.backgroundImage = `url(${CAT_IMG})`;
        image.style.backgroundSize = "100% 100%";
      }
    });

    // Replace videos
    tweet.querySelectorAll<HTMLElement>(":has(> video > source)").forEach((videoContainer) => {
      const video = videoContainer.querySelector<HTMLVideoElement>("video");
      if (video) video.setAttribute("poster", CAT_IMG);
      videoContainer.querySelectorAll("source").forEach((source) => {
        source.removeAttribute("src");
      });
      const html = videoContainer.innerHTML;
      videoContainer.innerHTML = "";
      videoContainer.innerHTML = html;
    });

    // Replace profile elements
    if (pfp) pfp.style.backgroundImage = `url(${CAT_PFP})`;
    if (displayName) displayName.innerText = ":3";
    if (handle) handle.innerText = "@twitter";

    // Replace tweet text
    if (tweetText) tweetText.innerText = MEOW_TEXT;

    // Replace card content
    if (cardContainer && card) {
      const cardLink = cardContainer.querySelector<HTMLElement>("a[dir=ltr]");
      if (cardLink) cardLink.innerText = "From twitter.com";
      card.querySelectorAll<HTMLElement>("div[dir=ltr] > span").forEach((cardTitle) => {
        cardTitle.innerHTML = ":3";
      });
    }
  });
}

export default definePlugin({
  name: "MeowAd",
  description: "Replaces ads with cute cats :3",
  authors: [Devs.Mopi, Devs.IHateSpawn],
  dependencies: ["SharedObserver"],
  requiresRestart: true,

  start() {
    replaceAds();
    unsubscribeObserver = DOMObserver.subscribe(replaceAds);
  },

  stop() {
    unsubscribeObserver?.();
    unsubscribeObserver = null;
  },
});
