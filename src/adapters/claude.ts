import type { GeneratedFile } from "../generate/types.js";
import { buildMcpServersConfig, createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

interface ClaudeRoleDefinition {
  name: string;
  description: string;
  tools: string[];
}

const CLAUDE_ROLES: Record<string, ClaudeRoleDefinition> = {
  orchestrator: {
    name: "orchestrator",
    description: "High-level architectural planning, workflow dispatch and coordination.",
    tools: ["Read", "Glob", "Grep", "LS", "Bash", "Task"],
  },
  frontend: {
    name: "frontend",
    description: "Frontend UI/UX development and client-side logic implementation.",
    tools: ["Read", "Edit", "Write", "MultiEdit", "Glob", "Grep", "LS", "Bash"],
  },
  backend: {
    name: "backend",
    description: "Backend API, core domain services and business logic implementation.",
    tools: ["Read", "Edit", "Write", "MultiEdit", "Glob", "Grep", "LS", "Bash"],
  },
  data: {
    name: "data",
    description: "Data models, schema migrations and persistence tier implementation.",
    tools: ["Read", "Edit", "Write", "MultiEdit", "Glob", "Grep", "LS", "Bash"],
  },
  testing: {
    name: "testing",
    description: "Unit, integration and end-to-end test suites implementation.",
    tools: ["Read", "Edit", "Write", "MultiEdit", "Glob", "Grep", "LS", "Bash"],
  },
  "security-review": {
    name: "security-review",
    description: "Security auditing, vulnerability scanning and governance verification.",
    tools: ["Read", "Glob", "Grep", "LS", "Bash"],
  },
};

const ROLE_NAMES = Object.keys(CLAUDE_ROLES);

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
            hooks: {
              PreToolUse: [
                {
                  matcher: "Edit|Write|MultiEdit|NotebookEdit",
                  command: "npx --no-install @barcidev/specty guard",
                },
                {
                  matcher: "Bash",
                  command: "npx --no-install @barcidev/specty guard",
                },
              ],
              UserPromptSubmit: [
                {
                  command: "npx --no-install @barcidev/specty next --card",
                },
              ],
              SessionStart: [
                {
                  command: "npx --no-install @barcidev/specty next --card",
                },
              ],
            },
            permissions: {
              deny: [
                "specty approve *",
                "git commit *--no-verify*",
                "*SPECTY_BYPASS=*",
                "*SPECTY_HOOK_DISABLED=*",
                "git config *core.hooksPath*",
              ],
            },
          },
          null,
          2,
        ),
        description: "Claude Code local settings with hard enforcement hooks and permissions",
      },
    ];

    // Real Claude Code sub-agent files with frontmatter and tool restrictions
    for (const [role, def] of Object.entries(CLAUDE_ROLES)) {
      const frontmatter = [
        "---",
        `name: ${def.name}`,
        `description: ${def.description}`,
        "tools:",
        ...def.tools.map((t) => `  - ${t}`),
        "---",
        "",
      ].join("\n");

      files.push({
        relativePath: `.claude/agents/${role}.md`,
        content: `${frontmatter}<!-- specty:claude-agent -->\n# Claude Agent: ${def.name}\n\nRefer to sovereign role definition in [.specty/agents/${def.name}.md](../../.specty/agents/${def.name}.md).\n`,
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
      ...ROLE_NAMES.map((role) => `.claude/agents/${role}.md`),
    ];
    if (ctx.enableMcp) {
      paths.push(".mcp.json");
    }
    return paths;
  },
};
