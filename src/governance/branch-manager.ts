import { createDefaultConfig, loadConfig, type SpectyConfig } from "../core/config.js";
import {
  checkoutBranch,
  commitWorkingTree,
  deleteBranch,
  getCurrentBranch,
  isInsideGitRepo,
  listLocalBranches,
  mergeBranch,
} from "../core/git.js";
import { logger } from "../core/logger.js";
import { extractChangeIdFromBranch } from "./change-resolver.js";

export interface CloseBranchOptions {
  dryRun?: boolean;
}

export interface CloseBranchResult {
  success: boolean;
  closedBranch?: string;
  targetBranch?: string;
  merged?: boolean;
  deleted?: boolean;
  message: string;
  error?: string;
}

/**
 * Closes the Git branch associated with a specification change according
 * to the branching policy configured in the project onboarding (config.git.workflow).
 */
export async function closeFeatureBranch(
  repoRoot: string,
  changeId: string,
  options: CloseBranchOptions = {},
): Promise<CloseBranchResult> {
  const isGit = await isInsideGitRepo(repoRoot);
  if (!isGit) {
    return {
      success: true,
      message: "Not inside a Git repository; branch closure skipped.",
    };
  }

  let config: SpectyConfig;
  try {
    config = await loadConfig(repoRoot);
  } catch {
    config = createDefaultConfig();
  }

  const workflow = config.git?.workflow ?? "feature-branch";
  const localBranches = await listLocalBranches(repoRoot);
  const currentBranch = await getCurrentBranch(repoRoot);

  // 1. Determine target base integration branch according to onboarding policy
  let targetBranch = "main";
  if (workflow === "gitflow") {
    targetBranch = localBranches.includes("develop")
      ? "develop"
      : localBranches.includes("main")
        ? "main"
        : localBranches.includes("master")
          ? "master"
          : currentBranch || "develop";
  } else if (workflow === "centralized") {
    targetBranch = localBranches.includes("main")
      ? "main"
      : localBranches.includes("master")
        ? "master"
        : currentBranch || "main";
  } else {
    // feature-branch, trunk-based, forking
    targetBranch = localBranches.includes("main")
      ? "main"
      : localBranches.includes("master")
        ? "master"
        : localBranches[0] || "main";
  }

  // 2. Centralized workflow: no separate feature branch exists
  if (workflow === "centralized") {
    return {
      success: true,
      targetBranch,
      message: `Centralized workflow: commits reside directly on base branch '${targetBranch}'. No branch to close.`,
    };
  }

  // 3. Identify branch associated with changeId
  const candidateNames = [
    currentBranch,
    `feature/${changeId}`,
    `hotfix/${changeId}`,
    `fix/${changeId}`,
    `bugfix/${changeId}`,
    `feat/${changeId}`,
    `change/${changeId}`,
    changeId,
  ].filter((b): b is string => Boolean(b));

  let branchToClose: string | null = null;
  for (const cand of candidateNames) {
    if (localBranches.includes(cand)) {
      const extracted = extractChangeIdFromBranch(cand);
      if (extracted === changeId || cand === `feature/${changeId}` || cand === changeId) {
        branchToClose = cand;
        break;
      }
    }
  }

  // 4. If no feature branch exists or already on base branch
  if (!branchToClose || branchToClose === targetBranch) {
    return {
      success: true,
      targetBranch,
      message: `Already on base branch '${targetBranch}', no separate feature branch found to close for '${changeId}'.`,
    };
  }

  // 5. Dry-run mode
  if (options.dryRun) {
    return {
      success: true,
      closedBranch: branchToClose,
      targetBranch,
      merged: true,
      deleted: true,
      message: `[dry-run] Would merge '${branchToClose}' into '${targetBranch}' and delete '${branchToClose}'.`,
    };
  }

  // 6. Commit any uncommitted workspace changes (e.g. archive file moves)
  await commitWorkingTree(repoRoot, `chore(specs): archive and complete change ${changeId}`);

  // 7. Checkout target base branch
  const checkoutRes = await checkoutBranch(repoRoot, targetBranch);
  if (!checkoutRes.success) {
    const error = `Failed to checkout target branch '${targetBranch}': ${checkoutRes.error}`;
    logger.error(error);
    return {
      success: false,
      closedBranch: branchToClose,
      targetBranch,
      error,
      message: `Could not switch to base branch '${targetBranch}'.`,
    };
  }

  // 8. Merge feature branch into base branch
  const mergeRes = await mergeBranch(repoRoot, branchToClose, {
    message: `Merge branch '${branchToClose}' into '${targetBranch}' (${changeId})`,
  });

  if (!mergeRes.success) {
    // Return to feature branch to avoid leaving repository in intermediate state
    await checkoutBranch(repoRoot, branchToClose);
    const error = `Merge failed when closing '${branchToClose}' into '${targetBranch}': ${mergeRes.error}`;
    logger.error(error);
    return {
      success: false,
      closedBranch: branchToClose,
      targetBranch,
      error,
      message: `Failed to merge '${branchToClose}' into '${targetBranch}'.`,
    };
  }

  // 9. Delete the merged feature branch
  let deleteRes = await deleteBranch(repoRoot, branchToClose, false);
  if (!deleteRes.success) {
    deleteRes = await deleteBranch(repoRoot, branchToClose, true);
  }

  const successMsg = `Branch '${branchToClose}' merged into '${targetBranch}' and closed according to '${workflow}' policy.`;
  logger.success(`✓ ${successMsg}`);

  return {
    success: true,
    closedBranch: branchToClose,
    targetBranch,
    merged: true,
    deleted: deleteRes.success,
    message: successMsg,
  };
}
