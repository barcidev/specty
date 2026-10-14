import type { SupportedLanguage } from "../core/i18n.js";
import type { GeneratedFile } from "../generate/types.js";
import { buildMcpServersConfig, createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const windsurfAdapter: ToolAdapter = {
  id: "windsurf",
  name: "Windsurf",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [
      {
        relativePath: ".windsurf/rules/specty.md",
        content: createThinDirective("Windsurf", ctx.language),
        description: "Windsurf rules pointing to AGENTS.md",
      },
    ];

    if (ctx.enableMcp) {
      files.push({
        relativePath: ".windsurf/mcp.json",
        content: JSON.stringify(
          {
            mcpServers: buildMcpServersConfig(ctx),
          },
          null,
          2,
        ),
        description: "Windsurf Cascade MCP configuration",
      });
    }

    return files;
  },

  getExpectedFilePaths(ctx?: AdapterContext): string[] {
    const paths = [".windsurf/rules/specty.md"];
    if (ctx?.enableMcp) {
      paths.push(".windsurf/mcp.json");
    }
    return paths;
  },

  getMcpInstructions(language: SupportedLanguage): string {
    if (language === "es") {
      return "Windsurf gestiona MCP localmente en .windsurf/mcp.json o a nivel de configuracion global. Specty configura el servidor 'specty' con comando 'specty mcp'.";
    }
    return "Windsurf manages MCP locally in .windsurf/mcp.json or globally. Specty configures the 'specty' server with 'specty mcp'.";
  },
};
