import path from "node:path";
import {
  COMMIT_CONVENTIONS,
  type CommitConvention,
  createDefaultConfig,
  GIT_WORKFLOWS,
  type GitWorkflow,
  type SpectyConfig,
  type SpectyUiConfig,
  SUPPORTED_TOOLS,
  type SupportedTool,
  saveConfig,
  type UiBorderRadius,
  type UiColorMode,
  type UiPurpose,
  type UiTargetAudience,
  type UiVisualEffects,
} from "../../core/config.js";
import { initGitRepo, isInsideGitRepo } from "../../core/git.js";
import { ensureGlobalDependencies } from "../../core/global-deps.js";
import { getDictionary, normalizeLanguage, type SupportedLanguage } from "../../core/i18n.js";
import { logger } from "../../core/logger.js";
import { defaultDetectorRegistry } from "../../detect/detector-registry.js";
import { resolveDefaultSourcePaths } from "../../detect/source-paths-resolver.js";
import type {
  RepositoryDetectionResult,
  RepositoryLayout,
  SupportedLanguageId,
} from "../../detect/types.js";
import { generateProjectInfrastructure } from "../../generate/index.js";
import { getRecommendedArchitectures } from "./architectures.js";
import { runInteractiveInit } from "./init-prompts.js";
import type { InitCommandOptions, InitFlowResult } from "./init-types.js";
import { getMonorepoToolOptions, getWorkspaceComponentOptions } from "./structure-options.js";

export async function executeInit(options: InitCommandOptions = {}): Promise<InitFlowResult> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  if (options.verbose) {
    logger.setLevel("debug");
  }

  // 1. Check Git repository
  let isGit = await isInsideGitRepo(repoRoot);
  if (!isGit) {
    logger.warn("Repository does not appear to be an initialized Git repository.");
    if (!options.dryRun) {
      await initGitRepo(repoRoot);
      logger.success("Initialized new Git repository.");
      isGit = true;
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

    const effectiveLayout: RepositoryLayout =
      options.structure ?? (detection.layout === "monorepo" ? "monorepo" : "single");

    let resolvedScopes = scopes;
    if (options.structure === "monorepo" && options.monorepoKind) {
      const monoOptions = getMonorepoToolOptions(language);
      const monoDef = monoOptions.find((m) => m.value === options.monorepoKind);
      if (monoDef) {
        resolvedScopes = monoDef.scopes.map((s) => ({
          path: s.path,
          stack: {
            language: s.language,
            frameworks: s.frameworks.length > 0 ? effectiveFrameworks : [],
          },
          verify: {},
        }));
      }
    } else if (
      options.structure === "workspace" &&
      options.components &&
      options.components.length > 0
    ) {
      const compOptions = getWorkspaceComponentOptions(language);
      const selectedComps = compOptions.filter((c) => options.components?.includes(c.value));
      if (selectedComps.length > 0) {
        resolvedScopes = selectedComps.map((c) => ({
          path: c.path,
          stack: {
            language: c.language,
            frameworks: c.frameworks,
          },
          verify: {},
        }));
      }
    }

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

    const detectedUi = detection.ui;
    const hasGui = options.hasGui ?? Boolean(detectedUi?.hasGui);

    const resolvedLibraries: string[] = [];
    if (detectedUi?.libraries) {
      resolvedLibraries.push(...detectedUi.libraries);
    }
    if (options.uiLibraries) {
      const extra = Array.isArray(options.uiLibraries)
        ? options.uiLibraries
        : options.uiLibraries.split(",").map((s) => s.trim());
      for (const lib of extra) {
        if (lib.length > 0 && !resolvedLibraries.includes(lib)) {
          resolvedLibraries.push(lib);
        }
      }
    }

    const uiConfig: SpectyUiConfig | undefined = hasGui
      ? {
          has_gui: true,
          is_customized: Boolean(options.uiCustomize),
          purpose: (options.uiPurpose as UiPurpose) ?? "general-purpose",
          target_audience: (options.uiTargetAudience as UiTargetAudience) ?? "general-public",
          border_radius:
            (options.uiBorderRadius as UiBorderRadius) ??
            detectedUi?.borderRadius ??
            "semi-rounded",
          visual_effects: (options.uiVisualEffects as UiVisualEffects) ?? "subtle-elevation",
          color_mode: (options.uiColorMode as UiColorMode) ?? detectedUi?.colorMode ?? "both",
          detected_libraries: resolvedLibraries,
          tokens: detectedUi?.tokens ?? [],
        }
      : undefined;

    const config: SpectyConfig = createDefaultConfig({
      language,
      spec_engine: options.specEngine ?? "openspec",
      project: {
        kind: options.projectKind ?? "existing",
        layout: effectiveLayout,
        architecture: effectiveArchitecture,
      },
      scopes: resolvedScopes,
      tools: selectedTools,
      git: {
        workflow: gitWorkflow,
        commit_convention: commitConvention,
      },
      ui: uiConfig,
      governance: {
        hooks: options.hooks !== false,
        ci: options.ci === false ? "none" : "github",
        source_paths: resolveDefaultSourcePaths({
          ...detection,
          layout: effectiveLayout,
          scopes: resolvedScopes.map((s) => ({
            path: s.path,
            stack: {
              language: s.stack.language,
              frameworks: s.stack.frameworks,
              confidence: 1.0,
              evidence: [],
              hasCustomTemplates: true,
            },
            verify: s.verify,
          })),
        }),
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

    if (!options.dryRun) {
      await ensureGlobalDependencies(config, {
        skipGlobalInstall: options.skipGlobalInstall,
      });
    }

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

    await ensureGlobalDependencies(result.config, {
      skipGlobalInstall: options.skipGlobalInstall,
    });
  }

  return result;
}
