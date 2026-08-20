import { resolve } from "node:path";
import { type UserConfig, defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/renderer/emoji-entry.ts"),
      formats: ["iife"],
      name: "BetterXEmoji",
      fileName: "emoji",
    },
    outDir: "dist/bundle",
    emptyOutDir: false,
    sourcemap: false,
  },
} as UserConfig);
