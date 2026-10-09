import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const clineAdapter: ToolAdapter = {
  id: "cline",
  name: "Cline",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: ".clinerules/specty.md",
        content: createThinDirective("Cline", ctx.language),
        description: "Cline instructions pointing to AGENTS.md",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [".clinerules/specty.md"];
  },
};
