import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { SupportedLanguage } from "../core/i18n.js";
import type { GeneratedFile } from "../generate/types.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

function resolveConfigPath(repoRoot: string): string {
  const dotOpencode = path.join(repoRoot, ".opencode", "opencode.json");
  if (fs.existsSync(dotOpencode)) {
    return ".opencode/opencode.json";
  }
  return "opencode.json";
}

export const opencodeAdapter: ToolAdapter = {
  id: "opencode",
  name: "OpenCode",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const relPath = resolveConfigPath(ctx.repoRoot);
    const fullPath = path.join(ctx.repoRoot, relPath);

    let baseConfig: Record<string, unknown> = {
      $schema: "https://opencode.ai/config.json",
      instructions: ["AGENTS.md"],
    };

    try {
      const existing = await fsPromises.readFile(fullPath, "utf8");
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        baseConfig = parsed;
      }
    } catch {
      // File does not exist or has invalid JSON, use base structure
    }

    if (!baseConfig.$schema) {
      baseConfig.$schema = "https://opencode.ai/config.json";
    }

    if (Array.isArray(baseConfig.instructions)) {
      if (!baseConfig.instructions.includes("AGENTS.md")) {
        baseConfig.instructions.push("AGENTS.md");
      }
    } else {
      baseConfig.instructions = ["AGENTS.md"];
    }

    if (ctx.enableMcp) {
      if (!baseConfig.mcp || typeof baseConfig.mcp !== "object" || Array.isArray(baseConfig.mcp)) {
        baseConfig.mcp = {};
      }
      (baseConfig.mcp as Record<string, unknown>).specty = {
        type: "local",
        command: ["specty", "mcp"],
        enabled: true,
      };

      if (ctx.config.mcp.graph_provider === "codebase-memory") {
        const cbm = ctx.config.mcp.codebase_memory;
        (baseConfig.mcp as Record<string, unknown>)["codebase-memory"] = {
          type: "local",
          command: [cbm.command, ...cbm.args],
          enabled: true,
        };
      } else {
        delete (baseConfig.mcp as Record<string, unknown>)["codebase-memory"];
      }
    } else if (baseConfig.mcp && typeof baseConfig.mcp === "object") {
      delete (baseConfig.mcp as Record<string, unknown>).specty;
      delete (baseConfig.mcp as Record<string, unknown>)["codebase-memory"];
      if (Object.keys(baseConfig.mcp).length === 0) {
        delete baseConfig.mcp;
      }
    }

    return [
      {
        relativePath: relPath,
        content: `${JSON.stringify(baseConfig, null, 2)}\n`,
        description: "OpenCode configuration and MCP setup",
      },
    ];
  },

  getExpectedFilePaths(ctx: AdapterContext): string[] {
    return [resolveConfigPath(ctx.repoRoot)];
  },

  getMcpInstructions(language: SupportedLanguage): string {
    if (language === "es") {
      return "OpenCode gestiona MCP en opencode.json. specty configura el servidor en la clave 'mcp.specty' con comando 'specty mcp'.";
    }
    return "OpenCode configures MCP in opencode.json. specty registers the server under 'mcp.specty' with command 'specty mcp'.";
  },
};
