import path from "node:path";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { verifyPrReviewApproval } from "../../governance/approvals.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import { getGitHubContext } from "../../governance/github-client.js";

export interface SyncApprovalCliOptions {
  cwd?: string;
  pr?: string | number;
  token?: string;
  repo?: string;
}

export async function executeSyncApproval(
  changeArg?: string,
  options: SyncApprovalCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);

  const ghCtx = getGitHubContext();
  const repo = options.repo || ghCtx.repo;
  const token = options.token || ghCtx.token;
  const prNumber = options.pr ? Number(options.pr) : ghCtx.prNumber;

  if (!repo || !token || !prNumber) {
    logger.error("Missing required GitHub Pull Request context (repo, token, or PR number).");
    logger.info(
      "Specify --pr <number>, --repo <owner/repo>, or set GITHUB_TOKEN environment variable.",
    );
    return false;
  }

  const resolution = await resolveTargetChange(repoRoot, {
    changeId: changeArg,
  });

  const changeId = resolution.resolvedId ?? changeArg;
  if (!changeId) {
    logger.error("No active specification change specified or resolved from current branch.");
    if (resolution.reason) {
      logger.info(resolution.reason);
    }
    return false;
  }

  logger.info(`Fetching PR #${prNumber} reviews for change "${changeId}"...`);

  const result = await verifyPrReviewApproval(repoRoot, changeId, {
    repo,
    prNumber,
    token,
    apiUrl: ghCtx.apiUrl,
    requiredReviewers: config.governance.required_reviewers,
    requireCodeowner: config.governance.require_codeowner_review,
  });

  if (!result.approved) {
    logger.error(`PR Review verification failed: ${result.reason}`);
    return false;
  }

  logger.success(`✓ ${result.reason}`);
  logger.info(`Approved Hash: ${result.record?.contentHash.slice(0, 12)}...`);
  return true;
}
