import fs from "node:fs/promises";
import path from "node:path";
import createIgnore, { type Ignore } from "ignore";

export const DEFAULT_EXCLUSION_GLOBS = [
  "node_modules/**",
  "vendor/**",
  "bin/**",
  "obj/**",
  "dist/**",
  "build/**",
  "target/**",
  "_build/**",
  ".build/**",
  ".expo/**",
  ".svelte-kit/**",
  ".astro/**",
  ".git/**",
  "*.g.dart",
  "*.freezed.dart",
  "**/*.g.dart",
  "**/*.freezed.dart",
  ".env",
  ".env.*",
  "**/.env",
  "**/.env.*",
];

export async function createExclusionFilter(repoRoot: string): Promise<Ignore> {
  const ig = createIgnore();
  ig.add(DEFAULT_EXCLUSION_GLOBS);

  const gitignorePath = path.join(repoRoot, ".gitignore");
  try {
    const gitignoreContent = await fs.readFile(gitignorePath, "utf8");
    ig.add(gitignoreContent);
  } catch {
    // .gitignore optional
  }

  return ig;
}

export function isExcludedPath(relativePath: string, filter: Ignore): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return filter.ignores(normalized);
}
