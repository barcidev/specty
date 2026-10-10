import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { SupportedLanguage } from "../core/i18n.js";
import type { GeneratedFile } from "../generate/types.js";
import { parseJsonc } from "./jsonc.js";
import type { AdapterContext, ToolAdapter } from "./types.js";

const CODY_PROJECT_PATH = ".cody/project.json";
const CODY_RULES_PATH = ".cody/rules.json";

interface CodyRuleItem {
  name: string;
  rule: string;
}

interface CodyRulesConfig {
  name: string;
  description: string;
  rules: CodyRuleItem[];
  [key: string]: unknown;
}

function buildDefaultRules(lang: SupportedLanguage): CodyRuleItem[] {
  if (lang === "es") {
    return [
      {
        name: "sovereign-rule",
        rule: "La unica fuente de verdad para directivas, flujos, roles y restricciones es AGENTS.md.",
      },
      {
        name: "mandatory-workflow",
        rule: "Nunca escribas codigo sin un cambio aprobado por un humano en openspec/changes/<change>/.",
      },
      {
        name: "role-routing",
        rule: "Consulta la matriz de enrutamiento en .specty/routing.md para adoptar el rol adecuado antes de actuar.",
      },
      {
        name: "verification-gates",
        rule: "Ejecuta siempre los comandos de verificacion definidos en .specty/config.yaml antes de dar por concluida una tarea.",
      },
    ];
  }

  return [
    {
      name: "sovereign-rule",
      rule: "The single source of truth for directives, workflows, roles, and boundaries is AGENTS.md.",
    },
    {
      name: "mandatory-workflow",
      rule: "Never write code without a human-approved change specification in openspec/changes/<change>/.",
    },
    {
      name: "role-routing",
      rule: "Consult the routing matrix at .specty/routing.md to adopt the proper role before acting.",
    },
    {
      name: "verification-gates",
      rule: "Always execute designated verification commands in .specty/config.yaml before concluding tasks.",
    },
  ];
}

export const codyAdapter: ToolAdapter = {
  id: "cody",
  name: "Sourcegraph Cody",

  async generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]> {
    const projectFullPath = path.join(ctx.repoRoot, CODY_PROJECT_PATH);
    const rulesFullPath = path.join(ctx.repoRoot, CODY_RULES_PATH);

    // 1. Process .cody/project.json
    let projectConfig: Record<string, unknown> = {
      name: path.basename(ctx.repoRoot),
      instructions: "AGENTS.md",
      rules: CODY_RULES_PATH,
    };

    if (fs.existsSync(projectFullPath)) {
      try {
        const existing = await fsPromises.readFile(projectFullPath, "utf8");
        const parsed = parseJsonc<Record<string, unknown>>(existing);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          projectConfig = parsed;
        }
      } catch {
        // Fall back to default project structure
      }
    }

    projectConfig.instructions = projectConfig.instructions ?? "AGENTS.md";
    projectConfig.rules = projectConfig.rules ?? CODY_RULES_PATH;

    // 2. Process .cody/rules.json
    const defaultRules = buildDefaultRules(ctx.language);
    let rulesConfig: CodyRulesConfig = {
      name: "specty-governance",
      description:
        ctx.language === "es"
          ? "Directivas soberanas de desarrollo asistido por IA gestionadas por specty"
          : "Specty AI assistant governance directives",
      rules: defaultRules,
    };

    if (fs.existsSync(rulesFullPath)) {
      try {
        const existingRules = await fsPromises.readFile(rulesFullPath, "utf8");
        const parsedRules = parseJsonc<CodyRulesConfig>(existingRules);
        if (parsedRules && typeof parsedRules === "object" && !Array.isArray(parsedRules)) {
          rulesConfig = parsedRules;
          if (Array.isArray(rulesConfig.rules)) {
            const defaultNames = new Set(defaultRules.map((r) => r.name));
            const customRules = rulesConfig.rules.filter((r) => !defaultNames.has(r.name));
            rulesConfig.rules = [...defaultRules, ...customRules];
          } else {
            rulesConfig.rules = defaultRules;
          }
        }
      } catch {
        // Fall back to default rules
      }
    }

    return [
      {
        relativePath: CODY_PROJECT_PATH,
        content: `${JSON.stringify(projectConfig, null, 2)}\n`,
        description: "Sourcegraph Cody project configuration pointing to AGENTS.md",
      },
      {
        relativePath: CODY_RULES_PATH,
        content: `${JSON.stringify(rulesConfig, null, 2)}\n`,
        description: "Sourcegraph Cody structured governance rules",
      },
    ];
  },

  getExpectedFilePaths(): string[] {
    return [CODY_PROJECT_PATH, CODY_RULES_PATH];
  },

  getMcpInstructions(language: SupportedLanguage): string {
    if (language === "es") {
      return "Sourcegraph Cody admite integracion de contexto via OpenCTX o MCP experimental. Para habilitar specty MCP, configure 'specty mcp' en sus proveedores OpenCTX o en cody.experimental.mcp.";
    }
    return "Sourcegraph Cody supports context integration via OpenCTX or experimental MCP. To enable specty MCP, configure 'specty mcp' in your OpenCTX providers or cody.experimental.mcp settings.";
  },
};
