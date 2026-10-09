import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const geminiAdapter: ToolAdapter = {
  id: "gemini",
  name: "Gemini CLI",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: "GEMINI.md",
        content: createThinDirective("Gemini CLI", ctx.language),
        description: "Gemini CLI instructions pointing to AGENTS.md",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return ["GEMINI.md"];
  },
};
