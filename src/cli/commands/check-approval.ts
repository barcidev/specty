import path from "node:path";
import { logger } from "../../core/logger.js";
import { checkApprovalGate } from "../../governance/check-approval.js";

export interface CheckApprovalCliOptions {
  cwd?: string;
  staged?: boolean;
  bypass?: string;
}

export async function executeCheckApproval(
  options: CheckApprovalCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  const result = await checkApprovalGate(repoRoot, {
    stagedOnly: options.staged,
    bypassReason: options.bypass,
  });

  if (result.bypassed) {
    logger.warn(`⚠ ${result.reason}`);
    return true;
  }

  if (result.passed) {
    logger.success(`✓ Specty Approval Gate: ${result.reason}`);
    return true;
  }

  logger.error(`✖ Specty Approval Gate Failed:\n${result.reason}`);
  return false;
}
