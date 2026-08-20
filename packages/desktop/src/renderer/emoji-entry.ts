import { gemoji, nameToEmoji } from "gemoji";

Object.assign(globalThis, {
  __betterxEmojiData: { gemoji, nameToEmoji },
});
