import fs from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { loadConfig } from "../core/config.js";
import { executeCommand } from "../core/exec.js";
import { getSpecEngine } from "../engines/factory.js";
import { checkApprovalStatus } from "./approvals.js";

export interface GateResult {
  passed: boolean;
  bypassed: boolean;
  modifiedSourceFiles: string[];
  activeApprovedChange?: string;
  reason?: string;
}

export interface CheckApprovalGateOptions {
  stagedOnly?: boolean;
  bypassReason?: string;
}

export const BYPASS_AUDIT_FILENAME = ".specty/audit/bypasses.jsonl";

/**
 * Checks if modified files in git touch governed source paths
 * and verifies that a valid approved change is active.
 */
export async function checkApprovalGate(
  repoRoot: string,
  options: CheckApprovalGateOptions = {},
): Promise<GateResult> {
  const config = await loadConfig(repoRoot);

  // 1. Gather modified files from git
  const gitCmd = options.stagedOnly ? "git diff --cached --name-only" : "git diff --name-only HEAD";

  const diffRes = await executeCommand(gitCmd, { cwd: repoRoot, silent: true });
  let modifiedFiles = diffRes.stdout
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  // Fallback to git status --porcelain if working tree check is needed
  if (!options.stagedOnly && modifiedFiles.length === 0) {
    const statusRes = await executeCommand("git status --porcelain", {
      cwd: repoRoot,
      silent: true,
    });
    modifiedFiles = statusRes.stdout
      .split("\n")
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
  }

  // 2. Filter modified files against source_paths and exempt_paths
  const sourceIg = ignore().add(config.governance.source_paths);
  const exemptIg = ignore().add(config.governance.exempt_paths);

  const modifiedSourceFiles = modifiedFiles.filter((file) => {
    // Must match source paths
    const isSource = sourceIg.ignores(file);
    // Must NOT be exempt
    const isExempt = exemptIg.ignores(file);
    return isSource && !isExempt;
  });

  // If no source files are modified, gate passes trivially
  if (modifiedSourceFiles.length === 0) {
    return {
      passed: true,
      bypassed: false,
      modifiedSourceFiles: [],
      reason: "No governed source files were modified.",
    };
  }

  // 3. Check for Emergency Bypass
  const bypassEnvVar = config.governance.bypass.env;
  const isBypassed = Boolean(process.env[bypassEnvVar] || options.bypassReason);

  if (isBypassed) {
    const auditDir = path.join(repoRoot, ".specty/audit");
    await fs.mkdir(auditDir, { recursive: true });
    const auditEntry = {
      timestamp: new Date().toISOString(),
      user: process.env.USER || "unknown",
      env: bypassEnvVar,
      reason: options.bypassReason || "Emergency hotfix bypass",
      files: modifiedSourceFiles,
    };
    await fs.appendFile(
      path.join(repoRoot, BYPASS_AUDIT_FILENAME),
      `${JSON.stringify(auditEntry)}\n`,
      "utf8",
    );

    return {
      passed: true,
      bypassed: true,
      modifiedSourceFiles,
      reason: `Emergency bypass active via ${bypassEnvVar}. Action logged for audit.`,
    };
  }

  // 4. Verify Active Approved Specification Change
  const engine = getSpecEngine(config.spec_engine);
  const activeChanges = await engine.listChanges(repoRoot);

  for (const change of activeChanges) {
    const status = await checkApprovalStatus(repoRoot, change.id);
    if (
      status.approved &&
      (change.status === "approved" ||
        change.status === "in-progress" ||
        change.status === "review")
    ) {
      return {
        passed: true,
        bypassed: false,
        modifiedSourceFiles,
        activeApprovedChange: change.id,
        reason: `Governed by approved change "${change.id}".`,
      };
    }
  }

  return {
    passed: false,
    bypassed: false,
    modifiedSourceFiles,
    reason: `Modifications in source files without an active approved change:\n${modifiedSourceFiles.map((f) => `  - ${f}`).join("\n")}\n\nRun 'specty approve <change>' or plan a new change with 'specty'.`,
  };
}
