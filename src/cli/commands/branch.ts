import path from "node:path";
import { checkoutBranch, getCurrentBranch } from "../../core/git.js";
import { logger } from "../../core/logger.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";

export interface BranchCliOptions {
  cwd?: string;
  prefix?: string;
}

export async function executeBranch(
  changeArg?: string,
  options: BranchCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const prefix = options.prefix ?? "feature/";

  const resolution = await resolveTargetChange(repoRoot, {
    changeId: changeArg,
  });

  const changeId = resolution.resolvedId ?? changeArg;
  if (!changeId) {
    const current = (await getCurrentBranch(repoRoot)) || "unknown";
    logger.info(`Current Git branch: ${current}`);
    if (resolution.activeChanges.length > 0) {
      logger.info(
        `Active specification changes in repo: ${resolution.activeChanges.map((c) => c.id).join(", ")}`,
      );
      logger.info(`Run 'specty branch <change-id>' to checkout a change-linked branch.`);
    } else {
      logger.warn("No active specification changes found. Plan a change with 'specty'.");
    }
    return false;
  }

  const branchName = changeId.startsWith(prefix) ? changeId : `${prefix}${changeId}`;
  const currentBranch = await getCurrentBranch(repoRoot);

  if (currentBranch === branchName) {
    logger.success(`Already on branch "${branchName}" linked to change "${changeId}".`);
    return true;
  }

  const result = await checkoutBranch(repoRoot, branchName, true);
  if (!result.success) {
    logger.error(
      `Failed to checkout branch "${branchName}": ${result.error ?? "Git checkout failed."}`,
    );
    return false;
  }

  if (result.created) {
    logger.success(`✓ Created and switched to branch "${branchName}" for change "${changeId}".`);
  } else {
    logger.success(`✓ Switched to existing branch "${branchName}" for change "${changeId}".`);
  }

  return true;
}
