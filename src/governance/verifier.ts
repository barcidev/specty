import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { executeCommand } from "../core/exec.js";
import { getHeadCommitSha } from "../core/git.js";
import { readChangeState, writeChangeState } from "../engines/change-state.js";
import { getSpecEngine } from "../engines/factory.js";
import { recordMetricEvent } from "../metrics/recorder.js";

export interface TaskVerificationItem {
  id: string;
  description: string;
  command: string;
  completed: boolean;
}

export interface TaskVerifyResult {
  taskId: string;
  description: string;
  command: string;
  passed: boolean;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
}

export interface StackVerifyResult {
  scope: string;
  commandType: string;
  command: string;
  passed: boolean;
  exitCode: number;
  durationMs: number;
  outputHash: string;
  stdout: string;
  stderr: string;
}

export interface VerificationReport {
  timestamp: string;
  commitSha: string | null;
  changeId: string | null;
  passed: boolean;
  totalTasks: number;
  totalStackCommands: number;
  tasksResults: TaskVerifyResult[];
  stackResults: StackVerifyResult[];
}

export interface VerificationOptions {
  changeId?: string;
  scope?: string;
  commandType?: string;
  tasksOnly?: boolean;
  stackOnly?: boolean;
  strict?: boolean;
}

/**
 * Parses markdown tasks.md content to extract tasks and their associated verify: commands.
 */
export function parseTaskVerificationCommands(tasksContent: string): TaskVerificationItem[] {
  const items: TaskVerificationItem[] = [];
  const lines = tasksContent.split("\n");
  const checkboxRegex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const match = line.match(checkboxRegex);
    if (!match) continue;

    const completed = (match[1] ?? "").toLowerCase() === "x";
    const rawDescription = (match[2] ?? "").trim();

    // Look for ID in description (e.g., "1.1 Task name" or index fallback)
    const idMatch = rawDescription.match(/^(\d+(?:\.\d+)*)\s+/);
    const taskId = idMatch ? (idMatch[1] ?? `${items.length + 1}`) : `${items.length + 1}`;

    // Look for verification command on subsequent lines before next item/header
    let verifyCmd: string | null = null;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const nextLine = lines[j] ?? "";
      const verifyMatch = nextLine.match(/^\s+verify:\s*(\S.*)$/i);
      if (verifyMatch) {
        verifyCmd = (verifyMatch[1] ?? "").trim();
        break;
      }
      if (/^\s*-\s*\[/i.test(nextLine) || /^##/i.test(nextLine)) {
        break;
      }
    }

    if (verifyCmd) {
      items.push({
        id: taskId,
        description: rawDescription,
        command: verifyCmd,
        completed,
      });
    }
  }

  return items;
}

/**
 * Computes sha256 hash of output string.
 */
function hashOutput(output: string): string {
  return crypto.createHash("sha256").update(output, "utf8").digest("hex");
}

/**
 * Executes stack and task verification commands, records metrics, and saves verification.json.
 */
export async function executeVerification(
  repoRoot: string,
  options: VerificationOptions = {},
): Promise<VerificationReport> {
  const config = await loadConfig(repoRoot);
  const commitSha = await getHeadCommitSha(repoRoot);
  const engine = getSpecEngine(config.spec_engine);

  let targetChangeId: string | null = options.changeId?.trim() || null;
  let targetChangeDir: string | null = null;

  if (targetChangeId) {
    const ch = await engine.getChange(repoRoot, targetChangeId);
    if (ch) {
      targetChangeDir = ch.path;
    } else {
      // Fallback path if engine didn't find metadata
      targetChangeDir = path.join(repoRoot, "openspec", "changes", targetChangeId);
    }
  } else {
    // If no changeId provided, see if there is an active change
    const changes = await engine.listChanges(repoRoot);
    if (changes.length > 0) {
      const active =
        changes.find(
          (c) => c.status === "in-progress" || c.status === "approved" || c.status === "review",
        ) ?? changes[0];
      if (active) {
        targetChangeId = active.id;
        targetChangeDir = active.path;
      }
    }
  }

  const stackResults: StackVerifyResult[] = [];
  const tasksResults: TaskVerifyResult[] = [];

  // 1. Stack verification commands
  if (!options.tasksOnly) {
    const targetScopes = options.scope
      ? config.scopes.filter(
          (s) => s.path === options.scope || path.basename(s.path) === options.scope,
        )
      : config.scopes;

    for (const scope of targetScopes) {
      const verifyMap = scope.verify ?? {};
      for (const [key, cmd] of Object.entries(verifyMap)) {
        if (!cmd) continue;
        if (options.commandType && options.commandType !== "all" && options.commandType !== key) {
          continue;
        }

        const scopeCwd = path.resolve(repoRoot, scope.path);
        const runRes = await executeCommand(cmd, {
          cwd: scopeCwd,
          silent: true,
        });

        const fullOutput = `${runRes.stdout}\n${runRes.stderr}`.trim();
        const outputHash = hashOutput(fullOutput);

        stackResults.push({
          scope: scope.path,
          commandType: key,
          command: cmd,
          passed: runRes.success,
          exitCode: runRes.exitCode,
          durationMs: runRes.durationMs,
          outputHash,
          stdout: runRes.stdout,
          stderr: runRes.stderr,
        });

        await recordMetricEvent(repoRoot, {
          type: "verification_run",
          scope: scope.path,
          commandType: key,
          command: cmd,
          exitCode: runRes.exitCode,
          durationMs: runRes.durationMs,
          success: runRes.success,
        });
      }
    }
  }

  // 2. Task verification commands
  if (!options.stackOnly && targetChangeDir) {
    const tasksPath = path.join(targetChangeDir, "tasks.md");
    try {
      const tasksContent = await fs.readFile(tasksPath, "utf8");
      const taskItems = parseTaskVerificationCommands(tasksContent);

      for (const item of taskItems) {
        const runRes = await executeCommand(item.command, {
          cwd: repoRoot,
          silent: true,
        });

        tasksResults.push({
          taskId: item.id,
          description: item.description,
          command: item.command,
          passed: runRes.success,
          exitCode: runRes.exitCode,
          durationMs: runRes.durationMs,
          stdout: runRes.stdout,
          stderr: runRes.stderr,
        });

        await recordMetricEvent(repoRoot, {
          type: "verification_run",
          scope: targetChangeId || ".",
          commandType: "task_verify",
          command: item.command,
          exitCode: runRes.exitCode,
          durationMs: runRes.durationMs,
          success: runRes.success,
        });
      }
    } catch {
      // tasks.md may not exist or not be readable; continue
    }
  }

  const allStackPassed = stackResults.every((r) => r.passed);
  const allTasksPassed = tasksResults.every((r) => r.passed);
  const overallPassed = allStackPassed && allTasksPassed;

  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    commitSha,
    changeId: targetChangeId,
    passed: overallPassed,
    totalTasks: tasksResults.length,
    totalStackCommands: stackResults.length,
    tasksResults,
    stackResults,
  };

  // 3. Persist verification.json evidence
  const evidenceContent = JSON.stringify(report, null, 2);
  if (targetChangeDir) {
    try {
      await fs.mkdir(targetChangeDir, { recursive: true });
      await fs.writeFile(path.join(targetChangeDir, "verification.json"), evidenceContent, "utf8");

      // Update ChangeState in specty.yaml
      const state = await readChangeState(targetChangeDir);
      if (state) {
        state.verification_passed = overallPassed;
        await writeChangeState(targetChangeDir, state);
      }
    } catch {
      // Ignore write errors if directory not writable
    }
  } else {
    try {
      const spectyDir = path.join(repoRoot, ".specty");
      await fs.mkdir(spectyDir, { recursive: true });
      await fs.writeFile(path.join(spectyDir, "verification.json"), evidenceContent, "utf8");
    } catch {
      // ignore
    }
  }

  return report;
}
