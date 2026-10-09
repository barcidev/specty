import type { SpectyConfig } from "../core/config.js";
import type { SupportedLanguage } from "../core/i18n.js";
import type { SupportedLanguageId } from "../detect/types.js";

export interface GenerateContext {
  repoRoot: string;
  config: SpectyConfig;
  language: SupportedLanguage;
  projectName?: string;
  primaryLanguage?: SupportedLanguageId;
  frameworks?: string[];
  architecture?: string;
  dryRun?: boolean;
}

export interface GeneratedFile {
  relativePath: string;
  content: string;
  description: string;
}

export interface GenerationResult {
  files: GeneratedFile[];
  writtenCount: number;
  skippedCount: number;
}
