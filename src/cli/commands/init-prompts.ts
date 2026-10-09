import * as p from "@clack/prompts";
import {
  createDefaultConfig,
  type SpectyConfig,
  SUPPORTED_TOOLS,
  type SupportedTool,
} from "../../core/config.js";
import { getDictionary, normalizeLanguage, type SupportedLanguage } from "../../core/i18n.js";
import { defaultDetectorRegistry } from "../../detect/detector-registry.js";
import type { RepositoryDetectionResult } from "../../detect/types.js";
import { getRecommendedArchitectures } from "./architectures.js";
import type { InitCommandOptions, InitFlowResult } from "./init-types.js";

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
        { value: "es", label: "Español", hint: "recomendado" },
        { value: "en", label: "English" },
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
      },
      {
        value: "new",
        label: dict.init.projectKindNew,
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
  if (projectKind === "new") {
    const archData = getRecommendedArchitectures(primaryScope?.stack);
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
            ? "motor estándar / recomendación oficial"
            : "standard engine / recommended",
      },
      {
        value: "builtin",
        label: "Builtin engine",
        hint:
          selectedLang === "es"
            ? "motor alternativo ligero sin dependencias externas"
            : "lightweight builtin engine",
      },
    ],
    initialValue: "openspec",
  });

  if (p.isCancel(engineRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const specEngine = engineRes as "openspec" | "builtin";

  // Step 6: MCP & Metrics (Section 8.0 #6)
  const mcpRes = await p.confirm({
    message: dict.init.mcpPrompt,
    initialValue: options.mcp !== false,
  });

  if (p.isCancel(mcpRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const enableMcp = Boolean(mcpRes);

  // Step 7: Hooks & CI (Section 8.0 #7)
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
      { value: "github", label: "GitHub Actions (.github/workflows/specty.yml)" },
      { value: "gitlab", label: "GitLab CI (.gitlab-ci.yml)" },
      { value: "azure", label: "Azure Pipelines (azure-pipelines.yml)" },
      { value: "none", label: "None / Ninguno" },
    ],
    initialValue: options.ci === false ? "none" : "github",
  });

  if (p.isCancel(ciRes)) {
    p.cancel(dict.init.canceled);
    return null;
  }
  const selectedCi = ciRes as "github" | "gitlab" | "azure" | "none";

  // Step 8: Summary and Confirmation (Section 8.0 #8)
  const summaryLines = [
    `Language: ${selectedLang.toUpperCase()}`,
    `Stack: ${detectedStackInfo}`,
    `Project: ${projectKind} (${architecture})`,
    `Spec engine: ${specEngine}`,
    `AI Tools: ${selectedTools.join(", ")}`,
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
    detection.scopes.length > 0
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
    governance: {
      hooks: enableHooks,
      ci: selectedCi,
      source_paths: ["src/**"],
      exempt_paths: ["**/*.md", "openspec/**", ".specty/**", "docs/**"],
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
    inferredStack: primaryScope?.stack.language,
  };
}
