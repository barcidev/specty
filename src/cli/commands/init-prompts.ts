import * as p from "@clack/prompts";
import {
  COMMIT_CONVENTIONS,
  type CommitConvention,
  createDefaultConfig,
  GIT_WORKFLOWS,
  type GitWorkflow,
  type SpectyConfig,
  SUPPORTED_TOOLS,
  type SupportedTool,
} from "../../core/config.js";
import { getDictionary, normalizeLanguage, type SupportedLanguage } from "../../core/i18n.js";
import { defaultDetectorRegistry } from "../../detect/detector-registry.js";
import { resolveDefaultSourcePaths } from "../../detect/source-paths-resolver.js";
import type {
  RepositoryDetectionResult,
  StackDetection,
  SupportedLanguageId,
} from "../../detect/types.js";
import { getRecommendedArchitectures } from "./architectures.js";
import { getCommitConventionOptions, getGitWorkflowOptions } from "./git-options.js";
import type { InitCommandOptions, InitFlowResult } from "./init-types.js";
import { getFrameworkOptions, getLanguageOptions } from "./stack-options.js";

const TOOL_CONFIG_EXAMPLES: Record<SupportedTool, string> = {
  antigravity: ".gemini/config/rules, GEMINI.md",
  claude: "CLAUDE.md",
  cursor: ".cursor/rules/specty.mdc",
  "github-copilot": ".github/copilot-instructions.md",
  windsurf: ".windsurfrules",
  codex: ".codex/instructions.md",
  gemini: ".gemini/config/rules",
  cline: ".clinerules",
  roocode: ".roomodes, .roorules",
  continue: ".continue/config.json",
  junie: ".junie/instructions.md",
  "amazon-q": ".amazonq/instructions.md",
  aider: ".aider.conf.yml",
  opencode: ".opencode/instructions.md",
  zed: ".zed/settings.json",
  cody: ".cody/rules.json",
  chatgpt: ".specty/exports/chatgpt-instructions.md",
};

export async function runInteractiveInit(
  repoRoot: string,
  options: InitCommandOptions,
): Promise<InitFlowResult | null> {
  p.intro("specty - Specification-driven AI assistant governance");

  // Step 1: Language Selection (Section 8.0 #1)
  let selectedLang: SupportedLanguage;
  if (options.lang) {
    selectedLang = normalizeLanguage(options.lang);
  } else {
    const langRes = await p.select({
      message: "Select language / Selecciona el idioma:",
      options: [
        {
          value: "es",
          label: "Español",
          hint: "recomendado (Ej: 'specty status', documentación en español)",
        },
        {
          value: "en",
          label: "English",
          hint: "recommended (Ex: 'specty status', documentation in English)",
        },
      ],
      initialValue: "es",
    });

    if (p.isCancel(langRes)) {
      p.cancel("Setup canceled / Configuración cancelada.");
      return null;
    }
    selectedLang = langRes as SupportedLanguage;
  }

  const dict = getDictionary(selectedLang);

  // Step 2: Stack & Frameworks Detection (Section 8.0 #2)
  const s = p.spinner();
  s.start(dict.init.detectingStack);
  const detection: RepositoryDetectionResult =
    await defaultDetectorRegistry.detectRepository(repoRoot);
  s.stop(dict.init.stackDetected);

  const primaryScope = detection.scopes[0];
  const detectedStackInfo = primaryScope
    ? `${primaryScope.stack.language} (${primaryScope.stack.frameworks.join(", ") || "core"})`
    : "generic";

  p.log.info(
    selectedLang === "es"
      ? `Stack detectado: ${detectedStackInfo} [Layout: ${detection.layout}]`
      : `Detected stack: ${detectedStackInfo} [Layout: ${detection.layout}]`,
  );

  // Step 3: Project Kind (Section 8.0 #3)
  const kindRes = await p.select({
    message: dict.init.projectKindPrompt,
    options: [
      {
        value: "existing",
        label: dict.init.projectKindExisting,
        hint:
          selectedLang === "es"
            ? "Ej: detecta stack existente (src/, package.json) y genera specs incrementales"
            : "Ex: inspects existing stack (src/, package.json) and starts incremental specs",
      },
      {
        value: "new",
        label: dict.init.projectKindNew,
        hint:
          selectedLang === "es"
            ? "Ej: estructura limpia desde cero con arquitectura recomendada"
            : "Ex: clean scaffold from scratch with recommended architecture pattern",
      },
    ],
    initialValue: "existing",
  });

  if (p.isCancel(kindRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const projectKind = kindRes as "new" | "existing";

  let architecture = "clean";
  let chosenStack: StackDetection | undefined;

  if (projectKind === "new") {
    // Step 3.1: Language Selection for new project
    const defaultLanguage: SupportedLanguageId =
      (options.stack as SupportedLanguageId) ?? primaryScope?.stack.language ?? "typescript";

    const langRes = await p.select({
      message: dict.init.newProjectLanguagePrompt,
      options: getLanguageOptions(selectedLang).map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint,
      })),
      initialValue: defaultLanguage,
    });

    if (p.isCancel(langRes)) {
      p.cancel(dict.init.canceled);
      return null;
    }
    const chosenLanguage = langRes as SupportedLanguageId;

    // Step 3.2: Framework Selection for new project
    const fwOptions = getFrameworkOptions(chosenLanguage, selectedLang);
    let chosenFrameworks: string[] = [];

    if (fwOptions.length > 0) {
      const defaultFw =
        options.framework && fwOptions.some((f) => f.value === options.framework)
          ? options.framework
          : primaryScope?.stack.language === chosenLanguage &&
              primaryScope?.stack.frameworks[0] &&
              fwOptions.some((f) => f.value === primaryScope.stack.frameworks[0])
            ? primaryScope.stack.frameworks[0]
            : fwOptions[0]?.value;

      const fwRes = await p.select({
        message: dict.init.newProjectFrameworkPrompt,
        options: fwOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
          hint: opt.hint,
        })),
        initialValue: defaultFw,
      });

      if (p.isCancel(fwRes)) {
        p.cancel(dict.init.canceled);
        return null;
      }

      if (fwRes && fwRes !== "none") {
        chosenFrameworks = [fwRes as string];
      }
    }

    chosenStack = {
      language: chosenLanguage,
      frameworks: chosenFrameworks,
      confidence: 1.0,
      evidence: ["user-selection"],
      hasCustomTemplates: ["typescript", "javascript", "dart", "csharp"].includes(chosenLanguage),
    };

    // Step 3.3: Architectural Pattern Selection
    const archData = getRecommendedArchitectures(chosenStack);
    const archRes = await p.select({
      message:
        selectedLang === "es"
          ? "Selecciona el patrón arquitectural del proyecto:"
          : "Select project architectural pattern:",
      options: archData.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.description,
      })),
      initialValue: archData.recommended,
    });

    if (p.isCancel(archRes)) {
      p.cancel(dict.init.canceled);
      return null;
    }
    architecture = archRes as string;
  }

  // Step 4: AI Tools (Section 8.0 #4 - All preselected by default)
  const toolOptions = SUPPORTED_TOOLS.map((toolId) => ({
    value: toolId,
    label: toolId,
    hint: `Ej: ${TOOL_CONFIG_EXAMPLES[toolId] ?? toolId}`,
  }));

  const toolsRes = await p.multiselect({
    message: dict.init.toolsPrompt,
    options: toolOptions,
    initialValues: [...SUPPORTED_TOOLS],
    required: true,
  });

  if (p.isCancel(toolsRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const selectedTools = toolsRes as SupportedTool[];

  // Step 5: Spec Engine (Section 8.0 #5)
  const engineRes = await p.select({
    message: dict.init.enginePrompt,
    options: [
      {
        value: "openspec",
        label: "OpenSpec 1.14.1",
        hint:
          selectedLang === "es"
            ? "motor oficial recomendado (Ej: openspec/changes/<change>/proposal.md)"
            : "official recommended engine (Ex: openspec/changes/<change>/proposal.md)",
      },
      {
        value: "builtin",
        label: "Builtin engine",
        hint:
          selectedLang === "es"
            ? "motor alternativo ligero (Ej: .specty/changes/<change>/proposal.md)"
            : "lightweight builtin engine (Ex: .specty/changes/<change>/proposal.md)",
      },
    ],
    initialValue: "openspec",
  });

  if (p.isCancel(engineRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const specEngine = engineRes as "openspec" | "builtin";

  // Step 6: Git Branching Workflow
  let selectedGitWorkflow: GitWorkflow = "feature-branch";
  if (options.gitWorkflow && (GIT_WORKFLOWS as readonly string[]).includes(options.gitWorkflow)) {
    selectedGitWorkflow = options.gitWorkflow as GitWorkflow;
  } else {
    const workflowOptions = getGitWorkflowOptions(selectedLang);
    const wfRes = await p.select({
      message: dict.init.gitWorkflowPrompt,
      options: workflowOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint,
      })),
      initialValue: "feature-branch",
    });

    if (p.isCancel(wfRes)) {
      p.cancel(dict.init.canceled);
      return null;
    }
    selectedGitWorkflow = wfRes as GitWorkflow;
  }

  // Step 7: Commit Message Convention (base & hybrid permutations)
  let selectedCommitConvention: CommitConvention = "conventional";
  if (
    options.commitConvention &&
    (COMMIT_CONVENTIONS as readonly string[]).includes(options.commitConvention)
  ) {
    selectedCommitConvention = options.commitConvention as CommitConvention;
  } else {
    const convOptions = getCommitConventionOptions(selectedLang);
    const convRes = await p.select({
      message: dict.init.commitConventionPrompt,
      options: convOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint,
      })),
      initialValue: "conventional",
    });

    if (p.isCancel(convRes)) {
      p.cancel(dict.init.canceled);
      return null;
    }
    selectedCommitConvention = convRes as CommitConvention;
  }

  // Step 8: MCP & Metrics (Section 8.0 #6)
  const mcpRes = await p.confirm({
    message: dict.init.mcpPrompt,
    initialValue: options.mcp !== false,
  });

  if (p.isCancel(mcpRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const enableMcp = Boolean(mcpRes);

  // Step 9: Hooks & CI (Section 8.0 #7)
  const hooksRes = await p.confirm({
    message: dict.init.hooksPrompt,
    initialValue: options.hooks !== false,
  });

  if (p.isCancel(hooksRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const enableHooks = Boolean(hooksRes);

  const ciRes = await p.select({
    message: dict.init.ciPrompt,
    options: [
      {
        value: "github",
        label: "GitHub Actions",
        hint: "Ej: .github/workflows/specty.yml",
      },
      {
        value: "gitlab",
        label: "GitLab CI",
        hint: "Ej: .gitlab-ci.yml",
      },
      {
        value: "azure",
        label: "Azure Pipelines",
        hint: "Ej: azure-pipelines.yml",
      },
      {
        value: "bitbucket",
        label: "Bitbucket Pipelines",
        hint: "Ej: bitbucket-pipelines.yml",
      },
      {
        value: "none",
        label: "None / Ninguno",
        hint: selectedLang === "es" ? "Ej: sin pipeline de CI" : "Ex: no CI workflow",
      },
    ],
    initialValue: options.ci === false ? "none" : "github",
  });

  if (p.isCancel(ciRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const selectedCi = ciRes as "github" | "gitlab" | "azure" | "bitbucket" | "none";

  // Step 10: Summary and Confirmation (Section 8.0 #8)
  const effectiveStackInfo =
    projectKind === "new" && chosenStack
      ? `${chosenStack.language} (${chosenStack.frameworks.join(", ") || "core"})`
      : detectedStackInfo;

  const summaryLines = [
    `Language: ${selectedLang.toUpperCase()}`,
    `Stack: ${effectiveStackInfo}`,
    `Project: ${projectKind} (${architecture})`,
    `Spec engine: ${specEngine}`,
    `AI Tools: ${selectedTools.join(", ")}`,
    `Git Workflow: ${selectedGitWorkflow}`,
    `Commit Convention: ${selectedCommitConvention}`,
    `MCP & Metrics: ${enableMcp ? "Enabled" : "Disabled"}`,
    `Hooks: ${enableHooks ? "Enabled" : "Disabled"}`,
    `CI: ${selectedCi}`,
  ];

  p.note(summaryLines.join("\n"), dict.init.summaryTitle);

  const confirmRes = await p.confirm({
    message: dict.init.confirmPrompt,
    initialValue: true,
  });

  if (p.isCancel(confirmRes) || !confirmRes) {
    p.cancel(dict.init.canceled);
    return null;
  }

  const scopes =
    projectKind === "new" && chosenStack
      ? [
          {
            path: ".",
            stack: {
              language: chosenStack.language,
              frameworks: chosenStack.frameworks,
            },
            verify: {},
          },
        ]
      : detection.scopes.length > 0
        ? detection.scopes.map((s) => ({
            path: s.path,
            stack: {
              language: s.stack.language,
              frameworks: s.stack.frameworks,
            },
            verify: s.verify,
          }))
        : [
            {
              path: ".",
              stack: {
                language: primaryScope?.stack.language ?? "typescript",
                frameworks: primaryScope?.stack.frameworks ?? [],
              },
              verify: {},
            },
          ];

  const config: SpectyConfig = createDefaultConfig({
    language: selectedLang,
    spec_engine: specEngine,
    project: {
      kind: projectKind,
      layout: detection.layout,
      architecture,
    },
    scopes,
    tools: selectedTools,
    git: {
      workflow: selectedGitWorkflow,
      commit_convention: selectedCommitConvention,
    },
    governance: {
      hooks: enableHooks,
      ci: selectedCi,
      source_paths: resolveDefaultSourcePaths(detection),
      exempt_paths: ["**/*.md", "openspec/**", "docs/**"],
      bypass: { env: "SPECTY_BYPASS", trailer: "Specty-Bypass" },
      quality_gates: { lint: true, test: true, static: true, coverage_min: 0 },
    },
    mcp: {
      enabled: enableMcp,
      graph: { max_file_kb: 512, exclude: [] },
    },
    metrics: { enabled: true },
  });

  p.outro(dict.init.success);

  return {
    config,
    applied: true,
    canceled: false,
    dryRun: Boolean(options.dryRun),
    language: selectedLang,
    inferredStack:
      projectKind === "new" && chosenStack ? chosenStack.language : primaryScope?.stack.language,
  };
}
