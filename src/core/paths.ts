import path from "node:path";

/**
 * Normalizes a path to forward slashes and resolves it relative to the root directory.
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * Ensures that a target path is safely contained within the repository root.
 * Throws an error if the path traverses outside the repository.
 */
export function assertSafeRepoPath(repoRoot: string, targetPath: string): string {
  const resolvedRoot = path.resolve(repoRoot);
  const resolvedTarget = path.resolve(resolvedRoot, targetPath);

  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `Security error: Path "${targetPath}" is outside repository root "${repoRoot}"`,
    );
  }

  return resolvedTarget;
}

/**
 * Determines whether a file path points to a sensitive secret or environment file.
 */
export function isSensitivePath(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  if (base === ".env" || base.startsWith(".env.")) {
    return true;
  }
  if (
    base.endsWith(".pem") ||
    base.endsWith(".key") ||
    base === "id_rsa" ||
    base === "id_ed25519"
  ) {
    return true;
  }
  return false;
}
