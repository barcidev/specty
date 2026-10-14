import type { GeneratedFile } from "../generate/types.js";
import { buildMcpServersConfig, createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const clineAdapter: ToolAdapter = {
  id: "cline",
  name: "Cline",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [
      {
        relativePath: ".clinerules/specty.md",
        content: createThinDirective("Cline", ctx.language),
        description: "Cline instructions pointing to AGENTS.md",
      },
    ];

    if (ctx.enableMcp) {
      files.push({
        relativePath: ".cline/mcp_settings.json",
        content: JSON.stringify(
          {
            mcpServers: buildMcpServersConfig(ctx),
          },
          null,
          2,
        ),
        description: "Cline MCP configuration",
      });
    }

    return files;
  },

  getExpectedFilePaths(ctx?: AdapterContext): string[] {
    const paths = [".clinerules/specty.md"];
    if (ctx?.enableMcp) {
      paths.push(".cline/mcp_settings.json");
    }
    return paths;
  },
};
