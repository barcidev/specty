import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    target: "node22",
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["node:sqlite"],
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    target: "node22",
    dts: true,
    sourcemap: true,
    clean: false,
    external: ["node:sqlite"],
  },
]);
