import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const aiderAdapter: ToolAdapter = {
  id: "aider",
  name: "Aider",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: "CONVENTIONS.md",
        content: createThinDirective("Aider", ctx.language),
        description: "Aider conventions pointing to AGENTS.md",
      },
      {
        relativePath: ".aider.conf.yml",
        content: `# Aider configuration managed by specty\nread:\n  - CONVENTIONS.md\n  - AGENTS.md\n`,
        description: "Aider configuration file referencing conventions",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return ["CONVENTIONS.md", ".aider.conf.yml"];
  },
};
