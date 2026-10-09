import type { SpectyConfig, SupportedTool } from "../core/config.js";
import type { SupportedLanguage } from "../core/i18n.js";
import type { GeneratedFile } from "../generate/types.js";

export interface AdapterContext {
  repoRoot: string;
  config: SpectyConfig;
  language: SupportedLanguage;
  enableMcp: boolean;
  dryRun?: boolean;
}

export interface ToolAdapter {
  readonly id: SupportedTool;
  readonly name: string;
  generateFiles(ctx: AdapterContext): Promise<GeneratedFile[]>;
  getExpectedFilePaths(ctx: AdapterContext): string[];
  getMcpInstructions?(language: SupportedLanguage): string | null;
}
