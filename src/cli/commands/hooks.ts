import path from "node:path";
import { logger } from "../../core/logger.js";
import { installGitHooks, uninstallGitHooks } from "../../governance/git-hooks.js";

export interface HooksCliOptions {
  cwd?: string;
}

export async function executeHooksInstall(options: HooksCliOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const success = await installGitHooks(repoRoot);

  if (success) {
    logger.success("Installed Specty pre-commit hook in .git/hooks/pre-commit");
    return true;
  }

  logger.error("Failed to install Git hook. Ensure this is a valid Git repository.");
  return false;
}

export async function executeHooksUninstall(options: HooksCliOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const success = await uninstallGitHooks(repoRoot);

  if (success) {
    logger.success("Removed Specty pre-commit hook from .git/hooks/");
    return true;
  }

  logger.warn("Specty pre-commit hook was not found or already removed.");
  return false;
}
