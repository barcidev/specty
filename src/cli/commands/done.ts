import path from "node:path";
import { logger } from "../../core/logger.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import { transitionChangeState } from "../../governance/state-machine.js";

export interface DoneCliOptions {
  cwd?: string;
  force?: boolean;
}

export async function executeDone(
  changeArg?: string,
  options: DoneCliOptions = {},
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

  const result = await transitionChangeState(repoRoot, changeId, "done", {
    force: options.force,
  });

  if (!result.success) {
    logger.error(`Cannot complete change "${changeId}":`);
    logger.error(result.reason ?? "Preconditions for state 'done' were not met.");
    return false;
  }

  logger.success(`Change "${changeId}" is now DONE.`);
  if (result.reason) {
    logger.info(result.reason);
  }
  return true;
}
