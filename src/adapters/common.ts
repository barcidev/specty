import type { SupportedLanguage } from "../core/i18n.js";
import type { AdapterContext } from "./types.js";

/**
 * Builds a thin, non-divergent instruction file referencing AGENTS.md.
 */
export function createThinDirective(toolName: string, lang: SupportedLanguage): string {
  if (lang === "es") {
    return `# Directivas de ${toolName}

Este proyecto sigue gobernanza de desarrollo asistido por IA guiada por especificaciones gestionada por **specty**.

## Regla Soberana
La unica fuente de verdad para directivas, flujos, roles y restricciones es **[AGENTS.md](./AGENTS.md)**.

## Flujo de Trabajo Obligatorio
1. **Nunca escribas codigo** en este proyecto sin un cambio (*change*) aprobado por un humano en \`openspec/changes/<change>/\`.
2. Consulta la matriz de enrutamiento en \`[.specty/routing.md](./.specty/routing.md)\` para adoptar el rol adecuado antes de actuar.
3. Carga progresivamente las reglas modulares desde \`[.specty/rules/](./.specty/rules/)\`.
4. Ejecuta siempre los comandos de verificacion definidos en \`[.specty/config.yaml](./.specty/config.yaml)\` antes de dar por concluida una tarea.
5. En cada intervencion o respuesta, indica siempre al usuario el paso siguiente claro o la accion requerida de su parte (ej. comando a ejecutar o revision) para guiarlo de forma continua y evitar que quede desorientado.
6. Para revision y aprobacion de planes o cambios:
   - Si el IDE dispone de visor webview / Simple Browser, ejecuta o sugiere \`specty view <change>\` para abrir la interfaz grafica interactiva.
   - En caso contrario o al interactuar en el chat, presenta un dashboard detallado de la especificacion (estado, metricas, propuesta y tareas) e incluye explicitamente las opciones de accion manual (\`specty approve <change>\`, rechazo con solicitudes de ajuste, \`specty validate <change>\`).
7. Para ajustes o feedback post-ejecucion:
   - Al terminar de codificar un plan o durante revisiones, si el usuario solicita ajustes o correcciones, NUNCA edites codigo directamente.
   - Agrega siempre las nuevas tareas a \`tasks.md\` o presenta primero el plan de ajuste para su aprobacion explicita antes de modificar archivos, sin importar el tamano del cambio.
`;
  }

  return `# Directives for ${toolName}

This project follows specification-driven AI assistant governance managed by **specty**.

## Sovereign Rule
The single source of truth for directives, workflows, roles, and boundaries is **[AGENTS.md](./AGENTS.md)**.

## Mandatory Workflow
1. **Never write code** in this project without a human-approved change specification in \`openspec/changes/<change>/\`.
2. Consult the routing matrix at \`[.specty/routing.md](./.specty/routing.md)\` to adopt the proper role before acting.
3. Progressively load modular rules from \`[.specty/rules/](./.specty/rules/)\`.
4. Always execute designated verification commands defined in \`[.specty/config.yaml](./.specty/config.yaml)\` before concluding tasks.
5. In every response or intervention, always provide the user with clear next steps or the next required action (command to run, file review, or approval) to maintain continuous guidance and prevent disorientation.
6. For reviewing and approving specification plans:
   - If the IDE supports an internal webview / Simple Browser, run or suggest \`specty view <change>\` to open the local graphical interface.
   - Otherwise, or directly in the chat, present a detailed specification dashboard (status, metrics, proposal, tasks) and explicitly list the manual action options (\`specty approve <change>\`, reject/request changes, \`specty validate <change>\`).
7. For post-execution adjustments or feedback:
   - After completing a plan or during reviews, if the user requests adjustments or fixes, NEVER edit code directly.
   - Always add new tasks to \`tasks.md\` or present the adjustment plan for explicit approval before modifying files, regardless of change size.
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
