import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const amazonqAdapter: ToolAdapter = {
  id: "amazon-q",
  name: "Amazon Q Developer",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: ".amazonq/rules/specty.md",
        content: createThinDirective("Amazon Q Developer", ctx.language),
        description: "Amazon Q Developer instructions pointing to AGENTS.md",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [".amazonq/rules/specty.md"];
  },
};
