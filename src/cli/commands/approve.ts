import path from "node:path";
import * as p from "@clack/prompts";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { getSpecEngine } from "../../engines/factory.js";
import { approveChange, checkApprovalStatus } from "../../governance/approvals.js";
import { validateChangeSpecification } from "../../governance/spec-validator.js";
import { recordMetricEvent } from "../../metrics/index.js";

export interface ApproveCommandOptions {
  cwd?: string;
  yes?: boolean;
  dryRun?: boolean;
  user?: string;
  force?: boolean;
  strict?: boolean;
}

export async function executeApprove(
  changeArg?: string,
  options: ApproveCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);
  const engine = getSpecEngine(config.spec_engine);

  let targetChangeId = changeArg?.trim();

  if (!targetChangeId) {
    const changes = await engine.listChanges(repoRoot);
    if (changes.length === 0) {
      logger.warn("No active changes found in openspec/changes/ to approve.");
      return false;
    }

    if (changes.length === 1) {
      targetChangeId = changes[0]?.id;
    } else {
      if (options.yes) {
        logger.error("Multiple active changes exist. Please specify which change to approve.");
        return false;
      }

      const selected = await p.select({
        message: "Select change to approve:",
        options: changes.map((c) => ({
          value: c.id,
          label: `${c.id} - ${c.title ?? "No title"} (${c.status})`,
        })),
      });

      if (p.isCancel(selected)) {
        p.cancel("Approval canceled.");
        return false;
      }

      targetChangeId = selected as string;
    }
  }

  if (!targetChangeId) {
    logger.error("No change specified.");
    return false;
  }

  const change = await engine.getChange(repoRoot, targetChangeId);
  if (!change) {
    logger.error(`Change "${targetChangeId}" not found in openspec/changes/`);
    return false;
  }

  // 1. Validate specification semantics before approving
  const validation = await validateChangeSpecification(change.path, {
    strict: options.strict,
  });

  if (validation.issues.length > 0) {
    logger.info(`\nSpecification Validation Diagnostics (${change.id}):`);
    for (const issue of validation.issues) {
      const relFile = path.relative(repoRoot, issue.file);
      const loc = issue.line ? `:${issue.line}` : "";
      const ruleTag = issue.rule ? ` [${issue.rule}]` : "";
      if (issue.severity === "error") {
        logger.error(`  ✖ ${relFile}${loc}${ruleTag}: ${issue.message}`);
      } else {
        logger.warn(`  ⚠ ${relFile}${loc}${ruleTag}: ${issue.message}`);
      }
    }
  }

  if (!validation.valid) {
    const issuesDesc =
      validation.errorsCount && validation.errorsCount > 0
        ? `${validation.errorsCount} semantic specification error(s)`
        : `${validation.warningsCount ?? 1} semantic specification warning(s) in strict mode`;

    if (options.force) {
      logger.warn(`\nBypassing ${issuesDesc} due to --force flag.`);
    } else {
      logger.error(
        `\nCannot approve change "${targetChangeId}": found ${issuesDesc}.\nFix the markdown structure or pass --force to bypass.`,
      );
      return false;
    }
  }

  const status = await checkApprovalStatus(repoRoot, targetChangeId);
  if (status.code === "approved") {
    logger.warn(
      `Change "${targetChangeId}" is already approved (Hash: ${status.approvedHash?.slice(0, 8)}).`,
    );
    return true;
  }

  logger.info(`\nChange Proposal: ${change.id}`);
  logger.info(`Title: ${change.title ?? "No title"}`);
  logger.info(`Tasks: ${change.tasks.completed}/${change.tasks.total} completed`);
  if (status.code === "reapproval_required") {
    logger.warn("\n⚠ Specification was modified after prior approval. Re-approval required!");
  }

  if (!options.yes) {
    const confirmed = await p.confirm({
      message: `Approve change "${targetChangeId}" and compute content hash?`,
      initialValue: true,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Approval rejected.");
      return false;
    }
  }

  const record = await approveChange(repoRoot, targetChangeId, {
    approvedBy: options.user,
    dryRun: options.dryRun,
  });

  await recordMetricEvent(repoRoot, {
    type: "approval_granted",
    changeId: targetChangeId,
    hash: record.contentHash,
    approver: record.approvedBy,
  });

  logger.success(
    `Change "${targetChangeId}" APPROVED successfully!\nContent Hash: ${record.contentHash}\nApproved by: ${record.approvedBy}`,
  );

  return true;
}
