import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { getSpecEngine } from "../engines/factory.js";
import { checkApprovalStatus } from "./approvals.js";
import {
  getActiveTask,
  getAllTasksFileGlobs,
  isPathMatchingGlobs,
  normalizeRelativePath,
  parseTasksWithScope,
} from "./task-scope.js";

export interface GuardInput {
  toolName?: string;
  filePath?: string;
  command?: string;
  changeId?: string;
}

export interface GuardDecision {
  allowed: boolean;
  code:
    | "ALLOWED"
    | "BASH_FORBIDDEN_COMMAND"
    | "PROTECTED_GOVERNANCE_FILE"
    | "NO_ACTIVE_CHANGE"
    | "CHANGE_NOT_APPROVED"
    | "ALL_TASKS_COMPLETED"
    | "OUT_OF_SCOPE";
  reason?: string;
  actionAdvice?: string;
  activeTaskId?: string;
  allowedFiles?: string[];
}

const PROTECTED_FILE_PATTERNS = [
  ".specty/config.yaml",
  "specty.yaml",
  ".specty/audit/**",
  ".git/hooks/**",
  ".claude/settings.json",
];

const FORBIDDEN_BASH_PATTERNS = [
  {
    regex: /\bspecty\s+approve\b/i,
    reason: "Autonomous approval attempt denied. specty approve requires human verification.",
  },
  {
    regex: /\bSPECTY_BYPASS\s*=/i,
    reason: "Direct environment bypass denied. Bypasses cannot be initiated by an agent.",
  },
  {
    regex: /\bSPECTY_HOOK_DISABLED\s*=/i,
    reason: "Direct hook disabling denied. Bypasses cannot be initiated by an agent.",
  },
  {
    regex: /--no-verify\b/i,
    reason: "Bypassing git hooks via --no-verify is prohibited.",
  },
  {
    regex: /core\.hooksPath/i,
    reason: "Modifying git hooks configuration is prohibited.",
  },
];

const EDIT_TOOLS = new Set([
  "edit",
  "write",
  "multiedit",
  "notebookedit",
  "str_replace_editor",
  "create_file",
  "replace_file_content",
  "multi_replace_file_content",
  "write_to_file",
]);

const BASH_TOOLS = new Set(["bash", "sh", "terminal", "run_command", "execute_command"]);

/**
 * Parses raw JSON payload received from IDE hooks (e.g. Claude Code stdin) into normalized GuardInput.
 */
export function parseGuardPayload(payload: unknown): GuardInput {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const p = payload as Record<string, unknown>;
  const toolName =
    typeof p.tool_name === "string" ? p.tool_name : typeof p.tool === "string" ? p.tool : undefined;

  const toolInput =
    p.tool_input && typeof p.tool_input === "object"
      ? (p.tool_input as Record<string, unknown>)
      : p;

  const filePath =
    typeof toolInput.file_path === "string"
      ? toolInput.file_path
      : typeof toolInput.path === "string"
        ? toolInput.path
        : typeof toolInput.file === "string"
          ? toolInput.file
          : typeof toolInput.TargetFile === "string"
            ? toolInput.TargetFile
            : undefined;

  const command =
    typeof toolInput.command === "string"
      ? toolInput.command
      : typeof toolInput.cmd === "string"
        ? toolInput.cmd
        : typeof toolInput.CommandLine === "string"
          ? toolInput.CommandLine
          : undefined;

  return {
    toolName,
    filePath,
    command,
  };
}

/**
 * Evaluates whether a proposed tool call or execution should be allowed or blocked under hard governance rules.
 */
export async function evaluateGuard(repoRoot: string, input: GuardInput): Promise<GuardDecision> {
  const toolLower = (input.toolName ?? "").toLowerCase();

  // 1. Evaluate Bash Commands
  if (BASH_TOOLS.has(toolLower) || (!input.toolName && input.command)) {
    const cmd = input.command ?? "";
    for (const forbidden of FORBIDDEN_BASH_PATTERNS) {
      if (forbidden.regex.test(cmd)) {
        return {
          allowed: false,
          code: "BASH_FORBIDDEN_COMMAND",
          reason: forbidden.reason,
          actionAdvice: "Request human intervention to execute this operation.",
        };
      }
    }
    // Non-forbidden bash command
    return {
      allowed: true,
      code: "ALLOWED",
    };
  }

  // 2. Evaluate File Edits
  if (EDIT_TOOLS.has(toolLower) || (!input.toolName && input.filePath)) {
    if (!input.filePath) {
      return { allowed: true, code: "ALLOWED" };
    }

    const relPath = normalizeRelativePath(
      path.isAbsolute(input.filePath) ? path.relative(repoRoot, input.filePath) : input.filePath,
    );

    // 2.1 Check Protected Files (Anti-tampering)
    if (isPathMatchingGlobs(relPath, PROTECTED_FILE_PATTERNS)) {
      return {
        allowed: false,
        code: "PROTECTED_GOVERNANCE_FILE",
        reason: `Cannot modify protected governance file '${relPath}'.`,
        actionAdvice:
          "Governance configuration and audit files can only be altered by repository administrators.",
      };
    }

    // Load specty config
    let config;
    try {
      config = await loadConfig(repoRoot);
    } catch {
      // Repository not initialized with specty
      return {
        allowed: true,
        code: "ALLOWED",
      };
    }

    // 2.2 Check Exempt Files (specs, documentation, tasks)
    const exemptGlobs = config.governance.exempt_paths ?? [
      "**/*.md",
      "openspec/**",
      ".specty/**",
      "docs/**",
    ];
    if (isPathMatchingGlobs(relPath, exemptGlobs)) {
      return {
        allowed: true,
        code: "ALLOWED",
      };
    }

    // 2.3 Check if file falls under governed source paths
    const sourceGlobs = config.governance.source_paths ?? ["src/**"];
    const isSourceFile = isPathMatchingGlobs(relPath, sourceGlobs);

    // If it's not source code and not protected, allow it (e.g. general configs like .gitignore)
    if (!isSourceFile) {
      return {
        allowed: true,
        code: "ALLOWED",
      };
    }

    // 2.4 It is a source file! Require approved change and valid task scope
    const engine = getSpecEngine(config.spec_engine);
    const changes = await engine.listChanges(repoRoot);

    const activeChanges = changes.filter((c) => !c.isArchived);
    if (activeChanges.length === 0) {
      return {
        allowed: false,
        code: "NO_ACTIVE_CHANGE",
        reason: `Cannot edit source file '${relPath}'. No active specification change found in repository.`,
        actionAdvice:
          "Run 'specty openspec new <change>' to create a specification proposal before modifying code.",
      };
    }

    // Pick active change (targeted or first active)
    const targetChange = input.changeId
      ? activeChanges.find((c) => c.id === input.changeId)
      : activeChanges[0];

    if (!targetChange) {
      return {
        allowed: false,
        code: "NO_ACTIVE_CHANGE",
        reason: `Specified change '${input.changeId}' was not found.`,
        actionAdvice: "Run 'specty status' to view active changes.",
      };
    }

    // Verify approval status
    const approval = await checkApprovalStatus(repoRoot, targetChange.id);
    if (!approval.approved || approval.code === "reapproval_required") {
      return {
        allowed: false,
        code: "CHANGE_NOT_APPROVED",
        reason: `Cannot edit source file '${relPath}'. Active change '${targetChange.id}' has status '${targetChange.status}' (${approval.code}).`,
        actionAdvice: `Stop and request human approval by running 'specty approve ${targetChange.id}'.`,
      };
    }

    // Read tasks.md and check active task scope
    const tasksPath = path.join(targetChange.path, "tasks.md");
    let tasksContent = "";
    try {
      tasksContent = await fs.readFile(tasksPath, "utf8");
    } catch {
      // If no tasks.md exists, fall back to checking approval
      return { allowed: true, code: "ALLOWED" };
    }

    const parsedTasks = parseTasksWithScope(tasksContent);
    const activeTask = getActiveTask(parsedTasks);

    if (!activeTask) {
      return {
        allowed: false,
        code: "ALL_TASKS_COMPLETED",
        reason: `Cannot edit source file '${relPath}'. All tasks in change '${targetChange.id}' are marked completed.`,
        actionAdvice: `Execute 'specty verify ${targetChange.id}' to confirm implementation evidence.`,
      };
    }

    // Check if relPath matches active task files scope
    const allowedGlobs =
      activeTask.filesGlobs.length > 0 ? activeTask.filesGlobs : getAllTasksFileGlobs(parsedTasks);

    if (allowedGlobs.length > 0 && !isPathMatchingGlobs(relPath, allowedGlobs)) {
      return {
        allowed: false,
        code: "OUT_OF_SCOPE",
        activeTaskId: activeTask.id,
        allowedFiles: allowedGlobs,
        reason: `Cannot edit '${relPath}'. File is outside the active task ${activeTask.id} scope: [files: ${allowedGlobs.join(", ")}].`,
        actionAdvice: `Only edit files matching [files: ${allowedGlobs.join(", ")}] or amend the change specification.`,
      };
    }

    return {
      allowed: true,
      code: "ALLOWED",
      activeTaskId: activeTask.id,
      allowedFiles: allowedGlobs,
    };
  }

  // Any other read-only tool is allowed by default
  return {
    allowed: true,
    code: "ALLOWED",
  };
}
