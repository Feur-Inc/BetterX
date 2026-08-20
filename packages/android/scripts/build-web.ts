import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = resolve(root, "app/src/main/assets/betterx");

const shared = {
  resolve: {
    alias: {
      "@betterx/core": resolve(root, "../core/src/index.ts"),
      "@betterx/plugins": resolve(root, "../plugins/src/index.ts"),
    },
  },
  esbuild: {
    charset: "ascii" as const,
  },
  build: {
    outDir,
    emptyOutDir: false,
    sourcemap: false,
    minify: false,
    target: "chrome120",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
} as const;

const entries = [
  { file: resolve(root, "src/content/index.ts"), out: "content.js", name: "BetterXAndroidContent" },
  {
    file: resolve(root, "src/content/main-world.ts"),
    out: "main-world.js",
    name: "BetterXAndroidMainWorld",
  },
  {
    file: resolve(root, "src/content/early-logo.ts"),
    out: "early-logo.js",
    name: "BetterXAndroidEarlyLogo",
  },
];

const [firstEntry, ...remainingEntries] = entries;

await build({
  ...shared,
  build: {
    ...shared.build,
    emptyOutDir: false,
    lib: {
      entry: firstEntry.file,
      formats: ["iife"],
      name: firstEntry.name,
      fileName: () => firstEntry.out,
    },
  },
});

for (const entry of remainingEntries) {
  await build({
    ...shared,
    build: {
      ...shared.build,
      lib: {
        entry: entry.file,
        formats: ["iife"],
        name: entry.name,
        fileName: () => entry.out,
      },
    },
  });
}
