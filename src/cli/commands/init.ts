import path from "node:path";
import {
  COMMIT_CONVENTIONS,
  type CommitConvention,
  createDefaultConfig,
  GIT_WORKFLOWS,
  type GitWorkflow,
  type SpectyConfig,
  SUPPORTED_TOOLS,
  type SupportedTool,
  saveConfig,
} from "../../core/config.js";
import { initGitRepo, isInsideGitRepo } from "../../core/git.js";
import { getDictionary, normalizeLanguage, type SupportedLanguage } from "../../core/i18n.js";
import { logger } from "../../core/logger.js";
import { defaultDetectorRegistry } from "../../detect/detector-registry.js";
import { resolveDefaultSourcePaths } from "../../detect/source-paths-resolver.js";
import type { RepositoryDetectionResult, SupportedLanguageId } from "../../detect/types.js";
import { generateProjectInfrastructure } from "../../generate/index.js";
import { getRecommendedArchitectures } from "./architectures.js";
import { runInteractiveInit } from "./init-prompts.js";
import type { InitCommandOptions, InitFlowResult } from "./init-types.js";

export async function executeInit(options: InitCommandOptions = {}): Promise<InitFlowResult> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  if (options.verbose) {
    logger.setLevel("debug");
  }

  // 1. Check Git repository
  const isGit = await isInsideGitRepo(repoRoot);
  if (!isGit) {
    logger.warn("Repository does not appear to be an initialized Git repository.");
    if (options.yes) {
      await initGitRepo(repoRoot);
      logger.success("Initialized new Git repository.");
    }
  }

  // 2. Non-interactive path (--yes)
  if (options.yes) {
    const language: SupportedLanguage = normalizeLanguage(options.lang);
    const detection: RepositoryDetectionResult =
      await defaultDetectorRegistry.detectRepository(repoRoot);

    const primaryScope = detection.scopes[0];
    const inferredLanguage = primaryScope?.stack.language;
    const effectiveLanguage = (options.stack as SupportedLanguageId) ?? inferredLanguage;
    const effectiveFrameworks = options.framework
      ? [options.framework]
      : (primaryScope?.stack.frameworks ?? []);

    let selectedTools: SupportedTool[] = [...SUPPORTED_TOOLS];
    if (options.tool) {
      const toolList = Array.isArray(options.tool)
        ? options.tool
        : options.tool.split(",").map((t) => t.trim());
      selectedTools = toolList.filter((t): t is SupportedTool =>
        (SUPPORTED_TOOLS as readonly string[]).includes(t),
      );
    }

    const scopes =
      detection.scopes.length > 0
        ? detection.scopes.map((s) => ({
            path: s.path,
            stack: {
              language: (options.stack as SupportedLanguageId) ?? s.stack.language,
              frameworks: options.framework ? [options.framework] : s.stack.frameworks,
            },
            verify: s.verify,
          }))
        : [
            {
              path: ".",
              stack: {
                language: (options.stack as SupportedLanguageId) ?? "typescript",
                frameworks: options.framework ? [options.framework] : [],
              },
              verify: {},
            },
          ];

    const gitWorkflow =
      options.gitWorkflow && (GIT_WORKFLOWS as readonly string[]).includes(options.gitWorkflow)
        ? (options.gitWorkflow as GitWorkflow)
        : "feature-branch";

    const commitConvention =
      options.commitConvention &&
      (COMMIT_CONVENTIONS as readonly string[]).includes(options.commitConvention)
        ? (options.commitConvention as CommitConvention)
        : "conventional";

    const effectiveArchitecture =
      options.projectKind === "new"
        ? getRecommendedArchitectures({
            language: effectiveLanguage ?? "typescript",
            frameworks: effectiveFrameworks,
            confidence: 1.0,
            evidence: ["flags"],
            hasCustomTemplates: true,
          }).recommended
        : "clean";

    const config: SpectyConfig = createDefaultConfig({
      language,
      spec_engine: options.specEngine ?? "openspec",
      project: {
        kind: options.projectKind ?? "existing",
        layout: detection.layout,
        architecture: effectiveArchitecture,
      },
      scopes,
      tools: selectedTools,
      git: {
        workflow: gitWorkflow,
        commit_convention: commitConvention,
      },
      governance: {
        hooks: options.hooks !== false,
        ci: options.ci === false ? "none" : "github",
        source_paths: resolveDefaultSourcePaths(detection),
        exempt_paths: ["**/*.md", "openspec/**", "docs/**"],
        bypass: { env: "SPECTY_BYPASS", trailer: "Specty-Bypass" },
        quality_gates: { lint: true, test: true, static: true, coverage_min: 0 },
      },
      mcp: {
        enabled: options.mcp !== false,
        graph: { max_file_kb: 512, exclude: [] },
      },
      metrics: { enabled: true },
    });

    if (!options.dryRun) {
      await saveConfig(repoRoot, config);
    }

    await generateProjectInfrastructure({
      repoRoot,
      config,
      language,
      dryRun: Boolean(options.dryRun),
      primaryLanguage: effectiveLanguage,
      frameworks: effectiveFrameworks,
      architecture: effectiveArchitecture,
    });

    const dict = getDictionary(language);
    logger.success(dict.init.success);

    return {
      config,
      applied: !options.dryRun,
      canceled: false,
      dryRun: Boolean(options.dryRun),
      language,
      inferredStack: effectiveLanguage,
    };
  }

  // 3. Interactive flow
  const result = await runInteractiveInit(repoRoot, options);
  if (!result) {
    return {
      config: createDefaultConfig(),
      applied: false,
      canceled: true,
      dryRun: Boolean(options.dryRun),
      language: normalizeLanguage(options.lang),
    };
  }

  if (!result.dryRun) {
    await saveConfig(repoRoot, result.config);
    await generateProjectInfrastructure({
      repoRoot,
      config: result.config,
      language: result.language,
      dryRun: false,
      primaryLanguage: result.inferredStack,
      frameworks: result.config.scopes[0]?.stack.frameworks,
      architecture: result.config.project.architecture,
    });
  }

  return result;
}
