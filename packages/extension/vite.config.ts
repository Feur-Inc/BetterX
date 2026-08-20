import { resolve } from "node:path";
import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

const browser = process.env.BROWSER ?? "chrome";

export default defineConfig({
  resolve: {
    alias: {
      "@betterx/core": resolve(__dirname, "../core/src/index.ts"),
      "@betterx/plugins": resolve(__dirname, "../plugins/src/index.ts"),
    },
  },
  plugins: [
    webExtension({
      manifest: "src/manifest.json",
      browser,
      transformManifest(manifest) {
        const bg = manifest.background as Record<string, unknown> | undefined;
        if (browser === "firefox" && bg?.service_worker) {
          manifest.background = {
            scripts: [bg.service_worker as string],
            type: bg.type as string,
          } as typeof manifest.background;
          const bss = manifest.browser_specific_settings as
            | Record<string, Record<string, unknown>>
            | undefined;
          if (bss?.gecko) {
            bss.gecko.data_collection_permissions = { required: ["none"], optional: [] };
          }
        }
        return manifest;
      },
    }),
  ],
  build: {
    outDir: `dist/${browser}`,
    emptyOutDir: false,
    // Escape non-ASCII chars so Chrome's content script loader doesn't
    // reject the files with "It isn't UTF-8 encoded".
    cssTarget: "chrome120",
  },
  esbuild: {
    charset: "ascii",
  },
});
