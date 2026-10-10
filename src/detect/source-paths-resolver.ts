import type { RepositoryDetectionResult, SupportedLanguageId } from "./types.js";

const LANGUAGE_SOURCE_PATHS: Record<SupportedLanguageId, string[]> = {
  dart: ["lib/**", "bin/**", "test/**"],
  ruby: ["app/**", "lib/**", "config/**", "spec/**"],
  go: ["**/*.go", "cmd/**", "pkg/**", "internal/**"],
  csharp: ["**/*.cs", "src/**", "tests/**"],
  python: ["**/*.py", "src/**", "app/**"],
  java: ["src/main/**", "src/test/**"],
  kotlin: ["src/main/**", "src/test/**"],
  php: ["src/**", "app/**", "tests/**"],
  rust: ["src/**", "tests/**", "benches/**"],
  swift: ["Sources/**", "Tests/**"],
  c: ["src/**", "include/**", "lib/**"],
  cpp: ["src/**", "include/**", "lib/**"],
  elixir: ["lib/**", "test/**"],
  typescript: ["src/**"],
  javascript: ["src/**"],
};

/**
 * Resolves optimal governed source paths dynamically based on repository stack detection.
 * Prevents un-governed source code in non-TypeScript/JavaScript stacks (e.g. Flutter, Go, Rails, .NET).
 */
export function resolveDefaultSourcePaths(detection?: RepositoryDetectionResult | null): string[] {
  if (!detection) {
    return ["src/**"];
  }

  // Monorepo: include all package / scope directories
  if (detection.layout === "monorepo" && detection.scopes.length > 0) {
    const paths = new Set<string>();
    for (const scope of detection.scopes) {
      const relPath = scope.path.replace(/\\/g, "/").replace(/^\.\//, "");
      if (!relPath || relPath === ".") {
        const langPaths = LANGUAGE_SOURCE_PATHS[scope.stack.language] ?? ["src/**"];
        for (const p of langPaths) {
          paths.add(p);
        }
      } else {
        paths.add(`${relPath}/**`);
      }
    }
    return Array.from(paths);
  }

  // Single repo: resolve based on detected primary language or first scope language
  const primaryLang = detection.primaryLanguage ?? detection.scopes[0]?.stack.language;
  if (primaryLang && primaryLang in LANGUAGE_SOURCE_PATHS) {
    return [...LANGUAGE_SOURCE_PATHS[primaryLang]];
  }

  return ["src/**"];
}
