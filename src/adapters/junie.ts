import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const junieAdapter: ToolAdapter = {
  id: "junie",
  name: "Junie (JetBrains)",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: ".junie/guidelines.md",
        content: createThinDirective("Junie", ctx.language),
        description: "Junie guidelines pointing to AGENTS.md",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [".junie/guidelines.md"];
  },
};
