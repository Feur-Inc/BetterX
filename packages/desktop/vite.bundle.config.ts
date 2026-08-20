import { resolve } from "node:path";
// Builds the injected bundle (BetterX content script for Electron)
import { type UserConfig, defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/renderer/bundle-entry.ts"),
      formats: ["iife"],
      name: "BetterXBundle",
      fileName: "bundle",
    },
    outDir: "dist/bundle",
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      // All deps bundled into the IIFE
      external: [],
    },
  },
  define: {
    __BETTERX_DESKTOP__: "true",
  },
  resolve: {
    alias: {
      "@betterx/core": resolve(__dirname, "../core/src/index.ts"),
      "@betterx/plugins": resolve(__dirname, "../plugins/src/index.ts"),
    },
  },
} as UserConfig);
