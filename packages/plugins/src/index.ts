import type { PluginDefinition } from "@betterx/core";

// ─── Meta plugin (must be registered first) ───────────────────────────────────
import BetterXPlugin from "./BetterX/index.js";

// ─── Library plugins ──────────────────────────────────────────────────────────
import ProxyFetch from "./ProxyFetch/index.js";
import SharedObserver from "./SharedObserver/index.js";

import AdBlocker from "./AdBlocker/index.js";
import BringTwitterBack from "./BringTwitterBack/index.js";
import ClickEffects from "./ClickEffects/index.js";
import CustomAccentColor from "./CustomAccentColor/index.js";
import DMDrawerResizer from "./DMDrawerResizer/index.js";
import DontOverthink from "./DontOverthink/index.js";
import FixUpX from "./FixUpX/index.js";
import GifFavorites from "./GifFavorites/index.js";
import MenuReorder from "./MenuReorder/index.js";
import NoTrending from "./NoTrending/index.js";
import QuickEmoji from "./QuickEmoji/index.js";
import RemoveGrok from "./RemoveGrok/index.js";
import RemovePremium from "./RemovePremium/index.js";
import SensitiveMedia from "./SensitiveMedia/index.js";
import TweetScreenshot from "./TweetScreenshot/index.js";
import ImageMagnifier from "./imageMagnifier/index.js";
import MeowAd from "./meowad/index.js";
import Oneko from "./oneko/index.js";

export const allPlugins: PluginDefinition[] = [
  // Meta plugin first
  BetterXPlugin,
  // Library plugins — dependency order also enforced at runtime
  ProxyFetch,
  SharedObserver,
  AdBlocker,
  BringTwitterBack,
  ClickEffects,
  CustomAccentColor,
  DMDrawerResizer,
  DontOverthink,
  FixUpX,
  GifFavorites,
  ImageMagnifier,
  MenuReorder,
  MeowAd,
  NoTrending,
  Oneko,
  QuickEmoji,
  RemoveGrok,
  RemovePremium,
  SensitiveMedia,
  TweetScreenshot,
];

export {
  BetterXPlugin,
  ProxyFetch,
  SharedObserver,
  AdBlocker,
  BringTwitterBack,
  ClickEffects,
  CustomAccentColor,
  DMDrawerResizer,
  DontOverthink,
  FixUpX,
  GifFavorites,
  ImageMagnifier,
  MenuReorder,
  MeowAd,
  NoTrending,
  Oneko,
  QuickEmoji,
  RemoveGrok,
  RemovePremium,
  SensitiveMedia,
  TweetScreenshot,
};
