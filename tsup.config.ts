import fs from "node:fs/promises";
import path from "node:path";
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
    onSuccess: async () => {
      try {
        const srcDir = path.resolve("src/ui/client");
        const destDir = path.resolve("dist/ui/client");
        await fs.mkdir(destDir, { recursive: true });
        await fs.cp(srcDir, destDir, { recursive: true });
      } catch {
        // ignore if not found during early build
      }
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

