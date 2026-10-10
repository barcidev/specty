import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { checkApprovalGate } from "../../governance/check-approval.js";
import { getGitHubContext, upsertPrComment } from "../../governance/github-client.js";
import { generatePrGateReport } from "../../governance/pr-reporter.js";

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

  const result = await checkApprovalGate(repoRoot, {
    baseRef: options.base,
    headRef: options.head,
  });

  const reportMarkdown = generatePrGateReport(result, {
    lang,
    prNumber: options.pr ? Number(options.pr) : undefined,
  });

  if (options.outputComment) {
    const targetFile = path.resolve(repoRoot, options.outputComment);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, reportMarkdown, "utf8");
    logger.info(`✓ PR gate markdown report written to ${options.outputComment}`);
  }

  // Determine if PR comment posting should occur
  const ghCtx = getGitHubContext();
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
