import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const rooAdapter: ToolAdapter = {
  id: "roocode",
  name: "Roo Code",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: ".roo/rules/specty.md",
        content: createThinDirective("Roo Code", ctx.language),
        description: "Roo Code instructions pointing to AGENTS.md",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [".roo/rules/specty.md"];
  },
};
