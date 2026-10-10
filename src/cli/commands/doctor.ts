import fs from "node:fs/promises";
import path from "node:path";
import { getAdapter } from "../../adapters/registry.js";
import { loadConfig, type SpectyConfig } from "../../core/config.js";
import { executeCommand } from "../../core/exec.js";
import { isInsideGitRepo } from "../../core/git.js";
import { logger } from "../../core/logger.js";
import { loadManifest } from "../../core/manifest.js";
import { getSpecEngine } from "../../engines/factory.js";
import { checkApprovalStatus } from "../../governance/approvals.js";
import { checkGitHooksStatus, installHookWithManager } from "../../governance/git-hooks.js";
import { validateChangeSpecification } from "../../governance/spec-validator.js";
import { executeSync } from "./sync.js";

export interface DoctorCommandOptions {
  cwd?: string;
  fix?: boolean;
}

export interface DoctorCheckItem {
  id: string;
  title: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface DoctorReport {
  healthy: boolean;
  checks: DoctorCheckItem[];
}

export async function executeDoctor(options: DoctorCommandOptions = {}): Promise<DoctorReport> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const checks: DoctorCheckItem[] = [];

  logger.info("Running Specty Doctor diagnostics...\n");

  // 1. Check Git
  const isGit = await isInsideGitRepo(repoRoot);
  if (isGit) {
    checks.push({
      id: "git",
      title: "Git Repository",
      status: "pass",
      message: "Repository is a valid Git worktree.",
    });
  } else {
    checks.push({
      id: "git",
      title: "Git Repository",
      status: "fail",
      message: "Not inside a Git repository. Run 'git init'.",
    });
  }

  // 2. Check Config
  let config: SpectyConfig | null = null;
  try {
    config = await loadConfig(repoRoot);
    checks.push({
      id: "config",
      title: "Configuration File",
      status: "pass",
      message: `.specty/config.yaml is valid (language: ${config.language}, engine: ${config.spec_engine}).`,
    });
  } catch (err: unknown) {
    checks.push({
      id: "config",
      title: "Configuration File",
      status: "fail",
      message: `Invalid or missing configuration: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 3. Check AGENTS.md
  try {
    await fs.access(path.join(repoRoot, "AGENTS.md"));
    checks.push({
      id: "agents-md",
      title: "Sovereign Directives (AGENTS.md)",
      status: "pass",
      message: "AGENTS.md is present in the repository root.",
    });
  } catch {
    checks.push({
      id: "agents-md",
      title: "Sovereign Directives (AGENTS.md)",
      status: "fail",
      message: "AGENTS.md is missing in repo root. Run 'specty sync'.",
    });
  }

  // 4. Check Manifest
  try {
    const manifest = await loadManifest(repoRoot);
    const fileCount = Object.keys(manifest.files).length;
    checks.push({
      id: "manifest",
      title: "Specty Manifest",
      status: "pass",
      message: `.specty/manifest.json tracks ${fileCount} files.`,
    });
  } catch {
    checks.push({
      id: "manifest",
      title: "Specty Manifest",
      status: "warn",
      message: ".specty/manifest.json is missing or corrupted.",
    });
  }

  // 5. Check Active Tool Files
  if (config) {
    let missingToolFilesCount = 0;
    for (const toolId of config.tools) {
      try {
        const adapter = getAdapter(toolId);
        const expectedPaths = adapter.getExpectedFilePaths({
          repoRoot,
          config,
          language: config.language,
          enableMcp: Boolean(config.mcp.enabled),
        });

        for (const relPath of expectedPaths) {
          const exists = await fs
            .access(path.join(repoRoot, relPath))
            .then(() => true)
            .catch(() => false);
          if (!exists) {
            missingToolFilesCount++;
          }
        }
      } catch {
        missingToolFilesCount++;
      }
    }

    if (missingToolFilesCount === 0) {
      checks.push({
        id: "tools",
        title: "AI Tool Files",
        status: "pass",
        message: `All files for ${config.tools.length} configured tools are present.`,
      });
    } else {
      checks.push({
        id: "tools",
        title: "AI Tool Files",
        status: "warn",
        message: `${missingToolFilesCount} expected tool file(s) are missing. Run 'specty sync'.`,
      });
    }
  }

  // 6. Check Changes Drift / Re-approval
  if (config) {
    try {
      const engine = getSpecEngine(config.spec_engine);
      const changes = await engine.listChanges(repoRoot);
      let driftCount = 0;

      for (const c of changes) {
        const approval = await checkApprovalStatus(repoRoot, c.id);
        if (approval.code === "reapproval_required") {
          driftCount++;
        }
      }

      if (driftCount === 0) {
        checks.push({
          id: "changes",
          title: "Specification Integrity",
          status: "pass",
          message: `${changes.length} active change(s) verified without drift.`,
        });
      } else {
        checks.push({
          id: "changes",
          title: "Specification Integrity",
          status: "warn",
          message: `${driftCount} change(s) have drift and require re-approval.`,
        });
      }

      // 6b. Check Specification Semantic Validity
      let semanticErrorCount = 0;
      let semanticWarningCount = 0;
      const invalidChanges: string[] = [];

      for (const c of changes) {
        const val = await validateChangeSpecification(c.path);
        if (!val.valid) {
          semanticErrorCount += val.errorsCount ?? 1;
          invalidChanges.push(c.id);
        }
        if (val.warningsCount) {
          semanticWarningCount += val.warningsCount;
        }
      }

      if (semanticErrorCount === 0) {
        const warnDetail = semanticWarningCount > 0 ? ` (${semanticWarningCount} warning(s))` : "";
        checks.push({
          id: "spec-semantics",
          title: "Specification Semantics",
          status: semanticWarningCount > 0 ? "warn" : "pass",
          message:
            changes.length === 0
              ? "No active changes to validate."
              : `All ${changes.length} active change(s) conform to markdown specification schemas${warnDetail}.`,
        });
      } else {
        checks.push({
          id: "spec-semantics",
          title: "Specification Semantics",
          status: "fail",
          message: `${semanticErrorCount} semantic error(s) in change(s): ${invalidChanges.join(", ")}. Run 'specty validate' to inspect.`,
        });
      }
    } catch {
      // ignore
    }
  }

  // 7. Check MCP Graph Provider
  if (config?.mcp.enabled) {
    if (config.mcp.graph_provider === "codebase-memory") {
      const cbmCmd = config.mcp.codebase_memory?.command || "codebase-memory-mcp";
      const isAvailable = await executeCommand(`which ${cbmCmd}`, { silent: true })
        .then((r) => r.success)
        .catch(() => false);

      if (isAvailable) {
        checks.push({
          id: "mcp-graph",
          title: "MCP Graph Provider",
          status: "pass",
          message: `codebase-memory-mcp is installed and ready (${cbmCmd}).`,
        });
      } else {
        checks.push({
          id: "mcp-graph",
          title: "MCP Graph Provider",
          status: "warn",
          message: `'${cbmCmd}' binary not found in PATH. Specty will fallback to builtin SQLite, or install codebase-memory-mcp.`,
        });
      }
    } else {
      checks.push({
        id: "mcp-graph",
        title: "MCP Graph Provider",
        status: "pass",
        message: "Using lightweight builtin SQLite graph engine.",
      });
    }
  }

  // 8. Check Git Governance Hooks
  if (config?.governance.hooks !== false) {
    if (isGit) {
      const hooksStatus = await checkGitHooksStatus(repoRoot);
      if (hooksStatus.active && hooksStatus.manager) {
        checks.push({
          id: "git-hooks",
          title: "Git Governance Hooks",
          status: "pass",
          message: `Governance hooks are active via ${hooksStatus.manager.name} (${hooksStatus.manager.configPath}).`,
        });
      } else {
        checks.push({
          id: "git-hooks",
          title: "Git Governance Hooks",
          status: "warn",
          message: "Git governance hooks are missing or not active. Run 'specty hooks install'.",
        });
      }
    } else {
      checks.push({
        id: "git-hooks",
        title: "Git Governance Hooks",
        status: "warn",
        message: "Git governance hooks cannot be verified outside a Git repository.",
      });
    }
  }

  // Print results
  for (const c of checks) {
    const symbol = c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✖";
    logger.info(`  ${symbol} [${c.title}] - ${c.message}`);
  }

  const failures = checks.filter((c) => c.status === "fail");
  const warnings = checks.filter((c) => c.status === "warn");
  const healthy = failures.length === 0;

  if (options.fix && (!healthy || warnings.length > 0)) {
    logger.info("\nAttempting automatic repairs with 'specty sync'...");
    await executeSync({ cwd: repoRoot });
    if (isGit && config?.governance.hooks !== false) {
      await installHookWithManager(repoRoot);
    }
    logger.success("Repairs completed. Re-run 'specty doctor' to verify.");
  }

  return { healthy, checks };
}
