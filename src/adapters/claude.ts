import type { GeneratedFile } from "../generate/types.js";
import { buildMcpServersConfig, createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

const CLAUDE_ROLES = ["orchestrator", "frontend", "backend", "data", "testing", "security-review"];

export const claudeAdapter: ToolAdapter = {
  id: "claude",
  name: "Claude Code",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [
      {
        relativePath: "CLAUDE.md",
        content: createThinDirective("Claude Code", ctx.language),
        description: "Claude Code instructions pointing to AGENTS.md",
      },
      {
        relativePath: ".claude/settings.json",
        content: JSON.stringify(
          {
            env: {
              OPENSPEC_TELEMETRY: "0",
            },
          },
          null,
          2,
        ),
        description: "Claude Code local settings",
      },
    ];

    // Real Claude Code sub-agent files
    for (const role of CLAUDE_ROLES) {
      files.push({
        relativePath: `.claude/agents/${role}.md`,
        content: `<!-- specty:claude-agent -->\n# Claude Agent: ${role}\n\nRefer to sovereign role definition in [.specty/agents/${role}.md](../../.specty/agents/${role}.md).\n`,
        description: `Claude Code sub-agent definition: ${role}`,
      });
    }

    if (ctx.enableMcp) {
      files.push({
        relativePath: ".mcp.json",
        content: JSON.stringify(
          {
            mcpServers: buildMcpServersConfig(ctx),
          },
          null,
          2,
        ),
        description: "Claude Code MCP configuration",
      });
    }

    return files;
  },

  getExpectedFilePaths(ctx: AdapterContext): string[] {
    const paths = [
      "CLAUDE.md",
      ".claude/settings.json",
      ...CLAUDE_ROLES.map((role) => `.claude/agents/${role}.md`),
    ];
    if (ctx.enableMcp) {
      paths.push(".mcp.json");
    }
    return paths;
  },
};
