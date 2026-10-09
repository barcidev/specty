import path from "node:path";
import { getAllAdapters } from "../../adapters/registry.js";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import type { SupportedLanguageId } from "../../detect/types.js";
import { generateProjectInfrastructure } from "../../generate/generator.js";
import type { GenerationResult } from "../../generate/types.js";
import { executeAdaptersRemove } from "./adapters.js";

export interface SyncCommandOptions {
  cwd?: string;
  dryRun?: boolean;
}

export interface SyncExecutionResult {
  generation: GenerationResult;
  cleanedTools: string[];
}

export async function executeSync(options: SyncCommandOptions = {}): Promise<SyncExecutionResult> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);

  logger.info("Synchronizing specty infrastructure and tool configurations...");

  // 1. Clean up tools that are NOT in config.tools
  const activeSet = new Set(config.tools);
  const cleanedTools: string[] = [];

  for (const adapter of getAllAdapters()) {
    if (!activeSet.has(adapter.id)) {
      // Check if files exist and clean them if appropriate
      const removed = await executeAdaptersRemove(adapter.id, {
        cwd: repoRoot,
        dryRun: options.dryRun,
      });
      if (removed) {
        cleanedTools.push(adapter.id);
      }
    }
  }

  // 2. Generate and update active infrastructure
  const generation = await generateProjectInfrastructure({
    repoRoot,
    config,
    language: config.language,
    dryRun: options.dryRun,
    primaryLanguage: config.scopes[0]?.stack.language as SupportedLanguageId | undefined,
    frameworks: config.scopes[0]?.stack.frameworks,
    architecture: config.project.architecture,
  });

  logger.success(
    `Sync complete: ${generation.writtenCount} files written/verified, ${generation.skippedCount} up to date.`,
  );

  return {
    generation,
    cleanedTools,
  };
}
