import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../../core/logger.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import { buildTraceabilityMatrix } from "../../governance/traceability.js";

export interface TraceCliOptions {
  cwd?: string;
  base?: string;
  head?: string;
  json?: boolean;
  output?: string;
}

export async function executeTrace(
  changeArg?: string,
  options: TraceCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

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

  const matrix = await buildTraceabilityMatrix(repoRoot, changeId, {
    baseRef: options.base,
    headRef: options.head,
  });

  if (options.output) {
    const targetPath = path.resolve(repoRoot, options.output);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(matrix, null, 2), "utf8");
    logger.success(`✓ Traceability matrix saved to ${options.output}`);
  }

  if (options.json) {
    console.log(JSON.stringify(matrix, null, 2));
    return true;
  }

  logger.info(`\n🔗 Specty Traceability Matrix: ${matrix.changeId} (${matrix.title})`);
  logger.info(`==================================================================`);
  logger.info(
    `Status: ${matrix.status.toUpperCase()} | Overall Compliance: ${matrix.overallCompliance}%\n`,
  );

  for (const req of matrix.requirements) {
    logger.info(`📌 ${req.id}: ${req.title}`);
    if (req.tasks.length === 0) {
      logger.info(`   (No direct tasks mapped)`);
      continue;
    }

    for (const t of req.tasks) {
      const taskDone = t.completed ? "✓" : "○";
      const verifyBadge = t.verification
        ? t.verification.success
          ? "[VERIFY: PASS]"
          : "[VERIFY: FAIL]"
        : "[VERIFY: NONE]";
      const commitCount = t.commits.length;
      const roleStr = t.agentRole ? `@${t.agentRole}` : "@dev";

      logger.info(
        `   [${taskDone}] Task ${t.id} ${roleStr} ${verifyBadge} (${commitCount} commits) - ${t.description}`,
      );

      if (t.commits.length > 0) {
        for (const c of t.commits) {
          logger.info(`       ↳ commit ${c.shortSha} "${c.message}" by ${c.author}`);
        }
      }
    }
    logger.info("");
  }

  if (matrix.orphanCommits.length > 0) {
    logger.warn(`⚠ Orphan Commits Detected (${matrix.orphanCommits.length}):`);
    for (const oc of matrix.orphanCommits) {
      logger.warn(`   ↳ ${oc.shortSha} "${oc.message}" (touches unmapped source files)`);
    }
    logger.info("");
  }

  logger.info(
    `Summary: ${matrix.stats.completedTasks}/${matrix.stats.totalTasks} tasks completed | ${matrix.stats.verifiedTasks} verified | ${matrix.stats.linkedCommitsCount} linked commits`,
  );
  return true;
}
