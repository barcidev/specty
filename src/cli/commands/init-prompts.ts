import * as p from "@clack/prompts";
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
  type UiBorderRadius,
  type UiColorMode,
  type UiPurpose,
  type UiTargetAudience,
  type UiVisualEffects,
} from "../../core/config.js";
import { getDictionary, normalizeLanguage, type SupportedLanguage } from "../../core/i18n.js";
import { defaultDetectorRegistry } from "../../detect/detector-registry.js";
import { resolveDefaultSourcePaths } from "../../detect/source-paths-resolver.js";
import type {
  MonorepoDetection,
  MonorepoKind,
  RepositoryDetectionResult,
  RepositoryLayout,
  StackDetection,
  SupportedLanguageId,
} from "../../detect/types.js";
import { getRecommendedArchitectures } from "./architectures.js";
import { getCommitConventionOptions, getGitWorkflowOptions } from "./git-options.js";
import type { InitCommandOptions, InitFlowResult } from "./init-types.js";
import { getFrameworkOptions, getLanguageOptions } from "./stack-options.js";
import {
  getMonorepoToolOptions,
  getStructureOptions,
  getWorkspaceComponentOptions,
  type StructureType,
} from "./structure-options.js";
import {
  DEFAULT_NEUTRAL_UI_CONFIG,
  getUiAudienceOptions,
  getUiBorderRadiusOptions,
  getUiColorModeOptions,
  getUiPurposeOptions,
  getUiVisualEffectsOptions,
} from "./ui-style-options.js";

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
  let chosenLayout: RepositoryLayout = detection.layout;
  let chosenMonorepo: MonorepoDetection | undefined = detection.monorepo;
  let chosenScopes: Array<{
    path: string;
    stack: { language: SupportedLanguageId; frameworks: string[] };
    verify: Record<string, string>;
  }> = [];

  if (projectKind === "new") {
    // Step 3.0: Estructura del repositorio (Monolito, Monorepo o Workspace)
    const structRes = await p.select({
      message: dict.init.structurePrompt,
      options: getStructureOptions(selectedLang).map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint,
      })),
      initialValue: (options.structure as StructureType) ?? "single",
    });

    if (p.isCancel(structRes)) {
      p.cancel(dict.init.canceled);
      return null;
    }
    const chosenStructure = structRes as StructureType;
    chosenLayout = chosenStructure;

    if (chosenStructure === "single") {
      // Caso 1: Monolito -> Seleccionar exactamente 1 lenguaje y 1 framework
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
        evidence: ["user-selection:monolith"],
        hasCustomTemplates: ["typescript", "javascript", "dart", "csharp"].includes(chosenLanguage),
      };

      chosenScopes = [
        {
          path: ".",
          stack: {
            language: chosenLanguage,
            frameworks: chosenFrameworks,
          },
          verify: {},
        },
      ];

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
    } else if (chosenStructure === "monorepo") {
      // Caso 2: Monorepo -> Lista de monorepos disponibles y solo se selecciona 1
      const monorepoOptions = getMonorepoToolOptions(selectedLang);
      const defaultMonorepoTool = (options.monorepoKind as MonorepoKind) ?? "turbo";

      const monoRes = await p.select({
        message: dict.init.monorepoToolPrompt,
        options: monorepoOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
          hint: opt.hint,
        })),
        initialValue: defaultMonorepoTool,
      });

      if (p.isCancel(monoRes)) {
        p.cancel(dict.init.canceled);
        return null;
      }
      const chosenMonoKind = monoRes as MonorepoKind;
      const selectedMonoDef =
        monorepoOptions.find((m) => m.value === chosenMonoKind) ?? monorepoOptions[0];
      if (!selectedMonoDef) {
        p.cancel(dict.init.canceled);
        return null;
      }

      const chosenLanguage = selectedMonoDef.defaultLanguage;
      let chosenFrameworks = [...selectedMonoDef.defaultFrameworks];

      if (["turbo", "nx", "pnpm", "npm", "yarn", "lerna"].includes(chosenMonoKind)) {
        const fwOptions = getFrameworkOptions("typescript", selectedLang);
        const fwRes = await p.select({
          message: dict.init.newProjectFrameworkPrompt,
          options: fwOptions.map((opt) => ({
            value: opt.value,
            label: opt.label,
            hint: opt.hint,
          })),
          initialValue: selectedMonoDef.defaultFrameworks[0] ?? fwOptions[0]?.value,
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
        evidence: [`user-selection:monorepo:${chosenMonoKind}`],
        hasCustomTemplates: true,
      };

      chosenMonorepo = {
        isMonorepo: true,
        kind: chosenMonoKind,
        packageGlobs: selectedMonoDef.packageGlobs,
        packagePaths: selectedMonoDef.scopes.map((s) => s.path),
      };

      chosenScopes = selectedMonoDef.scopes.map((s) => ({
        path: s.path,
        stack: {
          language: s.language,
          frameworks: s.frameworks.length > 0 ? chosenFrameworks : [],
        },
        verify: {},
      }));

      const archData = getRecommendedArchitectures(chosenStack);
      const archRes = await p.select({
        message:
          selectedLang === "es"
            ? "Selecciona el patrón arquitectural del monorepo:"
            : "Select monorepo architectural pattern:",
        options: archData.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          hint: opt.description,
        })),
        initialValue: "modular",
      });

      if (p.isCancel(archRes)) {
        p.cancel(dict.init.canceled);
        return null;
      }
      architecture = archRes as string;
    } else if (chosenStructure === "workspace") {
      // Caso 3: Workspace -> Poder elegir multiples frameworks y/o lenguajes o monorepos
      const compOptions = getWorkspaceComponentOptions(selectedLang);
      const defaultComps = options.components ?? ["web-react", "api-fastapi"];

      const compsRes = await p.multiselect({
        message: dict.init.workspaceComponentsPrompt,
        options: compOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
          hint: opt.hint,
        })),
        initialValues: defaultComps,
        required: true,
      });

      if (p.isCancel(compsRes)) {
        p.cancel(dict.init.canceled);
        return null;
      }
      const selectedComponentValues = compsRes as string[];
      const selectedComponents = compOptions.filter((c) =>
        selectedComponentValues.includes(c.value),
      );

      const allLangs = Array.from(new Set(selectedComponents.map((c) => c.language)));
      const allFws = Array.from(new Set(selectedComponents.flatMap((c) => c.frameworks)));

      chosenStack = {
        language: allLangs[0] ?? "typescript",
        frameworks: allFws,
        confidence: 1.0,
        evidence: ["user-selection:workspace:polyglot"],
        hasCustomTemplates: true,
      };

      chosenScopes = selectedComponents.map((c) => ({
        path: c.path,
        stack: {
          language: c.language,
          frameworks: c.frameworks,
        },
        verify: {},
      }));

      architecture = "modular";
    }
  }

  // Step 3.5: Graphical User Interface & Visual Style
  const detectedUi = detection.ui;
  const initialLibraries = new Set<string>(detectedUi?.libraries ?? []);

  if (detectedUi?.hasGui && detectedUi.libraries.length > 0) {
    p.log.info(
      selectedLang === "es"
        ? `${dict.init.uiDetectedLibraries} ${detectedUi.libraries.join(", ")}`
        : `${dict.init.uiDetectedLibraries} ${detectedUi.libraries.join(", ")}`,
    );
  }

  let hasGui = options.hasGui;
  let uiPurpose: UiPurpose = (options.uiPurpose as UiPurpose) ?? DEFAULT_NEUTRAL_UI_CONFIG.purpose;
  let uiAudience: UiTargetAudience =
    (options.uiTargetAudience as UiTargetAudience) ?? DEFAULT_NEUTRAL_UI_CONFIG.targetAudience;
  let uiBorderRadius: UiBorderRadius =
    (options.uiBorderRadius as UiBorderRadius) ??
    detectedUi?.borderRadius ??
    DEFAULT_NEUTRAL_UI_CONFIG.borderRadius;
  let uiVisualEffects: UiVisualEffects =
    (options.uiVisualEffects as UiVisualEffects) ?? DEFAULT_NEUTRAL_UI_CONFIG.visualEffects;
  let uiColorMode: UiColorMode =
    (options.uiColorMode as UiColorMode) ??
    detectedUi?.colorMode ??
    DEFAULT_NEUTRAL_UI_CONFIG.colorMode;
  let isCustomizedUi = Boolean(options.uiCustomize);

  if (hasGui === undefined) {
    const guiRes = await p.confirm({
      message: dict.init.hasGuiPrompt,
      initialValue: true,
    });
    if (p.isCancel(guiRes)) {
      p.cancel(dict.init.canceled);
      return null;
    }
    hasGui = Boolean(guiRes);
  }

  if (hasGui) {
    let wantsCustomize = options.uiCustomize;
    if (wantsCustomize === undefined) {
      const custRes = await p.select({
        message: dict.init.uiCustomizePrompt,
        options: [
          {
            value: false,
            label: dict.init.uiCustomizeOptionDefault,
          },
          {
            value: true,
            label: dict.init.uiCustomizeOptionCustom,
          },
        ],
        initialValue: false,
      });
      if (p.isCancel(custRes)) {
        p.cancel(dict.init.canceled);
        return null;
      }
      wantsCustomize = Boolean(custRes);
    }

    isCustomizedUi = wantsCustomize;

    if (wantsCustomize) {
      // 1. Purpose
      if (!options.uiPurpose) {
        const purpRes = await p.select({
          message: dict.init.uiPurposePrompt,
          options: getUiPurposeOptions(selectedLang).map((o) => ({
            value: o.value,
            label: o.name,
          })),
          initialValue: "general-purpose",
        });
        if (p.isCancel(purpRes)) {
          p.cancel(dict.init.canceled);
          return null;
        }
        uiPurpose = purpRes as UiPurpose;
      }

      // 2. Target Audience
      if (!options.uiTargetAudience) {
        const audRes = await p.select({
          message: dict.init.uiAudiencePrompt,
          options: getUiAudienceOptions(selectedLang).map((o) => ({
            value: o.value,
            label: o.name,
          })),
          initialValue: "general-public",
        });
        if (p.isCancel(audRes)) {
          p.cancel(dict.init.canceled);
          return null;
        }
        uiAudience = audRes as UiTargetAudience;
      }

      // 3. Border Radius
      if (!options.uiBorderRadius) {
        const radRes = await p.select({
          message: dict.init.uiBorderRadiusPrompt,
          options: getUiBorderRadiusOptions(selectedLang).map((o) => ({
            value: o.value,
            label: o.name,
          })),
          initialValue: detectedUi?.borderRadius ?? "semi-rounded",
        });
        if (p.isCancel(radRes)) {
          p.cancel(dict.init.canceled);
          return null;
        }
        uiBorderRadius = radRes as UiBorderRadius;
      }

      // 4. Visual Effects & Surfaces
      if (!options.uiVisualEffects) {
        const effRes = await p.select({
          message: dict.init.uiVisualEffectsPrompt,
          options: getUiVisualEffectsOptions(selectedLang).map((o) => ({
            value: o.value,
            label: o.name,
          })),
          initialValue: "subtle-elevation",
        });
        if (p.isCancel(effRes)) {
          p.cancel(dict.init.canceled);
          return null;
        }
        uiVisualEffects = effRes as UiVisualEffects;
      }

      // 5. Color Mode
      if (!options.uiColorMode) {
        const colRes = await p.select({
          message: dict.init.uiColorModePrompt,
          options: getUiColorModeOptions(selectedLang).map((o) => ({
            value: o.value,
            label: o.name,
          })),
          initialValue: detectedUi?.colorMode ?? "both",
        });
        if (p.isCancel(colRes)) {
          p.cancel(dict.init.canceled);
          return null;
        }
        uiColorMode = colRes as UiColorMode;
      }
    }

    // Prompt for missing libraries (comma-separated)
    if (!options.uiLibraries) {
      const missingLibsRes = await p.text({
        message: dict.init.uiMissingLibrariesPrompt,
        placeholder: dict.init.uiMissingLibrariesPlaceholder,
        initialValue: "",
      });

      if (p.isCancel(missingLibsRes)) {
        p.cancel(dict.init.canceled);
        return null;
      }

      if (typeof missingLibsRes === "string" && missingLibsRes.trim().length > 0) {
        const extraLibs = missingLibsRes
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        for (const lib of extraLibs) {
          initialLibraries.add(lib);
        }
      }
    } else {
      const extra = Array.isArray(options.uiLibraries)
        ? options.uiLibraries
        : options.uiLibraries.split(",").map((s) => s.trim());
      for (const lib of extra) {
        if (lib.length > 0) {
          initialLibraries.add(lib);
        }
      }
    }
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

  let autoIndex = true;
  if (enableMcp) {
    const autoIndexRes = await p.confirm({
      message: dict.init.autoIndexPrompt,
      initialValue: true,
    });
    if (p.isCancel(autoIndexRes)) {
      p.cancel(dict.init.canceled);
      return null;
    }
    autoIndex = Boolean(autoIndexRes);
  }

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
    projectKind === "new"
      ? chosenLayout === "single"
        ? `${chosenStack?.language ?? "generic"} (${chosenStack?.frameworks.join(", ") || "core"})`
        : chosenLayout === "monorepo"
          ? `${chosenMonorepo?.kind?.toUpperCase() ?? "MONOREPO"} [${chosenStack?.language ?? "typescript"}]`
          : `Workspace (${chosenScopes.map((s) => `${s.path}:${s.stack.language}`).join(", ")})`
      : detectedStackInfo;

  const summaryLines = [
    `Language: ${selectedLang.toUpperCase()}`,
    `Structure: ${chosenLayout}`,
    `Stack: ${effectiveStackInfo}`,
    `Project: ${projectKind} (${architecture})`,
    `Spec engine: ${specEngine}`,
    `AI Tools: ${selectedTools.join(", ")}`,
    `Git Workflow: ${selectedGitWorkflow}`,
    `Commit Convention: ${selectedCommitConvention}`,
    `MCP & Metrics: ${enableMcp ? "Enabled" : "Disabled"}`,
    `Hooks: ${enableHooks ? "Enabled" : "Disabled"}`,
    `CI: ${selectedCi}`,
    hasGui
      ? `UI Style: ${isCustomizedUi ? "Customized" : "Neutral Default"} (${uiPurpose}, ${uiAudience}, ${uiBorderRadius}, ${uiVisualEffects}, ${uiColorMode})${initialLibraries.size > 0 ? ` [Libs: ${Array.from(initialLibraries).join(", ")}]` : ""}`
      : "GUI: None",
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
    projectKind === "new" && chosenScopes.length > 0
      ? chosenScopes
      : projectKind === "new" && chosenStack
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

  const uiConfig: SpectyUiConfig | undefined = hasGui
    ? {
        has_gui: true,
        is_customized: isCustomizedUi,
        purpose: uiPurpose,
        target_audience: uiAudience,
        border_radius: uiBorderRadius,
        visual_effects: uiVisualEffects,
        color_mode: uiColorMode,
        detected_libraries: Array.from(initialLibraries),
        tokens: detectedUi?.tokens ?? [],
      }
    : undefined;

  const config: SpectyConfig = createDefaultConfig({
    language: selectedLang,
    spec_engine: specEngine,
    project: {
      kind: projectKind,
      layout: chosenLayout,
      architecture,
    },
    scopes,
    tools: selectedTools,
    git: {
      workflow: selectedGitWorkflow,
      commit_convention: selectedCommitConvention,
    },
    ui: uiConfig,
    governance: {
      hooks: enableHooks,
      ci: selectedCi,
      source_paths: resolveDefaultSourcePaths({
        ...detection,
        layout: chosenLayout,
        scopes: scopes.map((s) => ({
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
      enabled: enableMcp,
      graph_provider: "codebase-memory",
      codebase_memory: {
        command: "codebase-memory-mcp",
        args: [],
        auto_index: autoIndex,
      },
      graph: { max_file_kb: 512, exclude: [] },
    },
    metrics: { enabled: true },
  });

  p.outro(dict.init.success);

  if (hasGui) {
    p.note(dict.init.uiStyleNotice, "UI Style & Tokens");
  }

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
