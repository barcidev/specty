import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { getAllAdapters } from "../../adapters/registry.js";
import type { AdapterContext } from "../../adapters/types.js";
import { createDefaultConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { loadManifest } from "../../core/manifest.js";
import { checkGitHooksStatus, uninstallGitHooks } from "../../governance/git-hooks.js";

export interface UninstallCommandOptions {
  cwd?: string;
  all?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

export interface UninstallExecutionResult {
  success: boolean;
  mode: "partial" | "all";
  deletedFiles: string[];
  deletedDirectories: string[];
  hooksUninstalled: boolean;
  preservedPaths: string[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function cleanEmptyParentDirs(startDir: string, stopAt: string): Promise<string[]> {
  const cleaned: string[] = [];
  let current = path.resolve(startDir);
  const root = path.resolve(stopAt);

  while (current !== root && current.startsWith(root)) {
    try {
      const entries = await fs.readdir(current);
      if (entries.length === 0) {
        await fs.rmdir(current);
        cleaned.push(path.relative(root, current));
        current = path.dirname(current);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return cleaned;
}

async function cleanMcpServerEntries(filePath: string): Promise<"deleted" | "updated" | "skipped"> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.mcpServers &&
      typeof parsed.mcpServers === "object"
    ) {
      delete parsed.mcpServers.specty;
      delete parsed.mcpServers["codebase-memory"];

      const serverCount = Object.keys(parsed.mcpServers).length;
      const rootKeyCount = Object.keys(parsed).length;

      if (serverCount === 0 && rootKeyCount === 1) {
        await fs.rm(filePath, { force: true });
        return "deleted";
      }

      await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), "utf8");
      return "updated";
    }

    await fs.rm(filePath, { force: true });
    return "deleted";
  } catch {
    return "skipped";
  }
}

export async function executeUninstall(options: UninstallCommandOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  const spectyDirExists = await isDirectory(path.join(repoRoot, ".specty"));
  const agentsMdExists = await fileExists(path.join(repoRoot, "AGENTS.md"));
  const openspecDirExists = await isDirectory(path.join(repoRoot, "openspec"));
  const hookStatus = await checkGitHooksStatus(repoRoot);

  if (!spectyDirExists && !agentsMdExists && !openspecDirExists && !hookStatus.active) {
    logger.warn("No se detectaron archivos ni configuraciones de Specty en este directorio.");
    return true;
  }

  let purgeAll = Boolean(options.all);
  const isInteractive = Boolean(process.stdout.isTTY && !options.yes);

  if (isInteractive && !options.all) {
    p.intro("specty uninstall");

    const choice = await p.select({
      message: "¿Cómo deseas desinstalar Specty de este proyecto?",
      options: [
        {
          value: "partial",
          label: "Conservar historial y registros (Recomendado)",
          hint: "Elimina adaptadores, directivas AGENTS.md y hooks de git, pero conserva openspec/ con todo el historial",
        },
        {
          value: "all",
          label: "Eliminar todo por completo (Purge total)",
          hint: "Elimina openspec/, .specty/, adaptadores, hooks y cualquier rastro de la herramienta",
        },
      ],
    });

    if (p.isCancel(choice)) {
      logger.info("Desinstalación cancelada por el usuario.");
      return false;
    }

    purgeAll = choice === "all";

    const proceed = await p.confirm({
      message: purgeAll
        ? "¿Confirmas que deseas ELIMINAR TODO (incluyendo 'openspec/' y todo el historial de cambios y especificaciones)?"
        : "¿Confirmas que deseas desinstalar Specty conservando tus registros en 'openspec/'?",
      initialValue: !purgeAll,
    });

    if (p.isCancel(proceed) || !proceed) {
      logger.info("Desinstalación cancelada por el usuario.");
      return false;
    }
  }

  const manifest = await loadManifest(repoRoot);
  const candidateFiles = new Set<string>();
  const candidateDirs = new Set<string>();
  const preservedPaths: string[] = [];

  // 1. Files from manifest
  for (const relPath of Object.keys(manifest.files)) {
    if (relPath.startsWith("openspec/") || relPath === "openspec") {
      if (purgeAll) {
        candidateFiles.add(relPath);
      } else {
        preservedPaths.push(relPath);
      }
    } else if (relPath.startsWith(".specty/audit") || relPath.startsWith(".specty/reports")) {
      if (purgeAll) {
        candidateFiles.add(relPath);
      } else {
        preservedPaths.push(relPath);
      }
    } else {
      candidateFiles.add(relPath);
    }
  }

  // 2. Expected paths from all adapters
  const dummyCtx: AdapterContext = {
    repoRoot,
    config: createDefaultConfig(),
    language: "es",
    enableMcp: true,
  };

  for (const adapter of getAllAdapters()) {
    const paths = adapter.getExpectedFilePaths(dummyCtx);
    for (const pth of paths) {
      if (await fileExists(path.join(repoRoot, pth))) {
        candidateFiles.add(pth);
      }
    }
  }

  // 3. Sovereign root AGENTS.md and Claude instructions if present
  if (await fileExists(path.join(repoRoot, "AGENTS.md"))) {
    candidateFiles.add("AGENTS.md");
  }
  if (await fileExists(path.join(repoRoot, "CLAUDE.md"))) {
    candidateFiles.add("CLAUDE.md");
  }

  // 4. Specty scaffolding files and directories
  const spectyCoreFiles = [
    ".specty/config.yaml",
    ".specty/manifest.json",
    ".specty/.session-token",
    ".specty/routing.md",
  ];
  for (const f of spectyCoreFiles) {
    if (await fileExists(path.join(repoRoot, f))) {
      candidateFiles.add(f);
    }
  }

  if (purgeAll) {
    if (await isDirectory(path.join(repoRoot, ".specty"))) {
      candidateDirs.add(".specty");
    }
    if (await isDirectory(path.join(repoRoot, "openspec"))) {
      candidateDirs.add("openspec");
    }
  } else {
    const spectySubDirs = [
      ".specty/agents",
      ".specty/rules",
      ".specty/templates",
      ".specty/backups",
    ];
    for (const d of spectySubDirs) {
      if (await isDirectory(path.join(repoRoot, d))) {
        candidateDirs.add(d);
      }
    }
    if (await isDirectory(path.join(repoRoot, "openspec"))) {
      preservedPaths.push("openspec");
    }
  }

  // 5. Dry run branch
  if (options.dryRun) {
    logger.info(
      `[dry-run] Modo de desinstalación: ${purgeAll ? "Purge total (eliminar todo)" : "Conservar historial en openspec/"}`,
    );
    logger.info("\nArchivos que se eliminarían:");
    for (const relPath of candidateFiles) {
      logger.info(`  - ${relPath}`);
    }

    if (candidateDirs.size > 0) {
      logger.info("\nDirectorios que se eliminarían:");
      for (const relDir of candidateDirs) {
        logger.info(`  - ${relDir}`);
      }
    }

    if (hookStatus.active) {
      logger.info(`\nHooks de Git que se desinstalarían: ${hookStatus.manager?.type ?? "native"}`);
    }

    if (!purgeAll && preservedPaths.length > 0) {
      logger.info("\nArchivos y carpetas preservados:");
      for (const preserved of preservedPaths) {
        logger.info(`  + ${preserved}`);
      }
    }

    return true;
  }

  // 6. Execute actual uninstallation
  const deletedFiles: string[] = [];
  const deletedDirs: string[] = [];
  const parentDirsToCheck = new Set<string>();

  // A. Uninstall git hooks
  if (hookStatus.active) {
    await uninstallGitHooks(repoRoot);
  }

  // B. Delete files
  for (const relPath of candidateFiles) {
    const fullPath = path.join(repoRoot, relPath);
    if (relPath.endsWith("mcp.json")) {
      const cleanResult = await cleanMcpServerEntries(fullPath);
      if (cleanResult === "deleted") {
        deletedFiles.push(relPath);
        parentDirsToCheck.add(path.dirname(fullPath));
      }
    } else {
      try {
        await fs.rm(fullPath, { force: true });
        deletedFiles.push(relPath);
        parentDirsToCheck.add(path.dirname(fullPath));
      } catch {
        // file might not exist, proceed
      }
    }
  }

  // C. Delete scaffolding directories
  for (const relDir of candidateDirs) {
    const fullDir = path.join(repoRoot, relDir);
    try {
      await fs.rm(fullDir, { recursive: true, force: true });
      deletedDirs.push(relDir);
      parentDirsToCheck.add(path.dirname(fullDir));
    } catch {
      // directory might not exist, proceed
    }
  }

  // D. In partial mode, remove .specty if left empty
  if (!purgeAll) {
    const spectyPath = path.join(repoRoot, ".specty");
    try {
      const remaining = await fs.readdir(spectyPath);
      if (remaining.length === 0) {
        await fs.rmdir(spectyPath);
        deletedDirs.push(".specty");
      }
    } catch {
      // .specty already absent or non-empty (e.g. audit left)
    }
  }

  // E. Clean empty parent folders (e.g. .agents/rules -> .agents)
  for (const parentDir of parentDirsToCheck) {
    await cleanEmptyParentDirs(parentDir, repoRoot);
  }

  if (purgeAll) {
    logger.success("Specty y todo su historial han sido eliminados por completo del proyecto.");
  } else {
    logger.success("Specty ha sido desinstalado del proyecto.");
    logger.info(
      "Se ha conservado el directorio 'openspec/' con el registro histórico de especificaciones y tareas.",
    );
  }

  return true;
}
