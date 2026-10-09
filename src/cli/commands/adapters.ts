import fs from "node:fs/promises";
import path from "node:path";
import { getAdapter, getAllAdapters, normalizeToolId } from "../../adapters/registry.js";
import type { AdapterContext } from "../../adapters/types.js";
import { loadConfig, SUPPORTED_TOOLS, saveConfig } from "../../core/config.js";
import { SafeFileWriter } from "../../core/fs-writer.js";
import { logger } from "../../core/logger.js";
import {
  loadManifest,
  removeManifestEntry,
  saveManifest,
  updateManifestEntry,
} from "../../core/manifest.js";
import { computeShortHash } from "../../core/markers.js";

export interface AdaptersCommandOptions {
  cwd?: string;
  dryRun?: boolean;
}

export async function executeAdaptersList(options: AdaptersCommandOptions = {}): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);
  const activeTools = new Set(config.tools);

  logger.info("Supported AI Tool Adapters:\n");
  for (const adapter of getAllAdapters()) {
    const isActive = activeTools.has(adapter.id);
    const badge = isActive ? "✓ [enabled]" : "- [disabled]";
    logger.info(`  ${badge.padEnd(14)} ${adapter.id.padEnd(14)} (${adapter.name})`);
  }
}

export async function executeAdaptersAdd(
  toolName: string,
  options: AdaptersCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const normalizedTool = normalizeToolId(toolName);

  if (!normalizedTool) {
    logger.error(`Unsupported tool: "${toolName}". Supported tools: ${SUPPORTED_TOOLS.join(", ")}`);
    return false;
  }

  const config = await loadConfig(repoRoot);
  if (config.tools.includes(normalizedTool)) {
    logger.warn(`Tool "${normalizedTool}" is already enabled in .specty/config.yaml`);
    return true;
  }

  const adapter = getAdapter(normalizedTool);
  config.tools.push(normalizedTool);

  const ctx: AdapterContext = {
    repoRoot,
    config,
    language: config.language,
    enableMcp: Boolean(config.mcp.enabled),
    dryRun: Boolean(options.dryRun),
  };

  const files = await adapter.generateFiles(ctx);
  const writer = new SafeFileWriter(repoRoot);
  const manifest = await loadManifest(repoRoot);

  for (const file of files) {
    const res = await writer.writeFile(file.relativePath, file.content, {
      dryRun: options.dryRun,
      createBackup: true,
    });

    if (res.written && !options.dryRun) {
      updateManifestEntry(manifest, {
        path: file.relativePath,
        language: config.language,
        baseHash: computeShortHash(file.content),
      });
    }
  }

  if (!options.dryRun) {
    await saveConfig(repoRoot, config);
    await saveManifest(repoRoot, manifest);
  }

  logger.success(`Added adapter for "${adapter.name}".`);

  if (adapter.getMcpInstructions) {
    const mcpNote = adapter.getMcpInstructions(config.language);
    if (mcpNote) {
      logger.info(`\nMCP Note: ${mcpNote}`);
    }
  }

  return true;
}

export async function executeAdaptersRemove(
  toolName: string,
  options: AdaptersCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const normalizedTool = normalizeToolId(toolName);

  if (!normalizedTool) {
    logger.error(`Unsupported tool: "${toolName}". Supported tools: ${SUPPORTED_TOOLS.join(", ")}`);
    return false;
  }

  const config = await loadConfig(repoRoot);
  if (!config.tools.includes(normalizedTool)) {
    logger.warn(`Tool "${normalizedTool}" is not currently enabled in .specty/config.yaml`);
    return true;
  }

  const adapter = getAdapter(normalizedTool);
  config.tools = config.tools.filter((t) => t !== normalizedTool);

  const ctx: AdapterContext = {
    repoRoot,
    config,
    language: config.language,
    enableMcp: Boolean(config.mcp.enabled),
    dryRun: Boolean(options.dryRun),
  };

  const expectedPaths = adapter.getExpectedFilePaths(ctx);
  const manifest = await loadManifest(repoRoot);

  for (const relPath of expectedPaths) {
    if (relPath === "AGENTS.md") {
      // Never delete shared root AGENTS.md
      continue;
    }
    const fullPath = path.join(repoRoot, relPath);
    if (!options.dryRun) {
      try {
        await fs.rm(fullPath, { force: true });
        removeManifestEntry(manifest, relPath);
      } catch {
        // file might not exist, ignore
      }
    }
  }

  if (!options.dryRun) {
    await saveConfig(repoRoot, config);
    await saveManifest(repoRoot, manifest);
  }

  logger.success(`Removed adapter for "${adapter.name}".`);
  return true;
}
