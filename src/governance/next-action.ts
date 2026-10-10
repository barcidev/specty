import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { getCurrentBranch } from "../core/git.js";
import { readChangeState } from "../engines/change-state.js";
import { getSpecEngine } from "../engines/factory.js";
import { checkApprovalStatus } from "./approvals.js";
import {
  getActiveTask,
  getAllTasksFileGlobs,
  type ParsedTaskItem,
  parseTasksWithScope,
} from "./task-scope.js";

export type NextActionType =
  | "PLAN_NEW_SPEC"
  | "AWAIT_APPROVAL"
  | "EXECUTE_TASK"
  | "VERIFY_CHANGE"
  | "READY_TO_ARCHIVE";

export interface NextActionReport {
  actionType: NextActionType;
  changeId: string | null;
  changeStatus: string | null;
  activeTask: ParsedTaskItem | null;
  allowedFiles: string[];
  prescribedCommand: string;
  message: string;
  statusCard: string;
}

/**
 * Determines the single prescriptive next action for an AI assistant or developer,
 * anchoring the execution state and providing a compact anti-drift status card.
 */
export async function determineNextAction(
  repoRoot: string,
  changeIdArg?: string,
): Promise<NextActionReport> {
  let config;
  try {
    config = await loadConfig(repoRoot);
  } catch {
    const card = "[specty | change: none | status: uninitialized | next: specty init]";
    return {
      actionType: "PLAN_NEW_SPEC",
      changeId: null,
      changeStatus: "uninitialized",
      activeTask: null,
      allowedFiles: [],
      prescribedCommand: "specty init",
      message: "Repository is not initialized with specty. Run 'specty init' to set up governance.",
      statusCard: card,
    };
  }

  const engine = getSpecEngine(config.spec_engine);
  const allChanges = await engine.listChanges(repoRoot);
  const activeChanges = allChanges.filter((c) => !c.isArchived);

  // 1. Resolve target change
  let targetChange = changeIdArg ? activeChanges.find((c) => c.id === changeIdArg) : undefined;

  if (!targetChange && !changeIdArg) {
    // Try matching git branch: e.g. feature/my-change or my-change
    try {
      const currentBranch = await getCurrentBranch(repoRoot);
      if (currentBranch) {
        const branchSuffix = currentBranch.replace(/^(?:feature|fix|chore)\//, "");
        targetChange = activeChanges.find((c) => c.id === currentBranch || c.id === branchSuffix);
      }
    } catch {
      // ignore git branch error
    }

    // Fall back to first active change
    targetChange ??= activeChanges[0];
  }

  // State 1: No active change in repository
  if (!targetChange) {
    const card = "[specty | change: none | status: clean | next: specty openspec new <change>]";
    return {
      actionType: "PLAN_NEW_SPEC",
      changeId: null,
      changeStatus: null,
      activeTask: null,
      allowedFiles: [],
      prescribedCommand: "specty openspec new <change-id>",
      message:
        "No active specification change found. You must create a proposal and tasks before modifying source code.",
      statusCard: card,
    };
  }

  // Verify approval status
  const approval = await checkApprovalStatus(repoRoot, targetChange.id);

  // State 2: Change pending approval or re-approval required
  if (!approval.approved || approval.code === "reapproval_required") {
    const statusLabel =
      approval.code === "reapproval_required" ? "re-approval" : targetChange.status || "draft";
    const card = `[specty | change: ${targetChange.id} | status: ${statusLabel} | next: specty approve ${targetChange.id}]`;
    return {
      actionType: "AWAIT_APPROVAL",
      changeId: targetChange.id,
      changeStatus: statusLabel,
      activeTask: null,
      allowedFiles: [],
      prescribedCommand: `specty approve ${targetChange.id}`,
      message: `Change '${targetChange.id}' is pending human review (${approval.code}). Stop execution and request human approval. Do NOT edit code.`,
      statusCard: card,
    };
  }

  // Load and parse tasks.md
  const tasksPath = path.join(targetChange.path, "tasks.md");
  let tasksContent = "";
  try {
    tasksContent = await fs.readFile(tasksPath, "utf8");
  } catch {
    // No tasks file
  }

  const parsedTasks = parseTasksWithScope(tasksContent);
  const activeTask = getActiveTask(parsedTasks);

  // State 3: Active task pending implementation
  if (activeTask) {
    const allowedFiles =
      activeTask.filesGlobs.length > 0 ? activeTask.filesGlobs : getAllTasksFileGlobs(parsedTasks);
    const filesStr = allowedFiles.length > 0 ? allowedFiles.join(", ") : "none";
    const roleTag = activeTask.role ? ` (${activeTask.role})` : "";
    const nextCmd = activeTask.verifyCommand ?? `specty verify ${targetChange.id}`;
    const card = `[specty | change: ${targetChange.id} | status: approved | task: ${activeTask.id}${roleTag} | files: ${filesStr} | next: ${nextCmd}]`;

    return {
      actionType: "EXECUTE_TASK",
      changeId: targetChange.id,
      changeStatus: "approved",
      activeTask,
      allowedFiles,
      prescribedCommand: nextCmd,
      message: `Execute task ${activeTask.id}${roleTag}: "${activeTask.description}". Only modify files matching [files: ${filesStr}].`,
      statusCard: card,
    };
  }

  // Check verification state
  const changeState = await readChangeState(targetChange.path);
  const isVerified = changeState?.verification_passed === true;

  // State 4: All tasks complete, verification pending
  if (!isVerified) {
    const card = `[specty | change: ${targetChange.id} | status: verifying | next: specty verify ${targetChange.id}]`;
    return {
      actionType: "VERIFY_CHANGE",
      changeId: targetChange.id,
      changeStatus: "verifying",
      activeTask: null,
      allowedFiles: [],
      prescribedCommand: `specty verify ${targetChange.id}`,
      message: `All tasks for change '${targetChange.id}' are marked completed. Run verification commands to produce evidence.`,
      statusCard: card,
    };
  }

  // State 5: All tasks complete and verification passed -> ready to archive / open PR
  const card = `[specty | change: ${targetChange.id} | status: verified | next: specty openspec archive ${targetChange.id}]`;
  return {
    actionType: "READY_TO_ARCHIVE",
    changeId: targetChange.id,
    changeStatus: "verified",
    activeTask: null,
    allowedFiles: [],
    prescribedCommand: `specty openspec archive ${targetChange.id}`,
    message: `Verification passed for change '${targetChange.id}'. Proceed to archive change or open a pull request.`,
    statusCard: card,
  };
}
