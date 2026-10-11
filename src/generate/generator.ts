import path from "node:path";
import { generateAllSelectedTools } from "../adapters/index.js";
import { SafeFileWriter } from "../core/fs-writer.js";
import { loadManifest, saveManifest, updateManifestEntry } from "../core/manifest.js";
import { computeShortHash } from "../core/markers.js";
import { formatArchitectureRuleContent } from "./architecture-rules-formatter.js";
import { formatGitRuleContent } from "./git-rules-formatter.js";
import { loadTemplate, renderTemplateString } from "./renderer.js";
import type { GenerateContext, GeneratedFile, GenerationResult } from "./types.js";

export async function generateProjectInfrastructure(
  ctx: GenerateContext,
): Promise<GenerationResult> {
  const lang = ctx.language;
  const writer = new SafeFileWriter(ctx.repoRoot);
  const manifest = await loadManifest(ctx.repoRoot);
  const files: GeneratedFile[] = [];

  const primaryScope = ctx.config.scopes[0];
  const primaryLanguage = ctx.primaryLanguage ?? primaryScope?.stack.language ?? "typescript";
  const frameworks = ctx.frameworks ?? primaryScope?.stack.frameworks ?? [];
  const architecture = ctx.architecture ?? ctx.config.project.architecture ?? "clean";
  const projectName = ctx.projectName ?? path.basename(ctx.repoRoot);

  const layout = ctx.config.project.layout ?? "single";
  const scopes = ctx.config.scopes ?? [];

  const layoutTitles: Record<string, Record<string, string>> = {
    single: { es: "Monolito (Single Project)", en: "Monolith (Single Project)" },
    monorepo: {
      es: "Monorepo (Multi-paquete / Orquestado)",
      en: "Monorepo (Multi-package / Orchestrated)",
    },
    workspace: {
      es: "Workspace (Políglota / Multi-stack)",
      en: "Workspace (Polyglot / Multi-stack)",
    },
    "multi-repo": {
      es: "Workspace (Políglota / Multi-stack)",
      en: "Workspace (Polyglot / Multi-stack)",
    },
  };

  const defaultTitle = { es: "Monolito (Single Project)", en: "Monolith (Single Project)" };
  const activeLayoutTitles = layoutTitles[layout] ?? defaultTitle;
  const layoutTitle = activeLayoutTitles[lang] ?? activeLayoutTitles.es;

  const scopesSummary =
    scopes.length > 0
      ? scopes
          .map(
            (s) =>
              `- \`${s.path}\`: ${s.stack.language}${
                s.stack.frameworks && s.stack.frameworks.length > 0
                  ? ` (${s.stack.frameworks.join(", ")})`
                  : ""
              }`,
          )
          .join("\n")
      : lang === "en"
        ? "- `.` (Root scope)"
        : "- `.` (Scope raíz)";

  const defaultDirectives = {
    es: "Todo el desarrollo se concentra en el proyecto raíz (`.`). Mantén una clara separación de capas y responsabilidades según la arquitectura, evitando acoplamiento entre módulos.",
    en: "All development is centered in the root project (`.`). Maintain clean layering separation and single responsibility, preventing circular coupling.",
  };

  const structureDirectivesMap: Record<string, Record<string, string>> = {
    single: defaultDirectives,
    monorepo: {
      es: "El repositorio se orquesta como un Monorepo multi-paquete. Las aplicaciones (`apps/*`) pueden importar librerías compartidas (`packages/*`), pero las librerías nunca deben importar código de aplicaciones. Toda tarea debe declarar con precisión los paquetes afectados en `[files: ...]`. Ejecuta verificaciones filtradas por paquete.",
      en: "The repository is orchestrated as a multi-package monorepo. Applications (`apps/*`) may import shared libraries (`packages/*`), but libraries must never import application code. Each task must declare affected packages in `[files: ...]`. Run verification commands filtered per package.",
    },
    workspace: {
      es: "El repositorio se organiza como un Workspace Políglota / Multi-stack. Cada subsistema/servicio (`apps/*`, `services/*`) mantiene su propio stack, dependencias y ciclo de vida de forma aislada. Las comunicaciones inter-servicio se rigen por contratos estrictos (APIs REST/OpenAPI/gRPC). Las tareas de IA deben restringir sus modificaciones exclusivamente al componente asignado.",
      en: "The repository is structured as a Polyglot / Multi-stack Workspace. Each subsystem/service (`apps/*`, `services/*`) maintains its own stack, dependencies, and lifecycle in isolation. Inter-service interactions follow strict contracts (REST/OpenAPI/gRPC). AI tasks must restrict file edits strictly to their assigned subsystem.",
    },
    "multi-repo": {
      es: "El repositorio se organiza como un Workspace Políglota / Multi-stack. Cada subsistema/servicio (`apps/*`, `services/*`) mantiene su propio stack, dependencias y ciclo de vida de forma aislada. Las comunicaciones inter-servicio se rigen por contratos estrictos (APIs REST/OpenAPI/gRPC). Las tareas de IA deben restringir sus modificaciones exclusivamente al componente asignado.",
      en: "The repository is structured as a Polyglot / Multi-stack Workspace. Each subsystem/service (`apps/*`, `services/*`) maintains its own stack, dependencies, and lifecycle in isolation. Inter-service interactions follow strict contracts (REST/OpenAPI/gRPC). AI tasks must restrict file edits strictly to their assigned subsystem.",
    },
  };

  const activeDirectives = structureDirectivesMap[layout] ?? defaultDirectives;
  const structureDirectives = activeDirectives[lang] ?? activeDirectives.es;

  const templateVars = {
    projectName,
    primaryLanguage,
    frameworks: frameworks.join(", ") || "none",
    architecture,
    specEngine: ctx.config.spec_engine,
    layoutTitle,
    scopesSummary,
    structureDirectives,
  };

  // 1. AGENTS.md
  const rawAgentsMd = await loadTemplate(lang, "agents-md.md");
  const renderedAgentsMd = renderTemplateString(rawAgentsMd, templateVars);
  files.push({
    relativePath: "AGENTS.md",
    content: renderedAgentsMd,
    description: "Single source of truth for AI assistant directives",
  });

  // 2. Roles in .specty/agents/
  const roles = ["orchestrator", "frontend", "backend", "data", "testing", "security-review"];

  for (const role of roles) {
    const rawRole = await loadTemplate(lang, `agents/${role}.md`);
    files.push({
      relativePath: `.specty/agents/${role}.md`,
      content: rawRole,
      description: `Role definition: ${role}`,
    });
  }

  // 3. Routing matrix in .specty/routing.md
  const rawRouting = await loadTemplate(lang, "routing.md");
  files.push({
    relativePath: ".specty/routing.md",
    content: rawRouting,
    description: "Task routing matrix and sequential simulation protocol",
  });

  // 4. Core rules in .specty/rules/core/
  const coreRules = ["workflow", "spec-format", "tasks-format", "verification"];

  for (const rule of coreRules) {
    const rawRule = await loadTemplate(lang, `rules/core/${rule}.md`);
    files.push({
      relativePath: `.specty/rules/core/${rule}.md`,
      content: rawRule,
      description: `Core rule: ${rule}`,
    });
  }

  const gitWorkflow = ctx.config.git?.workflow ?? "feature-branch";
  const commitConvention = ctx.config.git?.commit_convention ?? "conventional";
  const gitRuleContent = formatGitRuleContent(lang, gitWorkflow, commitConvention);
  files.push({
    relativePath: ".specty/rules/core/git.md",
    content: gitRuleContent,
    description: `Core rule: git (${gitWorkflow}, ${commitConvention})`,
  });

  const architectureRuleContent = formatArchitectureRuleContent({
    lang,
    layout: ctx.config.project.layout,
    architecture,
    scopes: ctx.config.scopes,
  });
  files.push({
    relativePath: ".specty/rules/core/architecture.md",
    content: architectureRuleContent,
    description: `Core rule: architecture (${ctx.config.project.layout}, ${architecture})`,
  });

  // 5. Task rules in .specty/rules/task/
  const taskRules = ["ui", "api", "data", "testing", "security"];
  for (const rule of taskRules) {
    const rawRule = await loadTemplate(lang, `rules/task/${rule}.md`);
    files.push({
      relativePath: `.specty/rules/task/${rule}.md`,
      content: rawRule,
      description: `Task rule: ${rule}`,
    });
  }

  // 6. Language rules in .specty/rules/lang/
  const langRuleMap: Record<string, string> = {
    typescript: "typescript.md",
    javascript: "typescript.md",
    dart: "dart.md",
    csharp: "csharp.md",
    python: "python.md",
    go: "go.md",
    rust: "rust.md",
  };

  const allLanguages = new Set<string>();
  if (primaryLanguage) allLanguages.add(primaryLanguage);
  for (const s of ctx.config.scopes) {
    if (s.stack?.language) allLanguages.add(s.stack.language);
  }

  for (const langId of allLanguages) {
    const targetLangRule = langRuleMap[langId];
    if (targetLangRule) {
      try {
        const rawLang = await loadTemplate(lang, `rules/lang/${targetLangRule}`);
        files.push({
          relativePath: `.specty/rules/lang/${targetLangRule}`,
          content: rawLang,
          description: `Language rule: ${langId}`,
        });
      } catch {
        // ignore
      }
    }
  }

  // 7. Framework rules in .specty/rules/framework/
  const frameworkTemplateAlias: Record<string, string> = {
    nest: "nestjs",
    next: "nextjs",
  };

  const allFrameworks = new Set<string>(frameworks);
  for (const s of ctx.config.scopes) {
    if (s.stack?.frameworks) {
      for (const fw of s.stack.frameworks) {
        if (fw && fw !== "none") allFrameworks.add(fw);
      }
    }
  }

  for (const fw of allFrameworks) {
    const fwNormalized = frameworkTemplateAlias[fw] ?? fw;
    const fwFileName = `${fwNormalized}.md`;
    try {
      const rawFw = await loadTemplate(lang, `rules/framework/${fwFileName}`);
      files.push({
        relativePath: `.specty/rules/framework/${fwFileName}`,
        content: rawFw,
        description: `Framework rule: ${fw}`,
      });
    } catch {
      // rule not defined for this framework yet
    }
  }

  // 8. Templates in .specty/templates/
  const specTemplates = ["proposal.md", "design.md", "tasks.md", "handoff.md", "verification.md"];

  for (const tmpl of specTemplates) {
    const rawTmpl = await loadTemplate(lang, `spec/${tmpl}`);
    files.push({
      relativePath: `.specty/templates/${tmpl}`,
      content: rawTmpl,
      description: `Spec template: ${tmpl}`,
    });
  }

  // 9. Selected AI tools adapters
  const toolFiles = await generateAllSelectedTools({
    repoRoot: ctx.repoRoot,
    config: ctx.config,
    language: lang,
    enableMcp: Boolean(ctx.config.mcp.enabled),
    dryRun: ctx.dryRun,
  });
  files.push(...toolFiles);

  let writtenCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const result = await writer.writeFile(file.relativePath, file.content, {
      dryRun: ctx.dryRun,
      createBackup: true,
    });

    if (result.written) {
      writtenCount++;
      if (!ctx.dryRun) {
        updateManifestEntry(manifest, {
          path: file.relativePath,
          language: lang,
          baseHash: computeShortHash(file.content),
        });
      }
    } else {
      skippedCount++;
    }
  }

  if (!ctx.dryRun) {
    await saveManifest(ctx.repoRoot, manifest);
  }

  return {
    files,
    writtenCount,
    skippedCount,
  };
}
