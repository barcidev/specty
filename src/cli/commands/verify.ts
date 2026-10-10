import path from "node:path";
import { logger } from "../../core/logger.js";
import { executeVerification, type VerificationOptions } from "../../governance/verifier.js";

export interface VerifyCliOptions {
  cwd?: string;
  scope?: string;
  type?: string;
  taskOnly?: boolean;
  stackOnly?: boolean;
  strict?: boolean;
  json?: boolean;
}

export async function executeVerify(
  changeArg?: string,
  options: VerifyCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  const verifyOpts: VerificationOptions = {
    changeId: changeArg,
    scope: options.scope,
    commandType: options.type,
    tasksOnly: options.taskOnly,
    stackOnly: options.stackOnly,
    strict: options.strict,
  };

  const report = await executeVerification(repoRoot, verifyOpts);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report.passed;
  }

  logger.info(
    `🔍 Running Specty verification${report.changeId ? ` for change: ${report.changeId}` : ""}...`,
  );
  if (report.commitSha) {
    logger.info(`   HEAD Commit: ${report.commitSha.slice(0, 8)}`);
  }

  // Display stack command executions
  if (report.stackResults.length > 0) {
    logger.info("\n📦 Stack Verifications:");
    for (const res of report.stackResults) {
      const statusIcon = res.passed ? "✓" : "✗";
      const duration = `${(res.durationMs / 1000).toFixed(2)}s`;
      logger.info(
        `   ${statusIcon} [${res.scope}] ${res.commandType} (${res.command}) [${duration}]`,
      );
      if (!res.passed && res.stderr) {
        logger.error(`      Error: ${res.stderr.trim().split("\n").slice(0, 5).join("\n      ")}`);
      }
    }
  }

  // Display task command executions
  if (report.tasksResults.length > 0) {
    logger.info("\n📋 Task Verifications:");
    for (const res of report.tasksResults) {
      const statusIcon = res.passed ? "✓" : "✗";
      const duration = `${(res.durationMs / 1000).toFixed(2)}s`;
      logger.info(`   ${statusIcon} Task ${res.taskId}: ${res.command} [${duration}]`);
      if (!res.passed && (res.stderr || res.stdout)) {
        const out = res.stderr || res.stdout;
        logger.error(`      Error: ${out.trim().split("\n").slice(0, 5).join("\n      ")}`);
      }
    }
  }

  if (report.totalStackCommands === 0 && report.totalTasks === 0) {
    logger.warn("No verification commands configured or found in tasks.md.");
  }

  logger.info("");
  if (report.passed) {
    logger.info(
      `✓ Specty verification PASSED (${report.totalStackCommands + report.totalTasks} checks executed).`,
    );
    if (report.changeId) {
      logger.info(`  Evidence recorded in openspec/changes/${report.changeId}/verification.json`);
    } else {
      logger.info("  Evidence recorded in .specty/verification.json");
    }
  } else {
    logger.error("✗ Specty verification FAILED.");
    if (report.changeId) {
      logger.error(
        `  Failure report recorded in openspec/changes/${report.changeId}/verification.json`,
      );
    }
  }

  return report.passed;
}
