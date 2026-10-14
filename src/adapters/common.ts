import type { SupportedLanguage } from "../core/i18n.js";
import type { AdapterContext } from "./types.js";

/**
 * Builds a thin, non-divergent instruction file referencing AGENTS.md.
 */
export function createThinDirective(toolName: string, lang: SupportedLanguage): string {
  if (lang === "es") {
    return `# Directivas de ${toolName} (specty)

Este repositorio opera bajo desarrollo guiado por especificaciones con gobernanza de **specty**.

## Regla Soberana
La única fuente de verdad para directivas, flujos, roles y restricciones es **[AGENTS.md](./AGENTS.md)**.

## Directivas Nucleares
1. **Sin código sin aprobación:** Prohibido modificar código de producción sin un cambio aprobado en \`openspec/changes/<change>/\`.
2. **Contexto y tarea activa:** Ejecuta \`specty next --card\` para conocer el estado y la tarea activa antes de actuar.
3. **Alcance delimitado:** Modifica exclusivamente los archivos dentro del patrón \`[files: ...]\` de la tarea activa.
4. **Verificación ejecutable:** Verifica cada tarea con pruebas reales antes de marcarla como completada (\`- [x]\`).
`;
  }

  return `# Directives for ${toolName} (specty)

This repository operates under specification-driven development governed by **specty**.

## Sovereign Rule
The single source of truth for directives, workflows, roles, and boundaries is **[AGENTS.md](./AGENTS.md)**.

## Core Directives
1. **No code without approval:** Modifying production code without an approved change in \`openspec/changes/<change>/\` is forbidden.
2. **Context & active task:** Run \`specty next --card\` to inspect current status and the active task before acting.
3. **Strict file scope:** Edit only files within the \`[files: ...]\` pattern of the active task.
4. **Executable verification:** Verify each task with real tests before marking it completed (\`- [x]\`).
`;
}

export function buildMcpServersConfig(
  ctx: AdapterContext,
): Record<string, { command: string; args: string[]; env?: Record<string, string> }> {
  const servers: Record<string, { command: string; args: string[]; env?: Record<string, string> }> =
    {
      specty: {
        command: "specty",
        args: ["mcp"],
      },
    };

  if (ctx.config.mcp.graph_provider === "codebase-memory") {
    const cbmConfig = ctx.config.mcp.codebase_memory;
    servers["codebase-memory"] = {
      command: cbmConfig.command,
      args: cbmConfig.args,
    };
  }

  if (ctx.config.mcp.custom_servers) {
    for (const [name, serverDef] of Object.entries(ctx.config.mcp.custom_servers)) {
      servers[name] = {
        command: serverDef.command,
        args: serverDef.args,
        ...(serverDef.env && Object.keys(serverDef.env).length > 0 ? { env: serverDef.env } : {}),
      };
    }
  }

  return servers;
}
