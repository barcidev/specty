import path from "node:path";
import { logger } from "../../core/logger.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import {
  addTaskToChange,
  completeTaskInChange,
  getActiveChangeTask,
  listChangeTasks,
} from "../../governance/task-manager.js";

export interface TaskCommandOptions {
  cwd?: string;
  json?: boolean;
  files?: string;
  agent?: string;
  verify?: string;
  phase?: string;
}

export async function executeTaskNext(
  changeArg?: string,
  options: TaskCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const resolution = await resolveTargetChange(repoRoot, { changeId: changeArg });
  const changeId = resolution.resolvedId;

  if (!changeId) {
    logger.error("No active specification change specified or resolved from current branch.");
    if (resolution.reason) {
      logger.info(resolution.reason);
    }
    return false;
  }

  const activeTask = await getActiveChangeTask(repoRoot, changeId);

  if (options.json) {
    console.log(JSON.stringify({ changeId, activeTask }, null, 2));
    return true;
  }

  if (!activeTask) {
    logger.success(`All tasks in specification change "${changeId}" are completed.`);
    logger.info(`Run 'specty verify ${changeId}' to validate implementation evidence.`);
    return true;
  }

  logger.info(`Active Task for Change "${changeId}":`);
  logger.info(`  ID:          ${activeTask.id}`);
  logger.info(`  Description: ${activeTask.description}`);
  if (activeTask.role) {
    logger.info(`  Agent Role:  ${activeTask.role}`);
  }
  const scopeDesc =
    activeTask.filesGlobs.length > 0 ? activeTask.filesGlobs.join(", ") : "(unscoped)";
  logger.info(`  File Scope:  [files: ${scopeDesc}]`);
  if (activeTask.verifyCommand) {
    logger.info(`  Verify:      ${activeTask.verifyCommand}`);
  }

  return true;
}

export async function executeTaskList(
  changeArg?: string,
  options: TaskCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const resolution = await resolveTargetChange(repoRoot, { changeId: changeArg });
  const changeId = resolution.resolvedId;

  if (!changeId) {
    logger.error("No active specification change specified or resolved from current branch.");
    if (resolution.reason) {
      logger.info(resolution.reason);
    }
    return false;
  }

  const { tasks, activeTask } = await listChangeTasks(repoRoot, changeId);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          changeId,
          total: tasks.length,
          completed: tasks.filter((t) => t.completed).length,
          activeTaskId: activeTask?.id ?? null,
          tasks,
        },
        null,
        2,
      ),
    );
    return true;
  }

  logger.info(
    `Tasks for Change "${changeId}" (${tasks.filter((t) => t.completed).length}/${tasks.length}):\n`,
  );
  for (const t of tasks) {
    const icon = t.completed ? "✓" : t.id === activeTask?.id ? "▶" : "○";
    const statusLabel = t.completed ? "[done]" : t.id === activeTask?.id ? "[active]" : "[pending]";
    const filesDesc = t.filesGlobs.length > 0 ? ` [files: ${t.filesGlobs.join(", ")}]` : "";
    const roleDesc = t.role ? ` [agent: ${t.role}]` : "";
    console.log(`  ${icon} ${statusLabel} ${t.id} ${t.description}${roleDesc}${filesDesc}`);
  }

  return true;
}

export async function executeTaskAdd(
  description: string,
  changeArg?: string,
  options: TaskCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const resolution = await resolveTargetChange(repoRoot, { changeId: changeArg });
  const changeId = resolution.resolvedId;

  if (!changeId) {
    logger.error("No active specification change specified or resolved from current branch.");
    if (resolution.reason) {
      logger.info(resolution.reason);
    }
    return false;
  }

  const globs = options.files
    ? options.files
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const res = await addTaskToChange(repoRoot, changeId, {
    description,
    filesGlobs: globs,
    role: options.agent,
    verifyCommand: options.verify,
    phase: options.phase,
  });

  if (!res.success) {
    logger.error(res.error ?? "Failed to add task.");
    return false;
  }

  if (options.json) {
    console.log(JSON.stringify(res, null, 2));
    return true;
  }

  logger.success(`Task ${res.addedTaskId} added to change "${changeId}".`);
  logger.info(`  Description: ${res.description}`);
  if (res.role) {
    logger.info(`  Agent Role:  ${res.role}`);
  }
  const scopeDesc = res.filesGlobs.length > 0 ? res.filesGlobs.join(", ") : "(unscoped)";
  logger.info(`  File Scope:  [files: ${scopeDesc}]`);
  logger.warn(`\n⚠ Specification content hash invalidated (reapproval_required).`);
  logger.info(`Run 'specty approve ${changeId}' before implementing changes in code.`);

  return true;
}

export async function executeTaskComplete(
  taskId: string,
  changeArg?: string,
  options: TaskCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const resolution = await resolveTargetChange(repoRoot, { changeId: changeArg });
  const changeId = resolution.resolvedId;

  if (!changeId) {
    logger.error("No active specification change specified or resolved from current branch.");
    if (resolution.reason) {
      logger.info(resolution.reason);
    }
    return false;
  }

  const res = await completeTaskInChange(repoRoot, changeId, taskId);

  if (!res.success) {
    logger.error(res.error ?? `Failed to complete task "${taskId}".`);
    return false;
  }

  if (options.json) {
    console.log(JSON.stringify(res, null, 2));
    return true;
  }

  logger.success(`✓ Task ${res.completedTaskId} marked completed in change "${changeId}".`);
  if (res.allCompleted) {
    logger.info(`All tasks completed! Next step:`);
    logger.info(`  specty verify ${changeId}`);
  } else if (res.nextActiveTask) {
    logger.info(`Next Active Task: ${res.nextActiveTask.id} - ${res.nextActiveTask.description}`);
    const scope =
      res.nextActiveTask.filesGlobs.length > 0
        ? res.nextActiveTask.filesGlobs.join(", ")
        : "(unscoped)";
    logger.info(`  Allowed Scope: [files: ${scope}]`);
  }

  return true;
}
