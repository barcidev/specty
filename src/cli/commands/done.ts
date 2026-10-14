import path from "node:path";
import { logger } from "../../core/logger.js";
import { closeFeatureBranch } from "../../governance/branch-manager.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import { generatePullRequest } from "../../governance/pr-generator.js";
import { transitionChangeState } from "../../governance/state-machine.js";
import { triggerCodebaseIndex } from "../../mcp/indexer.js";
import { executeArchive } from "./archive.js";

export interface DoneCliOptions {
  cwd?: string;
  force?: boolean;
  archive?: boolean;
  closeBranch?: boolean;
  dryRun?: boolean;
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

  // When reaching completed state: automatically archive, generate PR and close branch according to policy
  const shouldArchive = options.archive !== false;
  if (shouldArchive) {
    const archiveSuccess = await executeArchive(changeId, {
      cwd: repoRoot,
      force: options.force,
      dryRun: options.dryRun,
    });
    if (!archiveSuccess) {
      logger.warn(`Change was marked DONE but archiving "${changeId}" encountered an issue.`);
    }

    // Generate detailed Pull Request document
    try {
      const pr = await generatePullRequest(repoRoot, changeId, {
        dryRun: options.dryRun,
      });
      logger.success(`✓ Solicitud de Pull Request generada en: ${pr.relativeFilePath}`);
      logger.info(`Para abrir el PR en GitHub:`);
      logger.info(`  ${pr.ghCommand}`);
    } catch (prErr: unknown) {
      logger.warn(
        `No se pudo generar el documento de Pull Request: ${prErr instanceof Error ? prErr.message : String(prErr)}`,
      );
    }
  }

  const shouldCloseBranch = options.closeBranch !== false;
  if (shouldCloseBranch) {
    const branchRes = await closeFeatureBranch(repoRoot, changeId, {
      dryRun: options.dryRun,
    });
    if (!branchRes.success && branchRes.error) {
      logger.warn(`Could not close branch for "${changeId}": ${branchRes.error}`);
    }
  }

  if (!process.env.VITEST && !options.dryRun) {
    await triggerCodebaseIndex(repoRoot);
  }

  return true;
}
