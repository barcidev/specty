import fs from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { loadConfig } from "../core/config.js";
import { executeFile } from "../core/exec.js";
import { getSpecEngine } from "../engines/factory.js";
import type { ChangeStatus, ChangeTaskSummary } from "../engines/types.js";
import { recordMetricEvent } from "../metrics/index.js";
import { type ApprovalStateCode, checkApprovalStatus } from "./approvals.js";

export interface GateChangeSummary {
  id: string;
  title?: string;
  status: ChangeStatus;
  approvalCode: ApprovalStateCode;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvedHash?: string;
  currentHash?: string;
  tasks: ChangeTaskSummary;
  isArchived: boolean;
}

export interface GateBypassRecord {
  timestamp: string;
  user: string;
  env?: string;
  source: "env" | "trailer" | "option";
  reason: string;
  files: string[];
}

export interface GateResult {
  passed: boolean;
  bypassed: boolean;
  bypassDetails?: GateBypassRecord;
  modifiedSourceFiles: string[];
  modifiedExemptFiles?: string[];
  allModifiedFiles?: string[];
  activeApprovedChange?: string;
  changeDetails?: GateChangeSummary;
  allChanges?: GateChangeSummary[];
  reason?: string;
}

export interface CheckApprovalGateOptions {
  stagedOnly?: boolean;
  baseRef?: string;
  headRef?: string;
  bypassReason?: string;
}

export const BYPASS_AUDIT_FILENAME = ".specty/audit/bypasses.jsonl";

function sanitizeGitRef(ref: string): string {
  if (!ref || !/^[a-zA-Z0-9._/~^@-]+$/.test(ref)) {
    throw new Error(`Invalid git reference: "${ref}"`);
  }
  return ref;
}

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
  let modifiedFiles: string[] = [];
  const rawBaseRef =
    options.baseRef || (!options.stagedOnly ? process.env.GITHUB_BASE_REF : undefined);
  const baseRef = rawBaseRef ? sanitizeGitRef(rawBaseRef) : undefined;
  const headRef = sanitizeGitRef(options.headRef || "HEAD");
  let resolvedBase = baseRef;

  if (options.stagedOnly) {
    const diffRes = await executeFile("git", ["diff", "--cached", "--name-only"], {
      cwd: repoRoot,
      silent: true,
    });
    modifiedFiles = diffRes.stdout
      .split("\n")
      .map((f) => f.trim().replace(/\\/g, "/"))
      .filter(Boolean);
  } else if (baseRef) {
    const baseCandidates = baseRef.startsWith("origin/")
      ? [baseRef, baseRef.replace(/^origin\//, "")]
      : [`origin/${baseRef}`, baseRef];

    let diffSuccess = false;
    for (const cand of baseCandidates) {
      const diffRes = await executeFile("git", ["diff", "--name-only", `${cand}...${headRef}`], {
        cwd: repoRoot,
        silent: true,
      });
      if (diffRes.success) {
        modifiedFiles = diffRes.stdout
          .split("\n")
          .map((f) => f.trim().replace(/\\/g, "/"))
          .filter(Boolean);
        diffSuccess = true;
        resolvedBase = cand;
        break;
      }
    }

    if (!diffSuccess) {
      const diffRes = await executeFile("git", ["diff", "--name-only", "HEAD"], {
        cwd: repoRoot,
        silent: true,
      });
      modifiedFiles = diffRes.stdout
        .split("\n")
        .map((f) => f.trim().replace(/\\/g, "/"))
        .filter(Boolean);
    }
  } else {
    const diffRes = await executeFile("git", ["diff", "--name-only", "HEAD"], {
      cwd: repoRoot,
      silent: true,
    });
    modifiedFiles = diffRes.stdout
      .split("\n")
      .map((f) => f.trim().replace(/\\/g, "/"))
      .filter(Boolean);

    // Fallback to git status --porcelain if working tree check is needed
    if (modifiedFiles.length === 0) {
      const statusRes = await executeFile("git", ["status", "--porcelain"], {
        cwd: repoRoot,
        silent: true,
      });
      modifiedFiles = statusRes.stdout
        .split("\n")
        .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
        .filter(Boolean);
    }
  }

  // 2. Filter modified files against source_paths and exempt_paths
  const sourceIg = ignore().add(config.governance.source_paths);
  const exemptIg = ignore().add(config.governance.exempt_paths);

  const modifiedSourceFiles: string[] = [];
  const modifiedExemptFiles: string[] = [];

  for (const file of modifiedFiles) {
    const isExempt = exemptIg.ignores(file);
    const isSource = sourceIg.ignores(file);
    if (isExempt) {
      modifiedExemptFiles.push(file);
    } else if (isSource) {
      modifiedSourceFiles.push(file);
    } else {
      modifiedExemptFiles.push(file);
    }
  }

  // If no source files are modified, gate passes trivially
  if (modifiedSourceFiles.length === 0) {
    return {
      passed: true,
      bypassed: false,
      modifiedSourceFiles: [],
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      reason: "No governed source files were modified.",
    };
  }

  // 3. Check for Emergency Bypass
  const bypassEnvVar = config.governance.bypass.env;
  const bypassTrailerKey = config.governance.bypass.trailer || "Specty-Bypass";

  const isHookDisabled = process.env.SPECTY_HOOK_DISABLED === "1";
  const hasEnvBypass = Boolean(
    process.env[bypassEnvVar] || process.env.SPECTY_BYPASS === "1" || isHookDisabled,
  );
  let isBypassed = Boolean(hasEnvBypass || options.bypassReason);
  let bypassSource: "env" | "trailer" | "option" = options.bypassReason
    ? "option"
    : hasEnvBypass
      ? "env"
      : "option";
  let bypassReason =
    options.bypassReason ||
    (isHookDisabled
      ? "Hook disabled via SPECTY_HOOK_DISABLED environment variable"
      : process.env[bypassEnvVar] || process.env.SPECTY_BYPASS === "1"
        ? "Emergency environment bypass"
        : "");

  // If not bypassed yet, check Git commit trailers in commit range
  if (!isBypassed) {
    try {
      const logRange = resolvedBase ? `${resolvedBase}...${headRef}` : "-1";
      const trailerRes = await executeFile(
        "git",
        ["log", logRange, `--format=%(trailers:key=${bypassTrailerKey},valueonly)`],
        { cwd: repoRoot, silent: true },
      );
      const trailers = trailerRes.stdout
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      const firstTrailer = trailers[0];
      if (firstTrailer) {
        isBypassed = true;
        bypassSource = "trailer";
        bypassReason = firstTrailer;
      } else {
        const bodyRes = await executeFile("git", ["log", logRange, "--format=%B"], {
          cwd: repoRoot,
          silent: true,
        });
        const match = bodyRes.stdout.match(new RegExp(`^${bypassTrailerKey}:\\s*(.+)`, "mi"));
        if (match?.[1]) {
          isBypassed = true;
          bypassSource = "trailer";
          bypassReason = match[1].trim();
        }
      }
    } catch {
      // Ignore git log errors
    }
  }

  if (isBypassed) {
    const auditDir = path.join(repoRoot, ".specty/audit");
    await fs.mkdir(auditDir, { recursive: true });
    const user = process.env.GITHUB_ACTOR || process.env.USER || "unknown";
    const auditEntry: GateBypassRecord = {
      timestamp: new Date().toISOString(),
      user,
      env: bypassSource === "env" ? bypassEnvVar : undefined,
      source: bypassSource,
      reason: bypassReason || "Emergency hotfix bypass",
      files: modifiedSourceFiles,
    };
    await fs.appendFile(
      path.join(repoRoot, BYPASS_AUDIT_FILENAME),
      `${JSON.stringify(auditEntry)}\n`,
      "utf8",
    );

    await recordMetricEvent(repoRoot, {
      type: "bypass_used",
      reason: auditEntry.reason,
      user: auditEntry.user,
      stagedFilesCount: modifiedSourceFiles.length,
    });

    return {
      passed: true,
      bypassed: true,
      bypassDetails: auditEntry,
      modifiedSourceFiles,
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      reason: `Emergency bypass active via ${bypassSource === "env" ? bypassEnvVar : bypassSource}. Action logged for audit.`,
    };
  }

  // 4. Verify Active Approved Specification Change
  const engine = getSpecEngine(config.spec_engine);
  const activeChanges = await engine.listChanges(repoRoot);
  const changeSummaries: GateChangeSummary[] = [];

  let approvedChangeSummary: GateChangeSummary | undefined;
  let reapprovalChangeSummary: GateChangeSummary | undefined;

  for (const change of activeChanges) {
    const status = await checkApprovalStatus(repoRoot, change.id);

    const summary: GateChangeSummary = {
      id: change.id,
      title: change.title,
      status: change.status,
      approvalCode: status.code,
      approved: status.approved,
      approvedBy: status.approvedBy,
      approvedAt: status.approvedAt,
      approvedHash: status.approvedHash,
      currentHash: status.currentHash,
      tasks: change.tasks,
      isArchived: change.isArchived,
    };
    changeSummaries.push(summary);

    if (status.code === "reapproval_required") {
      reapprovalChangeSummary ??= summary;
      await recordMetricEvent(repoRoot, {
        type: "approval_invalidated",
        changeId: change.id,
        expectedHash: status.approvedHash ?? "",
        actualHash: status.currentHash ?? "",
      });
    }

    if (
      status.approved &&
      (change.status === "approved" ||
        change.status === "in-progress" ||
        change.status === "review")
    ) {
      approvedChangeSummary ??= summary;
    }
  }

  if (approvedChangeSummary) {
    return {
      passed: true,
      bypassed: false,
      modifiedSourceFiles,
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      activeApprovedChange: approvedChangeSummary.id,
      changeDetails: approvedChangeSummary,
      allChanges: changeSummaries,
      reason: `Governed by approved change "${approvedChangeSummary.id}".`,
    };
  }

  if (reapprovalChangeSummary) {
    return {
      passed: false,
      bypassed: false,
      modifiedSourceFiles,
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      changeDetails: reapprovalChangeSummary,
      allChanges: changeSummaries,
      reason: `Specification change "${reapprovalChangeSummary.id}" was modified after approval. Re-approval required.\nApproved hash: ${reapprovalChangeSummary.approvedHash}\nCurrent hash:  ${reapprovalChangeSummary.currentHash}\n\nRun 'specty approve ${reapprovalChangeSummary.id}' to re-approve.`,
    };
  }

  const draftChange = changeSummaries.find((c) => c.status === "draft");
  return {
    passed: false,
    bypassed: false,
    modifiedSourceFiles,
    modifiedExemptFiles,
    allModifiedFiles: modifiedFiles,
    changeDetails: draftChange,
    allChanges: changeSummaries,
    reason: `Modifications in source files without an active approved change:\n${modifiedSourceFiles.map((f) => `  - ${f}`).join("\n")}\n\nRun 'specty approve <change>' or plan a new change with 'specty'.`,
  };
}
