import path from "node:path";
import {
  createDefaultConfig,
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
              frameworks: s.stack.frameworks,
            },
            verify: s.verify,
          }))
        : [
            {
              path: ".",
              stack: {
                language: (options.stack as SupportedLanguageId) ?? "typescript",
                frameworks: [],
              },
              verify: {},
            },
          ];

    const config: SpectyConfig = createDefaultConfig({
      language,
      spec_engine: options.specEngine ?? "openspec",
      project: {
        kind: "existing",
        layout: detection.layout,
        architecture: "clean",
      },
      scopes,
      tools: selectedTools,
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
      primaryLanguage: inferredLanguage,
      frameworks: primaryScope?.stack.frameworks,
    });

    const dict = getDictionary(language);
    logger.success(dict.init.success);

    return {
      config,
      applied: !options.dryRun,
      canceled: false,
      dryRun: Boolean(options.dryRun),
      language,
      inferredStack: inferredLanguage,
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
    });
  }

  return result;
}
