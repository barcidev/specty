export type SupportedLanguageId =
  | "typescript"
  | "javascript"
  | "dart"
  | "csharp"
  | "java"
  | "kotlin"
  | "python"
  | "go"
  | "ruby"
  | "php"
  | "rust"
  | "swift"
  | "c"
  | "cpp"
  | "elixir";

export interface StackDetection {
  language: SupportedLanguageId;
  frameworks: string[];
  confidence: number; // 0.0 to 1.0
  evidence: string[]; // file names or indicators detected
  hasCustomTemplates: boolean; // true for Hito 1 stacks (TS/JS, Dart, .NET)
}

export interface VerificationCommands {
  lint?: string;
  test?: string;
  build?: string;
  format?: string;
  validate?: string;
  [key: string]: string | undefined;
}

export interface DetectedScope {
  path: string; // relative path within repo, e.g. "." or "apps/web"
  stack: StackDetection;
  verify: VerificationCommands;
}

export type MonorepoKind =
  | "npm"
  | "pnpm"
  | "yarn"
  | "nx"
  | "turbo"
  | "lerna"
  | "melos"
  | "dotnet-sln"
  | "cargo";

export interface MonorepoDetection {
  isMonorepo: boolean;
  kind?: MonorepoKind;
  packageGlobs: string[];
  packagePaths: string[];
}

export interface RepositoryDetectionResult {
  layout: "single" | "monorepo" | "multi-repo";
  monorepo?: MonorepoDetection;
  scopes: DetectedScope[];
  primaryLanguage?: SupportedLanguageId;
}
