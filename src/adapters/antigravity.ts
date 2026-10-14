import type { SupportedLanguage } from "../core/i18n.js";
import type { GeneratedFile } from "../generate/types.js";
import { buildMcpServersConfig, createThinDirective } from "./common.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

export const antigravityAdapter: ToolAdapter = {
  id: "antigravity",
  name: "Google Antigravity",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const isEs = ctx.language === "es";

    const files: GeneratedFile[] = [
      {
        relativePath: ".agents/rules/specty.md",
        content: createThinDirective("Antigravity", ctx.language),
        description: "Antigravity rule pointing to AGENTS.md",
      },
      {
        relativePath: ".agents/hooks.json",
        content: JSON.stringify(
          {
            "specty-guard": {
              PreToolUse: [
                {
                  matcher: "replace_file_content|write_to_file|multi_replace_file_content",
                  hooks: [
                    {
                      type: "command",
                      command: "npx --no-install @barcidev/specty guard",
                    },
                  ],
                },
                {
                  matcher: "run_command",
                  hooks: [
                    {
                      type: "command",
                      command: "npx --no-install @barcidev/specty guard",
                    },
                  ],
                },
              ],
            },
          },
          null,
          2,
        ),
        description: "Antigravity lifecycle hooks for hard pre-tool governance enforcement",
      },
      {
        relativePath: ".agents/skills/specty/SKILL.md",
        content: isEs
          ? `---
name: specty
description: Protocolos operativos de gobernanza guiada por especificaciones (OpenSpec), gestión de cambios y verificación.
---

# Flujo Operativo de Specty

Este proyecto se rige bajo la gobernanza soberana de **specty**.

## Regla Soberana
La única fuente de verdad para directivas, flujos y alcances es **[AGENTS.md](../../../AGENTS.md)**.

## Comandos Principales
- Anclar estado actual: \`specty next --card\`
- Consultar estado general: \`specty status\`
- Gestión atómica de tareas: \`specty task (next, list, add, complete)\` o herramientas MCP \`specty_task_*\`
- Validar especificación: \`specty validate [change]\`
- Ejecutar verificación de pruebas: \`specty verify <change>\`
- Pausa reactiva para aprobación en UI: \`specty view <change> --web && specty wait <change>\`

## Flujo por Tarea
1. Consultar la tarea activa con \`specty task next\` (o MCP \`specty_task_next\`).
2. Modificar exclusivamente los archivos declarados en \`[files: ...]\` de la tarea activa.
3. Ejecutar verificaciones reales (\`specty verify <change>\`).
4. Realizar commit atómico de la tarea dejando el árbol limpio.
5. Marcar la tarea completada con \`specty task complete <id>\` (o MCP \`specty_task_complete\`).
6. Si se solicita un ajuste post-ejecución, agregarlo con \`specty task add <desc> --files <globs>\` (o MCP \`specty_task_add\`) y re-aprobar con \`specty approve <change>\`. Prohibido editar \`tasks.md\` a mano.
`
          : `---
name: specty
description: Operating protocols for specification-driven governance (OpenSpec), change management, and verification.
---

# Specty Operational Workflow

This project is governed by **specty** specification-driven development.

## Sovereign Rule
The single source of truth for directives, workflows, and scopes is **[AGENTS.md](../../../AGENTS.md)**.

## Primary Commands
- Anchor execution state: \`specty next --card\`
- Check status: \`specty status\`
- Atomic task management: \`specty task (next, list, add, complete)\` or MCP tools \`specty_task_*\`
- Validate specification: \`specty validate [change]\`
- Run verification tests: \`specty verify <change>\`
- Reactive wait for UI approval: \`specty view <change> --web && specty wait <change>\`

## Atomic Task Workflow
1. Query active task via \`specty task next\` (or MCP \`specty_task_next\`).
2. Modify only files declared in \`[files: ...]\` of the active task.
3. Run executable verifications (\`specty verify <change>\`).
4. Make an atomic git commit for the task with clean working tree.
5. Mark task complete via \`specty task complete <id>\` (or MCP \`specty_task_complete\`).
6. If post-execution adjustments are requested, append them with \`specty task add <desc> --files <globs>\` (or MCP \`specty_task_add\`) and re-approve with \`specty approve <change>\`. Modifying \`tasks.md\` manually is forbidden.
`,
        description: "Antigravity skill with progressive disclosure for Specty workflows",
      },
    ];

    if (ctx.enableMcp) {
      files.push({
        relativePath: ".agents/mcp_config.json",
        content: JSON.stringify(
          {
            mcpServers: buildMcpServersConfig(ctx),
          },
          null,
          2,
        ),
        description: "Antigravity MCP configuration for specty tools",
      });
    }

    return files;
  },

  getExpectedFilePaths(ctx: AdapterContext): string[] {
    const paths = [
      ".agents/rules/specty.md",
      ".agents/hooks.json",
      ".agents/skills/specty/SKILL.md",
    ];
    if (ctx.enableMcp) {
      paths.push(".agents/mcp_config.json");
    }
    return paths;
  },

  getMcpInstructions(language: SupportedLanguage): string {
    if (language === "es") {
      return "Antigravity utiliza .agents/mcp_config.json en el repositorio. Specty genera esta configuracion automaticamente cuando MCP esta habilitado.";
    }
    return "Antigravity uses .agents/mcp_config.json in the repository. Specty automatically generates this configuration when MCP is enabled.";
  },
};
