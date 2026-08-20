import { resolve } from "node:path";
import { type UserConfig, defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/renderer/editor-entry.ts"),
      formats: ["iife"],
      name: "BetterXEditor",
      fileName: "editor",
    },
    outDir: "dist/bundle",
    emptyOutDir: false,
    sourcemap: false,
  },
} as UserConfig);
