import type { CommitConvention, GitWorkflow } from "../core/config.js";
import type { SupportedLanguage } from "../core/i18n.js";

export function formatGitRuleContent(
  lang: SupportedLanguage,
  workflow: GitWorkflow = "feature-branch",
  commitConvention: CommitConvention = "conventional",
): string {
  if (lang === "en") {
    return formatGitRuleContentEn(workflow, commitConvention);
  }
  return formatGitRuleContentEs(workflow, commitConvention);
}

function formatGitRuleContentEs(workflow: GitWorkflow, commitConvention: CommitConvention): string {
  let branchSection = "";
  switch (workflow) {
    case "gitflow":
      branchSection = `## Ramas (GitFlow)
- Ramas de integración permanentes: \`main\` (producción) y \`develop\` (desarrollo activo).
- NUNCA desarrolles directamente en \`main\` ni \`develop\`.
- Ramas auxiliares:
  - Funcionalidades: \`feature/<nombre>\` saliendo de \`develop\` y fusionando en \`develop\`.
  - Lanzamientos: \`release/<version>\` saliendo de \`develop\` y fusionando en \`main\` y \`develop\`.
  - Hotfixes: \`hotfix/<version>\` saliendo de \`main\` y fusionando en \`main\` y \`develop\`.
- Ejemplo: \`feature/cart -> develop -> release/v1.0 -> main\`.`;
      break;
    case "trunk-based":
      branchSection = `## Ramas (Trunk-Based Development)
- Todo el desarrollo converge continuamente sobre la rama principal (\`main\` o \`trunk\`).
- Utiliza ramas de muy corta duración (< 24 horas) o commits directos asistidos por feature flags.
- Evita ramas de larga vida que acumulen desviaciones del código principal.
- Ejemplo: \`short-fix\` (< 1 día) -> merge continuo a \`main\`.`;
      break;
    case "centralized":
      branchSection = `## Ramas (Flujo Centralizado)
- Flujo clásico de rama única: todos los cambios se comitean directamente sobre la rama principal (\`main\`).
- No se utilizan ramas de funcionalidad locales aisladas.
- Mantén sincronización constante ejecutando \`git pull --rebase\` antes de publicar cambios.
- Ejemplo: \`git commit\` directo en \`main\`.`;
      break;
    case "forking":
      branchSection = `## Ramas (Forking Workflow)
- Cada desarrollador mantiene su propia bifurcación (fork) del repositorio original.
- Desarrolla siempre en ramas dedicadas dentro de tu fork (\`feature/<scope>-<descripcion>\`).
- Propón la integración mediante Pull Request / Merge Request hacia el repositorio \`upstream:main\`.
- Ejemplo: \`fork:feature/api -> PR a upstream:main\`.`;
      break;
    default:
      branchSection = `## Ramas (Feature Branch Workflow)
- NUNCA desarrolles directamente en ramas de integración base (\`main\`, \`master\`, \`develop\`).
- Crea ramas de funcionalidad cortas integradas mediante Pull Request:
  \`feature/<scope>-<descripcion-corta>\` o \`fix/<scope>-<descripcion-corta>\`.
- Ejemplo: \`feature/login-auth -> PR -> main\`.`;
      break;
  }

  let commitSection = "";
  switch (commitConvention) {
    case "classic":
      commitSection = `## Commits (Estándar Clásico)
- Formato estándar clásico imperativo:
  \`<Título imperativo conciso sin punto final>\`
- Escribe el título en modo imperativo y conciso (máximo 72 caracteres).
- Añade un cuerpo descriptivo separado por una línea en blanco si es necesario explicar el porqué del cambio.
- Ejemplo: \`Add Google OAuth2 login authentication\`.`;
      break;
    case "gitmoji":
      commitSection = `## Commits (Gitmoji)
- Formato con emojis semánticos:
  \`<emoji> <descripción concisa sin punto final>\`
- Utiliza emojis estándar de Gitmoji para categorizar la intención visualmente (ej. ✨ para características, 🐛 para correcciones, ♻️ para refactorización).
- Ejemplo: \`✨ Add Google OAuth2 login authentication\`.`;
      break;
    case "ticket":
      commitSection = `## Commits (Basada en Tickets)
- Formato basado en tickets / issue tracking:
  \`[<TICKET-ID>] <descripción concisa>\`
- Prefija cada mensaje con el identificador del ticket (Jira, GitHub Issues, Linear, etc.).
- Ejemplo: \`[PROJ-123] Add Google OAuth2 login authentication\`.`;
      break;
    case "gitmoji-conventional":
      commitSection = `## Commits (Híbrido: Gitmoji + Conventional Commits)
- Formato híbrido con emoji y estructura semántica:
  \`<emoji> <tipo>(<alcance>): <descripción en minúsculas sin punto final>\`
- Tipos válidos: \`feat\`, \`fix\`, \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`, \`style\`.
- Ejemplo: \`✨ feat(auth): add google oauth2 login\`.`;
      break;
    case "conventional-ticket":
      commitSection = `## Commits (Híbrido: Conventional Commits + Tickets)
- Formato híbrido semántico con referencia de ticket:
  \`<tipo>(<alcance>): [<TICKET-ID>] <descripción en minúsculas sin punto final>\`
- Tipos válidos: \`feat\`, \`fix\`, \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`, \`style\`.
- Ejemplo: \`feat(auth): [PROJ-123] add google oauth2 login\`.`;
      break;
    case "gitmoji-ticket":
      commitSection = `## Commits (Híbrido: Gitmoji + Basada en Tickets)
- Formato híbrido con emoji semántico y referencia de ticket:
  \`<emoji> [<TICKET-ID>] <descripción concisa sin punto final>\`
- Ejemplo: \`✨ [PROJ-123] Add Google OAuth2 login authentication\`.`;
      break;
    case "gitmoji-conventional-ticket":
      commitSection = `## Commits (Híbrido: Gitmoji + Conventional Commits + Tickets)
- Formato híbrido integral:
  \`<emoji> <tipo>(<alcance>): [<TICKET-ID>] <descripción en minúsculas sin punto final>\`
- Tipos válidos: \`feat\`, \`fix\`, \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`, \`style\`.
- Ejemplo: \`✨ feat(auth): [PROJ-123] add google oauth2 login\`.`;
      break;
    default:
      commitSection = `## Commits (Conventional Commits)
- Formato Conventional Commits estricto:
  \`<tipo>(<alcance>): <descripción en minúsculas sin punto final>\`
- Tipos válidos: \`feat\`, \`fix\`, \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`, \`style\`.
- Ejemplo: \`feat(auth): add google oauth2 login\`.`;
      break;
  }

  return `# Regla Core: Convenciones Git (Git Conventions)

${branchSection}

${commitSection}
- Considera únicamente los cambios en staging (\`git diff --cached\`).
- Commits atómicos por tarea: Cada tarea completada de \`tasks.md\` DEBE commitearse de forma independiente tras verificarla (\`Implementar -> Verificar -> Commit -> Siguiente tarea\`). Está prohibido agrupar múltiples tareas en un commit.
`;
}

function formatGitRuleContentEn(workflow: GitWorkflow, commitConvention: CommitConvention): string {
  let branchSection = "";
  switch (workflow) {
    case "gitflow":
      branchSection = `## Branches (GitFlow)
- Permanent integration branches: \`main\` (production code) and \`develop\` (active integration).
- NEVER develop directly on \`main\` or \`develop\`.
- Supporting branches:
  - Features: \`feature/<name>\` branched from and merged into \`develop\`.
  - Releases: \`release/<version>\` branched from \`develop\` and merged into \`main\` and \`develop\`.
  - Hotfixes: \`hotfix/<version>\` branched from \`main\` and merged into \`main\` and \`develop\`.
- Example: \`feature/cart -> develop -> release/v1.0 -> main\`.`;
      break;
    case "trunk-based":
      branchSection = `## Branches (Trunk-Based Development)
- All development continuously converges onto the main branch (\`main\` or \`trunk\`).
- Use ultra short-lived branches (< 24 hours) or direct commits paired with feature flags.
- Avoid long-lived branches that accumulate drift from trunk.
- Example: \`short-fix\` (< 1 day) -> continuous merge into \`main\`.`;
      break;
    case "centralized":
      branchSection = `## Branches (Centralized Workflow)
- Classic single-branch workflow: all changes are committed directly to \`main\`.
- No separate local feature branches are maintained.
- Synchronize continuously by running \`git pull --rebase\` before pushing commits.
- Example: Direct \`git commit\` on \`main\`.`;
      break;
    case "forking":
      branchSection = `## Branches (Forking Workflow)
- Every contributor maintains an independent fork of the origin repository.
- Always implement changes in dedicated branches inside your fork (\`feature/<scope>-<description>\`).
- Propose integration via Pull Request / Merge Request into \`upstream:main\`.
- Example: \`fork:feature/api -> PR to upstream:main\`.`;
      break;
    default:
      branchSection = `## Branches (Feature Branch Workflow)
- NEVER develop directly on base integration branches (\`main\`, \`master\`, \`develop\`).
- Create short-lived feature branches merged via Pull Request:
  \`feature/<scope>-<short-description>\` or \`fix/<scope>-<short-description>\`.
- Example: \`feature/login-auth -> PR -> main\`.`;
      break;
  }

  let commitSection = "";
  switch (commitConvention) {
    case "classic":
      commitSection = `## Commits (Classic / Standard)
- Concise imperative format:
  \`<Imperative concise title without period>\`
- Write the summary in imperative mood (max 72 chars).
- Provide an optional detailed body separated by a blank line explaining the motivation.
- Example: \`Add Google OAuth2 login authentication\`.`;
      break;
    case "gitmoji":
      commitSection = `## Commits (Gitmoji)
- Format with semantic emojis:
  \`<emoji> <concise description without period>\`
- Use standard Gitmoji icons to visually categorize change intention (e.g. ✨ for features, 🐛 for fixes, ♻️ for refactor).
- Example: \`✨ Add Google OAuth2 login authentication\`.`;
      break;
    case "ticket":
      commitSection = `## Commits (Ticket-based)
- Ticket or issue-based format:
  \`[<TICKET-ID>] <concise description>\`
- Prefix each message with the issue or ticket identifier (Jira, GitHub Issues, Linear, etc.).
- Example: \`[PROJ-123] Add Google OAuth2 login authentication\`.`;
      break;
    case "gitmoji-conventional":
      commitSection = `## Commits (Hybrid: Gitmoji + Conventional Commits)
- Hybrid format with emoji and semantic structure:
  \`<emoji> <type>(<scope>): <lowercase description without period>\`
- Valid types: \`feat\`, \`fix\`, \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`, \`style\`.
- Example: \`✨ feat(auth): add google oauth2 login\`.`;
      break;
    case "conventional-ticket":
      commitSection = `## Commits (Hybrid: Conventional Commits + Tickets)
- Semantic hybrid format with ticket reference:
  \`<type>(<scope>): [<TICKET-ID>] <lowercase description without period>\`
- Valid types: \`feat\`, \`fix\`, \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`, \`style\`.
- Example: \`feat(auth): [PROJ-123] add google oauth2 login\`.`;
      break;
    case "gitmoji-ticket":
      commitSection = `## Commits (Hybrid: Gitmoji + Ticket-based)
- Hybrid format with semantic emoji and ticket identifier:
  \`<emoji> [<TICKET-ID>] <concise description without period>\`
- Example: \`✨ [PROJ-123] Add Google OAuth2 login authentication\`.`;
      break;
    case "gitmoji-conventional-ticket":
      commitSection = `## Commits (Hybrid: Gitmoji + Conventional Commits + Tickets)
- Comprehensive hybrid format:
  \`<emoji> <type>(<scope>): [<TICKET-ID>] <lowercase description without period>\`
- Valid types: \`feat\`, \`fix\`, \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`, \`style\`.
- Example: \`✨ feat(auth): [PROJ-123] add google oauth2 login\`.`;
      break;
    default:
      commitSection = `## Commits (Conventional Commits)
- Strict Conventional Commits format:
  \`<type>(<scope>): <lowercase description without period>\`
- Valid types: \`feat\`, \`fix\`, \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`, \`style\`.
- Example: \`feat(auth): add google oauth2 login\`.`;
      break;
  }

  return `# Core Rule: Git Conventions

${branchSection}

${commitSection}
- Consider only staged changes (\`git diff --cached\`).
- Atomic task commits: Each completed task from \`tasks.md\` MUST be committed independently after verification (\`Implement -> Verify -> Commit -> Next task\`). Batching multiple tasks into a single commit is forbidden.
`;
}
