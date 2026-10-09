import type { SupportedLanguage } from "../core/i18n.js";
import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const antigravityAdapter: ToolAdapter = {
  id: "antigravity",
  name: "Google Antigravity",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: ".agent/rules/specty.md",
        content: createThinDirective("Antigravity", ctx.language),
        description: "Antigravity rule pointing to AGENTS.md",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [".agent/rules/specty.md"];
  },

  getMcpInstructions(language: SupportedLanguage): string {
    if (language === "es") {
      return "Antigravity utiliza configuracion MCP en el entorno IDE. Para configurar specty MCP, anade 'specty mcp' a la seccion mcp_servers de tu configuracion de Antigravity.";
    }
    return "Antigravity configures MCP at the IDE environment level. To configure specty MCP, add 'specty mcp' to the mcp_servers section in your Antigravity config.";
  },
};
