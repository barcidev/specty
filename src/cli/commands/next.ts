import path from "node:path";
import { logger } from "../../core/logger.js";
import { determineNextAction, type NextActionReport } from "../../governance/next-action.js";

export interface NextCliOptions {
  cwd?: string;
  change?: string;
  json?: boolean;
  card?: boolean;
}

export async function executeNext(options: NextCliOptions = {}): Promise<NextActionReport> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const report = await determineNextAction(repoRoot, options.change);

  if (options.card) {
    console.log(report.statusCard);
    return report;
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  logger.info("=== Specty Next Action ===");
  logger.info(`Action:     ${report.actionType}`);
  logger.info(`StatusCard: ${report.statusCard}`);
  if (report.changeId) {
    logger.info(`Change:     ${report.changeId} (${report.changeStatus})`);
  }
  if (report.activeTask) {
    logger.info(
      `Task:       ${report.activeTask.id}${report.activeTask.role ? ` [${report.activeTask.role}]` : ""}`,
    );
  }
  if (report.allowedFiles.length > 0) {
    logger.info(`Scope:      ${report.allowedFiles.join(", ")}`);
  }
  logger.info(`Message:    ${report.message}`);
  logger.info(`Prescribed: ${report.prescribedCommand}`);

  return report;
}
