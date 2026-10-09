import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const continueAdapter: ToolAdapter = {
  id: "continue",
  name: "Continue",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: ".continue/rules/specty.md",
        content: createThinDirective("Continue", ctx.language),
        description: "Continue instructions pointing to AGENTS.md",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [".continue/rules/specty.md"];
  },
};
