import type { GeneratedFile } from "../generate/types.js";
import { buildMcpServersConfig, createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const copilotAdapter: ToolAdapter = {
  id: "github-copilot",
  name: "GitHub Copilot",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [
      {
        relativePath: ".github/copilot-instructions.md",
        content: createThinDirective("GitHub Copilot", ctx.language),
        description: "GitHub Copilot instructions pointing to AGENTS.md",
      },
    ];

    if (ctx.enableMcp) {
      files.push({
        relativePath: ".vscode/mcp.json",
        content: JSON.stringify(
          {
            servers: buildMcpServersConfig(ctx),
          },
          null,
          2,
        ),
        description: "VS Code / Copilot MCP configuration",
      });
    }

    return files;
  },

  getExpectedFilePaths(ctx: AdapterContext): string[] {
    const paths = [".github/copilot-instructions.md"];
    if (ctx.enableMcp) {
      paths.push(".vscode/mcp.json");
    }
    return paths;
  },
};
