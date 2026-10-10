import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { checkApprovalGate } from "../../governance/check-approval.js";
import { getGitHubContext, upsertPrComment } from "../../governance/github-client.js";
import { generatePrGateReport } from "../../governance/pr-reporter.js";
import type { TraceabilityMatrix } from "../../governance/traceability.js";

export interface GateCliOptions {
  cwd?: string;
  base?: string;
  head?: string;
  comment?: boolean;
  token?: string;
  pr?: string | number;
  outputComment?: string;
  strict?: boolean;
  json?: boolean;
  lang?: "en" | "es";
}

export async function executeGate(options: GateCliOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);
  const lang = options.lang || (config.language === "es" ? "es" : "en");

  let result = await checkApprovalGate(repoRoot, {
    baseRef: options.base,
    headRef: options.head,
  });

  const ghCtx = getGitHubContext();
  const repo = ghCtx.repo;
  const token = options.token || ghCtx.token;
  const prNumber = options.pr ? Number(options.pr) : ghCtx.prNumber;

  // Auto-verify via GitHub PR Review if unapproved and approval_method supports pr_review
  if (
    !result.passed &&
    !result.bypassed &&
    repo &&
    token &&
    prNumber &&
    (config.governance.approval_method === "pr_review" ||
      config.governance.approval_method === "hybrid")
  ) {
    const candidateId = result.changeDetails?.id || result.allChanges?.[0]?.id;
    if (candidateId) {
      const { verifyPrReviewApproval } = await import("../../governance/approvals.js");
      const syncRes = await verifyPrReviewApproval(repoRoot, candidateId, {
        repo,
        token,
        prNumber,
        apiUrl: ghCtx.apiUrl,
        requiredReviewers: config.governance.required_reviewers,
        requireCodeowner: config.governance.require_codeowner_review,
      });

      if (syncRes.approved) {
        logger.success(`✓ Synchronized formal approval from PR #${prNumber} review.`);
        result = await checkApprovalGate(repoRoot, {
          baseRef: options.base,
          headRef: options.head,
        });
      }
    }
  }

  let traceabilityMatrix: TraceabilityMatrix | undefined;
  const targetChangeId = result.changeDetails?.id || result.activeApprovedChange;
  if (targetChangeId) {
    try {
      const { buildTraceabilityMatrix } = await import("../../governance/traceability.js");
      traceabilityMatrix = await buildTraceabilityMatrix(repoRoot, targetChangeId, {
        baseRef: options.base,
        headRef: options.head,
      });

      // Write audit artifact file
      const auditDir = path.join(repoRoot, ".specty/audit");
      await fs.mkdir(auditDir, { recursive: true });
      await fs.writeFile(
        path.join(auditDir, `traceability-${targetChangeId}.json`),
        JSON.stringify(traceabilityMatrix, null, 2),
        "utf8",
      );
    } catch {
      // Non-fatal traceability generation error
    }
  }

  const reportMarkdown = generatePrGateReport(result, {
    lang,
    prNumber: options.pr ? Number(options.pr) : undefined,
    traceabilityMatrix,
  });

  if (options.outputComment) {
    const targetFile = path.resolve(repoRoot, options.outputComment);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, reportMarkdown, "utf8");
    logger.info(`✓ PR gate markdown report written to ${options.outputComment}`);
  }

  // Determine if PR comment posting should occur
  const shouldComment =
    options.comment !== false && (Boolean(options.comment) || Boolean(ghCtx.prNumber));

  if (shouldComment) {
    const token = options.token || ghCtx.token;
    const repo = ghCtx.repo;
    const prNumber = options.pr ? Number(options.pr) : ghCtx.prNumber;

    if (token && repo && prNumber) {
      try {
        const commentRes = await upsertPrComment({
          repo,
          prNumber,
          body: reportMarkdown,
          token,
          apiUrl: ghCtx.apiUrl,
        });
        logger.success(`✓ GitHub PR #${prNumber} comment ${commentRes.action}: ${commentRes.url}`);
      } catch (err: unknown) {
        logger.warn(
          `⚠ Could not post PR comment: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else if (options.comment === true) {
      logger.warn("⚠ Skipping PR comment: Missing GITHUB_TOKEN, GITHUB_REPOSITORY, or PR number.");
    }
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          passed: result.passed,
          bypassed: result.bypassed,
          activeApprovedChange: result.activeApprovedChange,
          modifiedSourceFiles: result.modifiedSourceFiles,
          changeDetails: result.changeDetails,
          bypassDetails: result.bypassDetails,
          report: reportMarkdown,
        },
        null,
        2,
      ),
    );
    return result.passed;
  }

  if (result.bypassed) {
    logger.warn(`⚠ Specty Gate: ${result.reason}`);
    return true;
  }

  if (result.passed) {
    logger.success(`✓ Specty Gate: ${result.reason}`);
    return true;
  }

  logger.error(`✖ Specty Gate Failed:\n${result.reason}`);
  return false;
}
