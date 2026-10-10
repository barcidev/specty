import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { SupportedLanguage } from "../core/i18n.js";
import type { GeneratedFile } from "../generate/types.js";
import { parseJsonc } from "./jsonc.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

const ZED_SETTINGS_PATH = ".zed/settings.json";

export const zedAdapter: ToolAdapter = {
  id: "zed",
  name: "Zed Editor",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const fullPath = path.join(ctx.repoRoot, ZED_SETTINGS_PATH);
    let baseConfig: Record<string, unknown> = {};

    if (fs.existsSync(fullPath)) {
      try {
        const existing = await fsPromises.readFile(fullPath, "utf8");
        const parsed = parseJsonc<Record<string, unknown>>(existing);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          baseConfig = parsed;
        }
      } catch {
        // Fall back to empty base config if file read or parse fails
      }
    }

    if (
      !baseConfig.agent ||
      typeof baseConfig.agent !== "object" ||
      Array.isArray(baseConfig.agent)
    ) {
      baseConfig.agent = {};
    }

    const agentObj = baseConfig.agent as Record<string, unknown>;
    if (!agentObj.commit_message_instructions) {
      agentObj.commit_message_instructions =
        ctx.language === "es"
          ? "Usa el formato Conventional Commits estricto: <type>(<scope>): <descripcion en minusculas>. Respeta las directivas de AGENTS.md."
          : "Use strict Conventional Commits format: <type>(<scope>): <lowercase description>. Follow AGENTS.md rules.";
    }

    if (ctx.enableMcp) {
      if (
        !baseConfig.context_servers ||
        typeof baseConfig.context_servers !== "object" ||
        Array.isArray(baseConfig.context_servers)
      ) {
        baseConfig.context_servers = {};
      }

      const servers = baseConfig.context_servers as Record<string, unknown>;
      servers.specty = {
        command: "specty",
        args: ["mcp"],
      };

      if (ctx.config.mcp.graph_provider === "codebase-memory") {
        const cbm = ctx.config.mcp.codebase_memory;
        servers["codebase-memory"] = {
          command: cbm.command,
          args: cbm.args,
        };
      } else {
        delete servers["codebase-memory"];
      }
    } else if (baseConfig.context_servers && typeof baseConfig.context_servers === "object") {
      const servers = baseConfig.context_servers as Record<string, unknown>;
      delete servers.specty;
      delete servers["codebase-memory"];
      if (Object.keys(servers).length === 0) {
        delete baseConfig.context_servers;
      }
    }

    return [
      {
        relativePath: ZED_SETTINGS_PATH,
        content: `${JSON.stringify(baseConfig, null, 2)}\n`,
        description: "Zed project settings and MCP context servers",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [ZED_SETTINGS_PATH];
  },

  getMcpInstructions(language: SupportedLanguage): string {
    if (language === "es") {
      return "Zed gestiona servidores MCP en .zed/settings.json en 'context_servers'. specty configura el servidor 'specty' con comando 'specty mcp'. Puedes verificar el estado en el panel de asistente (Cmd+Shift+P -> agent: open settings).";
    }
    return "Zed configures MCP context servers in .zed/settings.json under 'context_servers'. specty registers 'specty' with command 'specty mcp'. Check connection status in the assistant panel (Cmd+Shift+P -> agent: open settings).";
  },
};
