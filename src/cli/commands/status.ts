import path from "node:path";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { getSpecEngine } from "../../engines/factory.js";
import type { ChangeMetadata } from "../../engines/types.js";
import { checkApprovalStatus } from "../../governance/approvals.js";
import { determineNextAction } from "../../governance/next-action.js";

export interface StatusCommandOptions {
  cwd?: string;
  json?: boolean;
  card?: boolean;
}

export interface ChangeStatusDetail extends ChangeMetadata {
  approvalCode: string;
}

export interface ProjectStatusSummary {
  language: string;
  specEngine: string;
  scopesCount: number;
  tools: string[];
  changes: ChangeStatusDetail[];
  reapprovalNeededCount: number;
  statusCard?: string;
}

export async function executeStatus(
  options: StatusCommandOptions = {},
): Promise<ProjectStatusSummary> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  if (options.card) {
    const nextReport = await determineNextAction(repoRoot);
    console.log(nextReport.statusCard);
    return {
      language: "",
      specEngine: "",
      scopesCount: 0,
      tools: [],
      changes: [],
      reapprovalNeededCount: 0,
      statusCard: nextReport.statusCard,
    };
  }

  const config = await loadConfig(repoRoot);
  const engine = getSpecEngine(config.spec_engine);

  const rawChanges = await engine.listChanges(repoRoot);
  const changes: ChangeStatusDetail[] = [];
  let reapprovalNeededCount = 0;

  for (const c of rawChanges) {
    const approval = await checkApprovalStatus(repoRoot, c.id);
    if (approval.code === "reapproval_required") {
      reapprovalNeededCount++;
    }
    changes.push({
      ...c,
      approvalCode: approval.code,
    });
  }

  const summary: ProjectStatusSummary = {
    language: config.language,
    specEngine: config.spec_engine,
    scopesCount: config.scopes.length,
    tools: config.tools,
    changes,
    reapprovalNeededCount,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  logger.info("=== Specty Project Status ===");
  logger.info(
    `Language: ${summary.language} | Engine: ${summary.specEngine} | Scopes: ${summary.scopesCount}`,
  );
  logger.info(`Enabled Tools (${summary.tools.length}): ${summary.tools.join(", ") || "none"}`);

  if (summary.changes.length === 0) {
    logger.info("\nActive Changes: None (clean working tree)");
  } else {
    logger.info(`\nActive Changes (${summary.changes.length}):`);
    for (const c of summary.changes) {
      let badge = `[${c.status}]`;
      if (c.approvalCode === "reapproval_required") {
        badge = "[RE-APPROVAL REQUIRED]";
      } else if (c.approvalCode === "approved") {
        badge = "[APPROVED]";
      } else if (c.approvalCode === "pending") {
        badge = "[DRAFT/PENDING]";
      }

      const tasksInfo = `tasks: ${c.tasks.completed}/${c.tasks.total}`;
      logger.info(`  • ${c.id.padEnd(20)} ${badge.padEnd(24)} ${tasksInfo} - ${c.title ?? ""}`);
    }
  }

  if (reapprovalNeededCount > 0) {
    logger.warn(
      `\n⚠ ${reapprovalNeededCount} change(s) modified after approval. Run "specty approve <change>" to re-approve.`,
    );
  }

  return summary;
}
