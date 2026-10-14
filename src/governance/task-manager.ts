import fs from "node:fs/promises";
import path from "node:path";
import { createDefaultConfig, loadConfig, type SpectyConfig } from "../core/config.js";
import { readChangeState, writeChangeState } from "../engines/change-state.js";
import { getSpecEngine } from "../engines/factory.js";
import type { ChangeStatus } from "../engines/types.js";
import { getActiveTask, type ParsedTaskItem, parseTasksWithScope } from "./task-scope.js";

export interface AddTaskOptions {
  description: string;
  filesGlobs?: string[];
  role?: string;
  verifyCommand?: string;
  phase?: string;
}

export interface AddTaskResult {
  success: boolean;
  changeId: string;
  addedTaskId: string;
  description: string;
  filesGlobs: string[];
  role: string | null;
  verifyCommand: string | null;
  tasksFilePath: string;
  newTotalTasks: number;
  status: "reapproval_required";
  advice: string;
  error?: string;
}

export interface CompleteTaskResult {
  success: boolean;
  changeId: string;
  completedTaskId: string;
  allCompleted: boolean;
  nextActiveTask: ParsedTaskItem | null;
  remainingCount: number;
  advice: string;
  error?: string;
}

/**
 * Lists all tasks in a change's tasks.md file.
 */
export async function listChangeTasks(
  repoRoot: string,
  changeId: string,
): Promise<{ tasks: ParsedTaskItem[]; activeTask: ParsedTaskItem | null; tasksFilePath: string }> {
  let config: SpectyConfig;
  try {
    config = await loadConfig(repoRoot);
  } catch {
    config = createDefaultConfig();
  }
  const engine = getSpecEngine(config.spec_engine);
  const change = await engine.getChange(repoRoot, changeId);
  if (!change) {
    throw new Error(`Specification change "${changeId}" not found.`);
  }

  const tasksFilePath = path.join(change.path, "tasks.md");
  let content = "";
  try {
    content = await fs.readFile(tasksFilePath, "utf8");
  } catch {
    throw new Error(`tasks.md not found for change "${changeId}".`);
  }

  const tasks = parseTasksWithScope(content);
  const activeTask = getActiveTask(tasks);
  return { tasks, activeTask, tasksFilePath };
}

/**
 * Returns the active incomplete task for a change.
 */
export async function getActiveChangeTask(
  repoRoot: string,
  changeId: string,
): Promise<ParsedTaskItem | null> {
  const { activeTask } = await listChangeTasks(repoRoot, changeId);
  return activeTask;
}

/**
 * Deterministically adds a new task item to tasks.md, updating scope and invalidating approval.
 */
export async function addTaskToChange(
  repoRoot: string,
  changeId: string,
  options: AddTaskOptions,
): Promise<AddTaskResult> {
  let config: SpectyConfig;
  try {
    config = await loadConfig(repoRoot);
  } catch {
    config = createDefaultConfig();
  }
  const engine = getSpecEngine(config.spec_engine);
  const change = await engine.getChange(repoRoot, changeId);
  if (!change) {
    return {
      success: false,
      changeId,
      addedTaskId: "",
      description: options.description,
      filesGlobs: options.filesGlobs ?? [],
      role: options.role ?? null,
      verifyCommand: options.verifyCommand ?? null,
      tasksFilePath: "",
      newTotalTasks: 0,
      status: "reapproval_required",
      advice: "",
      error: `Specification change "${changeId}" not found.`,
    };
  }

  const tasksFilePath = path.join(change.path, "tasks.md");
  let content = "";
  try {
    content = await fs.readFile(tasksFilePath, "utf8");
  } catch {
    // If tasks.md doesn't exist yet, bootstrap header
    content = `# Tasks: ${change.title ?? changeId}\n\n`;
  }

  const existingTasks = parseTasksWithScope(content);

  // Compute next task identifier and target phase
  const { taskId, updatedContent } = insertTaskIntoMarkdown(content, existingTasks, options);

  await fs.writeFile(tasksFilePath, updatedContent, "utf8");

  // If change was in verifying or done, transition state to review
  try {
    const state = await readChangeState(change.path);
    if (state && (state.status === "verifying" || state.status === "done")) {
      await writeChangeState(change.path, {
        ...state,
        status: "review" as ChangeStatus,
      });
    }
  } catch {
    // ignore state update error
  }

  const newTasks = parseTasksWithScope(updatedContent);

  return {
    success: true,
    changeId,
    addedTaskId: taskId,
    description: options.description,
    filesGlobs: options.filesGlobs ?? [],
    role: options.role ?? null,
    verifyCommand: options.verifyCommand ?? null,
    tasksFilePath,
    newTotalTasks: newTasks.length,
    status: "reapproval_required",
    advice: `Task ${taskId} added to ${changeId}. Human re-approval is required: run 'specty approve ${changeId}' before implementing.`,
  };
}

/**
 * Marks a specific task as completed in tasks.md without corrupting formatting.
 */
export async function completeTaskInChange(
  repoRoot: string,
  changeId: string,
  taskId: string,
): Promise<CompleteTaskResult> {
  let config: SpectyConfig;
  try {
    config = await loadConfig(repoRoot);
  } catch {
    config = createDefaultConfig();
  }
  const engine = getSpecEngine(config.spec_engine);
  const change = await engine.getChange(repoRoot, changeId);
  if (!change) {
    return {
      success: false,
      changeId,
      completedTaskId: taskId,
      allCompleted: false,
      nextActiveTask: null,
      remainingCount: 0,
      advice: "",
      error: `Specification change "${changeId}" not found.`,
    };
  }

  const tasksFilePath = path.join(change.path, "tasks.md");
  let content = "";
  try {
    content = await fs.readFile(tasksFilePath, "utf8");
  } catch {
    return {
      success: false,
      changeId,
      completedTaskId: taskId,
      allCompleted: false,
      nextActiveTask: null,
      remainingCount: 0,
      advice: "",
      error: `tasks.md file not found for change "${changeId}".`,
    };
  }

  const parsed = parseTasksWithScope(content);
  const target = parsed.find((t) => t.id === taskId || t.id === taskId.replace(/^#/, ""));

  if (!target) {
    return {
      success: false,
      changeId,
      completedTaskId: taskId,
      allCompleted: false,
      nextActiveTask: getActiveTask(parsed),
      remainingCount: parsed.filter((t) => !t.completed).length,
      advice: "",
      error: `Task with ID "${taskId}" not found in tasks.md for change "${changeId}".`,
    };
  }

  if (target.completed) {
    const remaining = parsed.filter((t) => !t.completed);
    return {
      success: true,
      changeId,
      completedTaskId: target.id,
      allCompleted: remaining.length === 0,
      nextActiveTask: getActiveTask(parsed),
      remainingCount: remaining.length,
      advice: `Task ${target.id} was already marked completed.`,
    };
  }

  // Replace "- [ ]" with "- [x]" precisely on the target task line
  const lines = content.split("\n");
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const checkboxMatch = line.match(/^(\s*-\s*\[)\s*(\]\s*)(.*)$/);
    if (!checkboxMatch) continue;

    const rest = checkboxMatch[3] ?? "";
    // Check if line matches taskId or description
    const idMatch = rest.match(/^(\d+(?:\.\d+)*)\s+/);
    const lineId = idMatch ? idMatch[1] : null;

    if (lineId === target.id || rest.includes(target.description)) {
      lines[i] = `${checkboxMatch[1]}x${checkboxMatch[2]}${rest}`;
      modified = true;
      break;
    }
  }

  if (!modified) {
    return {
      success: false,
      changeId,
      completedTaskId: taskId,
      allCompleted: false,
      nextActiveTask: getActiveTask(parsed),
      remainingCount: parsed.filter((t) => !t.completed).length,
      advice: "",
      error: `Could not locate uncompleted checkbox for task "${taskId}".`,
    };
  }

  const updatedContent = lines.join("\n");
  await fs.writeFile(tasksFilePath, updatedContent, "utf8");

  const updatedTasks = parseTasksWithScope(updatedContent);
  const incomplete = updatedTasks.filter((t) => !t.completed);
  const allCompleted = incomplete.length === 0;
  const nextTask = allCompleted ? null : (incomplete[0] ?? null);

  // If all completed, update change state to verifying
  if (allCompleted) {
    try {
      const state = await readChangeState(change.path);
      if (state && state.status === "in-progress") {
        await writeChangeState(change.path, {
          ...state,
          status: "verifying" as ChangeStatus,
        });
      }
    } catch {
      // ignore state update error
    }
  }

  const advice = allCompleted
    ? `All tasks in ${changeId} are completed! Next: execute 'specty verify ${changeId}' to validate implementation evidence.`
    : `Task ${target.id} completed. Next active task: ${nextTask?.id} - ${nextTask?.description}`;

  return {
    success: true,
    changeId,
    completedTaskId: target.id,
    allCompleted,
    nextActiveTask: nextTask,
    remainingCount: incomplete.length,
    advice,
  };
}

/**
 * Inserts a new task item into markdown content with proper numbering and section headers.
 */
function insertTaskIntoMarkdown(
  content: string,
  existingTasks: ParsedTaskItem[],
  options: AddTaskOptions,
): { taskId: string; updatedContent: string } {
  // Determine next task number
  let major = 1;
  let minor = 1;

  if (existingTasks.length > 0) {
    const lastTask = existingTasks[existingTasks.length - 1];
    if (lastTask) {
      const parts = lastTask.id.split(".").map((n) => Number.parseInt(n, 10));
      const p0 = parts[0];
      const p1 = parts[1];
      if (
        typeof p0 === "number" &&
        !Number.isNaN(p0) &&
        typeof p1 === "number" &&
        !Number.isNaN(p1)
      ) {
        major = p0;
        minor = p1 + 1;
      } else if (typeof p0 === "number" && !Number.isNaN(p0)) {
        major = p0;
        minor = 1;
      } else {
        minor = existingTasks.length + 1;
      }
    }
  }

  const taskId = `${major}.${minor}`;

  // Build task lines
  const roleTag = options.role ? `  [agent: ${options.role.toLowerCase()}]` : "";
  const filesTag =
    options.filesGlobs && options.filesGlobs.length > 0
      ? ` [files: ${options.filesGlobs.join(", ")}]`
      : "";

  let taskBlock = `- [ ] ${taskId} ${options.description.trim()}${roleTag}${filesTag}`;
  if (options.verifyCommand) {
    taskBlock += `\n      verify: ${options.verifyCommand.trim()}`;
  }

  // Look for target phase header or append
  const trimmed = content.trimEnd();

  if (options.phase) {
    const phaseHeaderRegex = new RegExp(`^##\\s+.*${escapeRegex(options.phase)}.*$`, "im");
    const match = trimmed.match(phaseHeaderRegex);
    if (match && match.index !== undefined) {
      const insertIndex = match.index + match[0].length;
      const updated = `${trimmed.slice(0, insertIndex)}\n${taskBlock}${trimmed.slice(insertIndex)}\n`;
      return { taskId, updatedContent: updated };
    }
    // Add new phase header if not found
    const updated = `${trimmed}\n\n## ${options.phase}\n${taskBlock}\n`;
    return { taskId, updatedContent: updated };
  }

  // If all existing tasks are completed and we have tasks, create an Adjustments section
  const allCompleted = existingTasks.length > 0 && existingTasks.every((t) => t.completed);
  if (allCompleted) {
    const nextPhaseNum = major + 1;
    const adjustmentTaskId = `${nextPhaseNum}.1`;
    let adjustmentBlock = `- [ ] ${adjustmentTaskId} ${options.description.trim()}${roleTag}${filesTag}`;
    if (options.verifyCommand) {
      adjustmentBlock += `\n      verify: ${options.verifyCommand.trim()}`;
    }
    const updated = `${trimmed}\n\n## ${nextPhaseNum}. Ajustes y Refinamiento\n${adjustmentBlock}\n`;
    return { taskId: adjustmentTaskId, updatedContent: updated };
  }

  // Standard append to end of file
  const updated = `${trimmed}\n${taskBlock}\n`;
  return { taskId, updatedContent: updated };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
