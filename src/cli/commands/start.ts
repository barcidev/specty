import path from "node:path";
import { logger } from "../../core/logger.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import { transitionChangeState } from "../../governance/state-machine.js";

export interface StartCliOptions {
  cwd?: string;
  force?: boolean;
}

export async function executeStart(
  changeArg?: string,
  options: StartCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  const resolution = await resolveTargetChange(repoRoot, {
    changeId: changeArg,
  });

  const changeId = resolution.resolvedId;
  if (!changeId) {
    logger.error("No active specification change specified or resolved from current branch.");
    if (resolution.reason) {
      logger.info(resolution.reason);
    }
    return false;
  }

  const result = await transitionChangeState(repoRoot, changeId, "in-progress", {
    force: options.force,
  });

  if (!result.success) {
    logger.error(`Failed to start change "${changeId}":`);
    logger.error(result.reason ?? "Unknown transition error.");
    return false;
  }

  logger.success(`Change "${changeId}" is now IN-PROGRESS.`);
  if (result.reason) {
    logger.info(result.reason);
  }
  return true;
}
