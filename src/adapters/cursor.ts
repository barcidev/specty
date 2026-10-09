import type { GeneratedFile } from "../generate/types.js";
import { createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const cursorAdapter: ToolAdapter = {
  id: "cursor",
  name: "Cursor",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const directive = createThinDirective("Cursor", ctx.language);
    const mdcContent = `---
description: Specty AI assistant governance directives
globs: *
alwaysApply: true
---

${directive}`;

    const files: GeneratedFile[] = [
      {
        relativePath: ".cursor/rules/specty.mdc",
        content: mdcContent,
        description: "Cursor MDC rule pointing to AGENTS.md",
      },
    ];

    if (ctx.enableMcp) {
      files.push({
        relativePath: ".cursor/mcp.json",
        content: JSON.stringify(
          {
            mcpServers: {
              specty: {
                command: "specty",
                args: ["mcp"],
              },
            },
          },
          null,
          2,
        ),
        description: "Cursor MCP configuration",
      });
    }

    return files;
  },

  getExpectedFilePaths(ctx: AdapterContext): string[] {
    const paths = [".cursor/rules/specty.mdc"];
    if (ctx.enableMcp) {
      paths.push(".cursor/mcp.json");
    }
    return paths;
  },
};
