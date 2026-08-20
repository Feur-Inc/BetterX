import { resolve } from "node:path";
import { type UserConfig, defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    outDir: "dist/main",
    emptyOutDir: false,
    rollupOptions: {
      // Externalize everything except local files and @betterx workspace packages
      external: (id: string) =>
        !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("@betterx/"),
    },
  },
  resolve: {
    alias: {
      "@betterx/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
} as UserConfig);
