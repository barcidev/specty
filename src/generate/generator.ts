import path from "node:path";
import { SafeFileWriter } from "../core/fs-writer.js";
import { loadManifest, saveManifest, updateManifestEntry } from "../core/manifest.js";
import { computeShortHash } from "../core/markers.js";
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

  const templateVars = {
    projectName,
    primaryLanguage,
    frameworks: frameworks.join(", ") || "none",
    architecture,
    specEngine: ctx.config.spec_engine,
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
  const coreRules = ["workflow", "spec-format", "tasks-format", "verification", "git"];

  for (const rule of coreRules) {
    const rawRule = await loadTemplate(lang, `rules/core/${rule}.md`);
    files.push({
      relativePath: `.specty/rules/core/${rule}.md`,
      content: rawRule,
      description: `Core rule: ${rule}`,
    });
  }

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
  };

  const targetLangRule = langRuleMap[primaryLanguage];
  if (targetLangRule) {
    try {
      const rawLang = await loadTemplate(lang, `rules/lang/${targetLangRule}`);
      files.push({
        relativePath: `.specty/rules/lang/${targetLangRule}`,
        content: rawLang,
        description: `Language rule: ${primaryLanguage}`,
      });
    } catch {
      // ignore
    }
  }

  // 7. Framework rules in .specty/rules/framework/
  for (const fw of frameworks) {
    const fwFileName = `${fw}.md`;
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
