import path from "node:path";
import { createDefaultConfig, loadConfig, type SpectyConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { getSpecEngine } from "../../engines/factory.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import { generatePullRequest } from "../../governance/pr-generator.js";
import { transitionChangeState } from "../../governance/state-machine.js";
import { triggerCodebaseIndex } from "../../mcp/indexer.js";

export interface ArchiveCliOptions {
  cwd?: string;
  force?: boolean;
  dryRun?: boolean;
}

export async function executeArchive(
  changeArg?: string,
  options: ArchiveCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  const resolution = await resolveTargetChange(repoRoot, {
    changeId: changeArg,
  });

  const changeId = resolution.resolvedId;
  if (!changeId) {
    logger.error("No active specification change specified or resolved.");
    if (resolution.reason) {
      logger.info(resolution.reason);
    }
    return false;
  }

  // Check preconditions for archiving
  const transition = await transitionChangeState(repoRoot, changeId, "archived", {
    force: options.force,
  });

  if (!transition.success) {
    logger.error(`Cannot archive change "${changeId}":`);
    logger.error(transition.reason ?? "Preconditions for archiving were not met.");
    return false;
  }

  // Physically move change into archive/
  let config: SpectyConfig;
  try {
    config = await loadConfig(repoRoot);
  } catch {
    config = createDefaultConfig();
  }
  const engine = getSpecEngine(config.spec_engine);
  const archived = await engine.archive(repoRoot, changeId, {
    dryRun: options.dryRun,
  });

  if (!archived) {
    logger.error(`Failed to move change "${changeId}" to archive directory.`);
    return false;
  }

  logger.success(`Change "${changeId}" has been ARCHIVED successfully.`);

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

  if (!process.env.VITEST && !options.dryRun) {
    await triggerCodebaseIndex(repoRoot);
  }

  return true;
}
