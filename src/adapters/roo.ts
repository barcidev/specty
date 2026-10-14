import type { GeneratedFile } from "../generate/types.js";
import { buildMcpServersConfig, createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const rooAdapter: ToolAdapter = {
  id: "roocode",
  name: "Roo Code",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [
      {
        relativePath: ".roo/rules/specty.md",
        content: createThinDirective("Roo Code", ctx.language),
        description: "Roo Code instructions pointing to AGENTS.md",
      },
    ];

    if (ctx.enableMcp) {
      files.push({
        relativePath: ".roo/mcp.json",
        content: JSON.stringify(
          {
            mcpServers: buildMcpServersConfig(ctx),
          },
          null,
          2,
        ),
        description: "Roo Code MCP configuration",
      });
    }

    return files;
  },

  getExpectedFilePaths(ctx?: AdapterContext): string[] {
    const paths = [".roo/rules/specty.md"];
    if (ctx?.enableMcp) {
      paths.push(".roo/mcp.json");
    }
    return paths;
  },
};
