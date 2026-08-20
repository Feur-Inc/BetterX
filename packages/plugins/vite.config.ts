import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@betterx/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "BetterXPlugins",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["@betterx/core", "codemirror"],
    },
  },
});
