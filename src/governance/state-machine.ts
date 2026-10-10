import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { getHeadCommitSha } from "../core/git.js";
import { readChangeState, writeChangeState } from "../engines/change-state.js";
import { getSpecEngine } from "../engines/factory.js";
import type { ChangeStatus } from "../engines/types.js";
import { recordMetricEvent } from "../metrics/index.js";
import { checkApprovalStatus } from "./approvals.js";
import { checkApprovalGate } from "./check-approval.js";
import { parseTasksWithScope } from "./task-scope.js";
import type { VerificationReport } from "./verifier.js";

export interface StateTransitionOptions {
  force?: boolean;
  user?: string;
  reason?: string;
}

export interface StateTransitionResult {
  success: boolean;
  changeId: string;
  fromStatus: ChangeStatus;
  toStatus: ChangeStatus;
  reason?: string;
}

const ALLOWED_TRANSITIONS: Record<ChangeStatus, ChangeStatus[]> = {
  draft: ["review", "approved"],
  review: ["approved", "draft"],
  approved: ["in-progress", "verifying", "done"],
  "in-progress": ["verifying", "done"],
  verifying: ["in-progress", "done"],
  done: ["archived", "in-progress", "verifying"],
  archived: [],
};

/**
 * Validates and executes a formal lifecycle transition for a specification change.
 */
export async function transitionChangeState(
  repoRoot: string,
  changeId: string,
  targetStatus: ChangeStatus,
  options: StateTransitionOptions = {},
): Promise<StateTransitionResult> {
  const config = await loadConfig(repoRoot);
  const engine = getSpecEngine(config.spec_engine);
  const change = await engine.getChange(repoRoot, changeId);

  if (!change) {
    return {
      success: false,
      changeId,
      fromStatus: "draft",
      toStatus: targetStatus,
      reason: `Specification change "${changeId}" not found.`,
    };
  }

  const currentStatus = change.status;

  // Idempotent transition
  if (currentStatus === targetStatus) {
    return {
      success: true,
      changeId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      reason: `Change "${changeId}" is already in state "${targetStatus}".`,
    };
  }

  // Validate allowed transitions (unless force is requested)
  if (!options.force) {
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTargets.includes(targetStatus)) {
      return {
        success: false,
        changeId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason: `Invalid transition from "${currentStatus}" to "${targetStatus}". Allowed next states: ${allowedTargets.join(", ") || "none"}.`,
      };
    }
  }

  // 1. Precondition checks by target status
  if (!options.force) {
    if (targetStatus === "in-progress" || targetStatus === "verifying") {
      const approval = await checkApprovalStatus(repoRoot, changeId);
      if (!approval.approved) {
        return {
          success: false,
          changeId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: `Cannot transition to "${targetStatus}": Change "${changeId}" is not approved or approval was invalidated.\nApproval code: ${approval.code}`,
        };
      }
    }

    if (targetStatus === "done") {
      // 1.1 Must have completed all tasks in tasks.md
      let tasksContent = "";
      try {
        tasksContent = await fs.readFile(path.join(change.path, "tasks.md"), "utf8");
      } catch {
        return {
          success: false,
          changeId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: `Cannot transition to "done": tasks.md file not found for change "${changeId}".`,
        };
      }

      const tasks = parseTasksWithScope(tasksContent);
      if (tasks.length === 0) {
        return {
          success: false,
          changeId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: `Cannot transition to "done": No tasks found in tasks.md for change "${changeId}".`,
        };
      }

      const incomplete = tasks.filter((t) => !t.completed);
      if (incomplete.length > 0) {
        return {
          success: false,
          changeId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: `Cannot transition to "done": ${incomplete.length} task(s) remain incomplete in tasks.md (e.g. task ${incomplete[0]?.id}).`,
        };
      }

      // 1.2 Must have a valid verification.json with passed: true matching HEAD commit SHA
      const verifPath = path.join(change.path, "verification.json");
      let verifReport: VerificationReport | null = null;
      try {
        const rawVerif = await fs.readFile(verifPath, "utf8");
        verifReport = JSON.parse(rawVerif) as VerificationReport;
      } catch {
        return {
          success: false,
          changeId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: `Cannot transition to "done": No verification evidence found at verification.json. Run 'specty verify ${changeId}' first.`,
        };
      }

      if (!verifReport?.passed) {
        return {
          success: false,
          changeId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: `Cannot transition to "done": Latest verification report for change "${changeId}" failed.`,
        };
      }

      const headSha = await getHeadCommitSha(repoRoot);
      if (headSha && verifReport.commitSha && headSha !== verifReport.commitSha) {
        return {
          success: false,
          changeId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: `Cannot transition to "done": Verification was performed on commit ${verifReport.commitSha.slice(0, 7)}, but HEAD is at ${headSha.slice(0, 7)}. Re-run 'specty verify ${changeId}' on current HEAD.`,
        };
      }

      // 1.3 Check that working tree does not have out-of-scope edits
      const gate = await checkApprovalGate(repoRoot, { changeId });
      if (!gate.passed && gate.errorCode === "out_of_scope") {
        return {
          success: false,
          changeId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: `Cannot transition to "done": Out-of-scope modifications detected in working tree:\n${gate.outOfScopeFiles?.join("\n")}`,
        };
      }
    }

    if (targetStatus === "archived" && currentStatus !== "done") {
      return {
        success: false,
        changeId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason: `Cannot archive change "${changeId}" from state "${currentStatus}". Change must be in state "done" before archiving (or use --force).`,
      };
    }
  }

  // 2. Persist state change
  const now = new Date().toISOString();
  const existingState = (await readChangeState(change.path)) ?? {
    change_id: changeId,
    status: currentStatus,
  };

  existingState.status = targetStatus;
  if (targetStatus === "in-progress" && !existingState.started_at) {
    existingState.started_at = now;
  }
  if (targetStatus === "done") {
    existingState.completed_at = now;
  }

  await writeChangeState(change.path, existingState);

  // 3. Record metric event
  await recordMetricEvent(repoRoot, {
    type: "state_transition",
    changeId,
    fromState: currentStatus,
    toState: targetStatus,
    user: options.user,
    timestamp: now,
  });

  return {
    success: true,
    changeId,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    reason: `Change "${changeId}" successfully transitioned from "${currentStatus}" to "${targetStatus}".`,
  };
}
