import type { SupportedLanguage } from "../core/i18n.js";
import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const windsurfAdapter: ToolAdapter = {
  id: "windsurf",
  name: "Windsurf",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    return [
      {
        relativePath: ".windsurf/rules/specty.md",
        content: createThinDirective("Windsurf", ctx.language),
        description: "Windsurf rules pointing to AGENTS.md",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [".windsurf/rules/specty.md"];
  },

  getMcpInstructions(language: SupportedLanguage): string {
    if (language === "es") {
      return "Windsurf gestiona MCP a nivel de configuracion global de usuario. Agrega 'specty mcp' a tu configuracion de Cascade/Windsurf.";
    }
    return "Windsurf manages MCP at user-level global configuration. Add 'specty mcp' to your Cascade/Windsurf configuration.";
  },
};
