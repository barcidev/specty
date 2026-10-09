import type { SupportedLanguage } from "../core/i18n.js";

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
`;
}
