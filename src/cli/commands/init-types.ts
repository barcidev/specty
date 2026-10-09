import type { SpectyConfig } from "../../core/config.js";
import type { SupportedLanguage } from "../../core/i18n.js";
import type { SupportedLanguageId } from "../../detect/types.js";

export interface InitCommandOptions {
  yes?: boolean;
  dryRun?: boolean;
  lang?: string;
  tool?: string | string[];
  stack?: string;
  specEngine?: "openspec" | "builtin";
  hooks?: boolean;
  ci?: boolean;
  mcp?: boolean;
  verbose?: boolean;
  cwd?: string;
}

export interface InitFlowResult {
  config: SpectyConfig;
  applied: boolean;
  canceled: boolean;
  dryRun: boolean;
  language: SupportedLanguage;
  inferredStack?: SupportedLanguageId;
}
