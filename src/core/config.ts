import fs from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";
import { z } from "zod";
import { assertSafeRepoPath } from "./paths.js";

export const CONFIG_RELATIVE_PATH = ".specty/config.yaml";

export const SUPPORTED_TOOLS = [
  "antigravity",
  "claude",
  "cursor",
  "github-copilot",
  "windsurf",
  "codex",
  "gemini",
  "cline",
  "roocode",
  "continue",
  "junie",
  "amazon-q",
  "aider",
  "opencode",
  "zed",
  "cody",
  "chatgpt",
] as const;

export type SupportedTool = (typeof SUPPORTED_TOOLS)[number];

export const ScopeStackSchema = z.object({
  language: z.string(),
  frameworks: z.array(z.string()).default([]),
});

export const ScopeVerifySchema = z.record(z.string(), z.string().optional());

export const ScopeSchema = z.object({
  path: z.string().default("."),
  stack: ScopeStackSchema,
  verify: ScopeVerifySchema.default({}),
});

export const PROTECTED_GOVERNANCE_PATHS = [
  "specty.yaml",
  ".specty/config.yaml",
  ".specty/audit/**",
  ".husky/**",
  ".githooks/**",
  ".github/workflows/**",
];

export const GovernanceSchema = z.object({
  hooks: z.boolean().default(true),
  ci: z.enum(["github", "gitlab", "azure", "none"]).default("github"),
  source_paths: z.array(z.string()).default(["src/**"]),
  exempt_paths: z.array(z.string()).default(["**/*.md", "openspec/**", "docs/**"]),
  bypass: z
    .object({
      env: z.string().default("SPECTY_BYPASS"),
      trailer: z.string().default("Specty-Bypass"),
    })
    .default({
      env: "SPECTY_BYPASS",
      trailer: "Specty-Bypass",
    }),
  quality_gates: z
    .object({
      lint: z.boolean().default(true),
      test: z.boolean().default(true),
      static: z.boolean().default(true),
      coverage_min: z.number().default(0),
    })
    .default({
      lint: true,
      test: true,
      static: true,
      coverage_min: 0,
    }),
});

export const McpGraphProviderSchema = z
  .enum(["codebase-memory", "builtin"])
  .default("codebase-memory");

export type McpGraphProvider = z.infer<typeof McpGraphProviderSchema>;

export const CodebaseMemoryConfigSchema = z.object({
  command: z.string().default("codebase-memory-mcp"),
  args: z.array(z.string()).default([]),
  auto_index: z.boolean().default(true),
});

export type CodebaseMemoryConfig = z.infer<typeof CodebaseMemoryConfigSchema>;

export const McpGraphSchema = z.object({
  max_file_kb: z.number().default(512),
  exclude: z.array(z.string()).default([]),
});

export const McpConfigSchema = z.object({
  enabled: z.boolean().default(true),
  graph_provider: McpGraphProviderSchema.default("codebase-memory"),
  codebase_memory: CodebaseMemoryConfigSchema.default(() => CodebaseMemoryConfigSchema.parse({})),
  graph: McpGraphSchema.default({
    max_file_kb: 512,
    exclude: [],
  }),
});

export const SpectyConfigSchema = z.object({
  version: z.number().default(1),
  language: z.enum(["en", "es"]).default("es"),
  spec_engine: z.enum(["openspec", "builtin"]).default("openspec"),
  project: z.object({
    kind: z.enum(["new", "existing"]).default("existing"),
    layout: z.enum(["single", "monorepo", "multi-repo"]).default("single"),
    architecture: z.string().optional(),
  }),
  scopes: z.array(ScopeSchema).default([]),
  tools: z.array(z.string()).default([...SUPPORTED_TOOLS]),
  governance: GovernanceSchema.default(() => GovernanceSchema.parse({})),
  mcp: McpConfigSchema.default(() => McpConfigSchema.parse({})),
  metrics: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
});

export type SpectyConfig = z.infer<typeof SpectyConfigSchema>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

export function createDefaultConfig(options?: DeepPartial<SpectyConfig>): SpectyConfig {
  return SpectyConfigSchema.parse({
    version: 1,
    language: options?.language ?? "es",
    spec_engine: options?.spec_engine ?? "openspec",
    project: {
      kind: options?.project?.kind ?? "existing",
      layout: options?.project?.layout ?? "single",
      architecture: options?.project?.architecture,
    },
    scopes: options?.scopes ?? [
      {
        path: ".",
        stack: { language: "typescript", frameworks: [] },
        verify: {},
      },
    ],
    tools: options?.tools ?? [...SUPPORTED_TOOLS],
    governance: options?.governance ?? {},
    mcp: options?.mcp ?? {},
    metrics: options?.metrics ?? { enabled: true },
  });
}

export async function loadConfig(repoRoot: string): Promise<SpectyConfig> {
  const configPath = path.join(repoRoot, CONFIG_RELATIVE_PATH);
  const rawYaml = await fs.readFile(configPath, "utf8");
  const parsed = yaml.parse(rawYaml);
  return SpectyConfigSchema.parse(parsed);
}

export async function saveConfig(repoRoot: string, config: SpectyConfig): Promise<void> {
  const configPath = assertSafeRepoPath(repoRoot, CONFIG_RELATIVE_PATH);
  await fs.mkdir(path.dirname(configPath), { recursive: true });

  const doc = new yaml.Document(config);
  doc.commentBefore =
    " specty configuration file\n Documentation: https://github.com/barcidev/specty";

  await fs.writeFile(configPath, String(doc), "utf8");
}
