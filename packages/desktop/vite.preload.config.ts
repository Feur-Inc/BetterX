import { resolve } from "node:path";
import { type UserConfig, defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/preload/index.ts"),
      formats: ["cjs"],
      fileName: "preload",
    },
    outDir: "dist/preload",
    emptyOutDir: false,
    rollupOptions: {
      external: (id: string) =>
        !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("@betterx/"),
    },
  },
} as UserConfig);
