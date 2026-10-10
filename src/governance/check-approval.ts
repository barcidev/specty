import fs from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { loadConfig, PROTECTED_GOVERNANCE_PATHS } from "../core/config.js";
import { executeFile } from "../core/exec.js";
import type { ChangeStatus, ChangeTaskSummary } from "../engines/types.js";
import { recordMetricEvent } from "../metrics/index.js";
import { type ApprovalStateCode, checkApprovalStatus } from "./approvals.js";
import { resolveTargetChange } from "./change-resolver.js";
import { getGitHubContext } from "./github-client.js";
import { getAllTasksFileGlobs, isPathMatchingGlobs, parseTasksWithScope } from "./task-scope.js";

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
  allModifiedFiles: string[];
  activeApprovedChange?: string;
  changeDetails?: GateChangeSummary;
  allChanges?: GateChangeSummary[];
  outOfScopeFiles?: string[];
  protectedFilesModified?: string[];
  errorCode?:
    | "no_approved_change"
    | "reapproval_required"
    | "out_of_scope"
    | "protected_config_tampered"
    | "ambiguous_active_changes"
    | "branch_change_mismatch";
  reason?: string;
}

export interface CheckApprovalGateOptions {
  stagedOnly?: boolean;
  baseRef?: string;
  headRef?: string;
  bypassReason?: string;
  changeId?: string;
  prLabels?: string[];
  prBody?: string;
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

  // 2. Identify protected governance files (A4)
  const protectedIg = ignore().add(PROTECTED_GOVERNANCE_PATHS);
  const modifiedProtectedFiles = modifiedFiles.filter((f) => protectedIg.ignores(f));

  // 3. Filter modified files against source_paths and exempt_paths
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

  // If no source files and no protected files are modified, gate passes trivially
  if (modifiedSourceFiles.length === 0 && modifiedProtectedFiles.length === 0) {
    return {
      passed: true,
      bypassed: false,
      modifiedSourceFiles: [],
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      protectedFilesModified: [],
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

  // Enforce protected governance paths (A4): block changes unless explicitly bypassed
  if (modifiedProtectedFiles.length > 0 && !isBypassed) {
    return {
      passed: false,
      bypassed: false,
      modifiedSourceFiles,
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      protectedFilesModified: modifiedProtectedFiles,
      errorCode: "protected_config_tampered",
      reason: `Governance configuration and hooks are protected from unauthorized modification:\n${modifiedProtectedFiles.map((f) => `  - ${f}`).join("\n")}\n\nTo modify governance settings, an emergency bypass (e.g. SPECTY_BYPASS=1 or commit trailer) is required.`,
    };
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
      files: modifiedSourceFiles.length > 0 ? modifiedSourceFiles : modifiedProtectedFiles,
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
      protectedFilesModified: modifiedProtectedFiles,
      reason: `Emergency bypass active via ${bypassSource === "env" ? bypassEnvVar : bypassSource}. Action logged for audit.`,
    };
  }

  // If no source files were modified (and protected check already verified), pass trivially
  if (modifiedSourceFiles.length === 0) {
    return {
      passed: true,
      bypassed: false,
      modifiedSourceFiles: [],
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      protectedFilesModified: modifiedProtectedFiles,
      reason: "No governed source files were modified.",
    };
  }

  // 5. Verify Active Approved Specification Change and Validate Scope (C3)
  const ghCtx = getGitHubContext();
  const prLabels = options.prLabels || ghCtx.prLabels;
  const prBody = options.prBody || ghCtx.prBody;
  const prHeadRef = ghCtx.headRef;

  const resolution = await resolveTargetChange(repoRoot, {
    changeId: options.changeId,
    headRef,
    baseRef: resolvedBase,
    prLabels,
    prBody,
    prHeadRef,
  });

  const activeChanges = resolution.activeChanges;
  const changeSummaries: GateChangeSummary[] = [];
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
  }

  if (resolution.isAmbiguous) {
    return {
      passed: false,
      bypassed: false,
      modifiedSourceFiles,
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      allChanges: changeSummaries,
      errorCode: "ambiguous_active_changes",
      reason: resolution.reason,
    };
  }

  const targetChange = resolution.change;
  const targetSummary = targetChange
    ? changeSummaries.find((c) => c.id === targetChange.id)
    : undefined;

  // Validate branch/change coherence if the branch explicitly declares a change
  if (
    resolution.branchCandidateId &&
    targetSummary &&
    resolution.branchCandidateId !== targetSummary.id &&
    activeChanges.some((c) => c.id === resolution.branchCandidateId)
  ) {
    return {
      passed: false,
      bypassed: false,
      modifiedSourceFiles,
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      activeApprovedChange: targetSummary.id,
      changeDetails: targetSummary,
      allChanges: changeSummaries,
      errorCode: "branch_change_mismatch",
      reason: `Branch indicates change "${resolution.branchCandidateId}", but targeted change is "${targetSummary.id}". Branch and active specification change must match.`,
    };
  }

  if (targetSummary && targetSummary.approvalCode === "reapproval_required") {
    return {
      passed: false,
      bypassed: false,
      modifiedSourceFiles,
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      changeDetails: targetSummary,
      allChanges: changeSummaries,
      errorCode: "reapproval_required",
      reason: `Specification change "${targetSummary.id}" was modified after approval. Re-approval required.\nApproved hash: ${targetSummary.approvedHash}\nCurrent hash:  ${targetSummary.currentHash}\n\nRun 'specty approve ${targetSummary.id}' to re-approve.`,
    };
  }

  if (
    targetChange &&
    targetSummary?.approved &&
    (targetSummary.status === "approved" ||
      targetSummary.status === "in-progress" ||
      targetSummary.status === "verifying" ||
      targetSummary.status === "review")
  ) {
    // Validate scope of files against [files: ...] in tasks.md
    let tasksContent = "";
    try {
      tasksContent = await fs.readFile(path.join(targetChange.path, "tasks.md"), "utf8");
    } catch {
      // no tasks.md
    }

    const parsedTasks = parseTasksWithScope(tasksContent);
    const allowedGlobs = getAllTasksFileGlobs(parsedTasks);

    const outOfScopeFiles =
      allowedGlobs.length > 0
        ? modifiedSourceFiles.filter((file) => !isPathMatchingGlobs(file, allowedGlobs))
        : [];

    if (outOfScopeFiles.length > 0) {
      return {
        passed: false,
        bypassed: false,
        modifiedSourceFiles,
        modifiedExemptFiles,
        allModifiedFiles: modifiedFiles,
        activeApprovedChange: targetSummary.id,
        changeDetails: targetSummary,
        allChanges: changeSummaries,
        outOfScopeFiles,
        errorCode: "out_of_scope",
        reason: `Modified files outside the scope of approved change "${targetSummary.id}":\n${outOfScopeFiles.map((f) => `  - ${f}`).join("\n")}\n\nAllowed file scopes for this change:\n${allowedGlobs.map((g) => `  [files: ${g}]`).join("\n")}\n\nTo modify these files, amend the change specification tasks and re-approve.`,
      };
    }

    return {
      passed: true,
      bypassed: false,
      modifiedSourceFiles,
      modifiedExemptFiles,
      allModifiedFiles: modifiedFiles,
      activeApprovedChange: targetSummary.id,
      changeDetails: targetSummary,
      allChanges: changeSummaries,
      reason: `Governed by approved change "${targetSummary.id}".`,
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
      errorCode: "reapproval_required",
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
    errorCode: "no_approved_change",
    reason: `Modifications in source files without an active approved change:\n${modifiedSourceFiles.map((f) => `  - ${f}`).join("\n")}\n\nRun 'specty approve <change>' or plan a new change with 'specty'.`,
  };
}
