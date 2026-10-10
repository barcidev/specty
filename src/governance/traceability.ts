import fs from "node:fs/promises";
import path from "node:path";
import { executeFile } from "../core/exec.js";
import { readChangeState } from "../engines/change-state.js";
import { isPathMatchingGlobs, parseTasksWithScope } from "./task-scope.js";
import type { VerificationReport } from "./verifier.js";

export interface RequirementTrace {
  id: string;
  title: string;
  tasks: TaskTrace[];
}

export interface TaskTrace {
  id: string;
  description: string;
  agentRole?: string;
  allowedFiles: string[];
  completed: boolean;
  commits: CommitTrace[];
  verification?: VerificationTrace;
}

export interface CommitTrace {
  sha: string;
  shortSha: string;
  author: string;
  message: string;
  filesModified: string[];
  isBypassed: boolean;
}

export interface VerificationTrace {
  command: string;
  exitCode: number;
  success: boolean;
  commitSha?: string;
  stdoutHash?: string;
  executedAt?: string;
}

export interface TraceabilityMatrix {
  changeId: string;
  title?: string;
  status: string;
  approvedHash?: string;
  requirements: RequirementTrace[];
  orphanCommits: CommitTrace[];
  overallCompliance: number;
  stats: {
    totalTasks: number;
    completedTasks: number;
    verifiedTasks: number;
    linkedCommitsCount: number;
    orphanCommitsCount: number;
  };
}

export interface BuildTraceabilityOptions {
  baseRef?: string;
  headRef?: string;
  taskTrailerKey?: string;
}

export async function buildTraceabilityMatrix(
  repoRoot: string,
  changeId: string,
  options: BuildTraceabilityOptions = {},
): Promise<TraceabilityMatrix> {
  const changeDir = path.join(repoRoot, "openspec", "changes", changeId);

  let proposalContent = "";
  let tasksContent = "";
  try {
    proposalContent = await fs.readFile(path.join(changeDir, "proposal.md"), "utf8");
  } catch {
    // proposal optional
  }
  try {
    tasksContent = await fs.readFile(path.join(changeDir, "tasks.md"), "utf8");
  } catch {
    // tasks optional
  }

  const state = await readChangeState(changeDir).catch(() => null);
  const status = state?.status ?? "draft";
  const approvedHash = state?.content_hash;

  // Extract change title from proposal
  const titleMatch = proposalContent.match(/^#\s+(?:Proposal:?\s*)?(.*)$/m);
  const title = titleMatch?.[1]?.trim() || changeId;

  // Parse tasks
  const parsedTasks = parseTasksWithScope(tasksContent);
  const taskTraces: TaskTrace[] = parsedTasks.map((t) => ({
    id: t.id,
    description: t.description,
    agentRole: t.role ?? undefined,
    allowedFiles: t.filesGlobs,
    completed: t.completed,
    commits: [],
  }));

  // Read git commits
  const taskTrailer = options.taskTrailerKey ?? "Specty-Task";
  const logRange = options.baseRef ? `${options.baseRef}...${options.headRef ?? "HEAD"}` : "-20";

  const allCommits: CommitTrace[] = [];
  try {
    const logRes = await executeFile(
      "git",
      ["log", logRange, "--format=%H%x00%h%x00%an%x00%B%x1e"],
      { cwd: repoRoot, silent: true },
    );

    const logEntries = logRes.stdout.split("\x1e").filter((l) => l.trim().length > 0);
    for (const entry of logEntries) {
      const parts = entry.split("\0");
      if (parts.length >= 4) {
        const sha = parts[0]?.trim() || "";
        const shortSha = parts[1]?.trim() || "";
        const author = parts[2]?.trim() || "";
        const message = parts[3]?.trim() || "";

        // Get files modified in commit
        let filesModified: string[] = [];
        try {
          const diffRes = await executeFile(
            "git",
            ["diff-tree", "--no-commit-id", "--name-only", "-r", sha],
            { cwd: repoRoot, silent: true },
          );
          filesModified = diffRes.stdout
            .split("\n")
            .map((f) => f.trim().replace(/\\/g, "/"))
            .filter(Boolean);
        } catch {
          // non-fatal
        }

        const isBypassed =
          message.toLowerCase().includes("specty-bypass:") ||
          message.toLowerCase().includes("bypass");

        allCommits.push({
          sha,
          shortSha,
          author,
          message,
          filesModified,
          isBypassed,
        });
      }
    }
  } catch {
    // Non-fatal git log error
  }

  // Associate commits with tasks
  const orphanCommits: CommitTrace[] = [];
  for (const commit of allCommits) {
    let linked = false;

    // 1. Direct trailer or commit message reference (e.g. Specty-Task: 1.1 or [task: 1.1])
    for (const task of taskTraces) {
      const trailerMatch = new RegExp(`${taskTrailer}:\\s*${task.id}\\b`, "i").test(commit.message);
      const tagMatch = new RegExp(`\\[(?:task|tarea):\\s*${task.id}\\]`, "i").test(commit.message);

      if (trailerMatch || tagMatch) {
        task.commits.push(commit);
        linked = true;
        break;
      }
    }

    // 2. File scope matching if not explicitly tagged
    if (!linked && commit.filesModified.length > 0) {
      for (const task of taskTraces) {
        if (task.allowedFiles.length > 0) {
          const touchesTaskScope = commit.filesModified.some((f) =>
            isPathMatchingGlobs(f, task.allowedFiles),
          );
          if (touchesTaskScope) {
            task.commits.push(commit);
            linked = true;
            break;
          }
        }
      }
    }

    if (!linked && commit.filesModified.length > 0) {
      orphanCommits.push(commit);
    }
  }

  // Read verification report if present
  const verifyPath = path.join(changeDir, "verification.json");
  let verifyReport: VerificationReport | null = null;
  try {
    const rawVerify = await fs.readFile(verifyPath, "utf8");
    verifyReport = JSON.parse(rawVerify);
  } catch {
    // verification.json optional
  }

  if (verifyReport) {
    for (const task of taskTraces) {
      const taskResult = verifyReport.tasksResults?.find(
        (tr) => tr.taskId === task.id || tr.description === task.description,
      );
      if (taskResult) {
        task.verification = {
          command: taskResult.command,
          exitCode: taskResult.exitCode,
          success: taskResult.passed,
          commitSha: verifyReport.commitSha ?? undefined,
          executedAt: verifyReport.timestamp,
        };
      }
    }
  }

  // Group into requirements
  const requirements: RequirementTrace[] = [];
  const reqSections = parseProposalRequirementSections(proposalContent);

  if (reqSections.length > 0) {
    for (let i = 0; i < reqSections.length; i++) {
      const sec = reqSections[i];
      if (!sec) continue;
      requirements.push({
        id: `REQ-${i + 1}`,
        title: sec.title,
        tasks: i === 0 ? taskTraces : [],
      });
    }
  } else {
    requirements.push({
      id: "REQ-1",
      title: title,
      tasks: taskTraces,
    });
  }

  // Calculate statistics
  const totalTasks = taskTraces.length;
  const completedTasks = taskTraces.filter((t) => t.completed).length;
  const verifiedTasks = taskTraces.filter((t) => t.verification?.success).length;
  const linkedCommitsCount = taskTraces.reduce((acc, t) => acc + t.commits.length, 0);
  const orphanCommitsCount = orphanCommits.length;

  let overallCompliance = 100;
  if (totalTasks > 0) {
    const taskScore = (completedTasks / totalTasks) * 50;
    const verifyScore = verifiedTasks > 0 ? (verifiedTasks / totalTasks) * 50 : 25;
    overallCompliance = Math.round(taskScore + verifyScore);
  }

  return {
    changeId,
    title,
    status,
    approvedHash,
    requirements,
    orphanCommits,
    overallCompliance,
    stats: {
      totalTasks,
      completedTasks,
      verifiedTasks,
      linkedCommitsCount,
      orphanCommitsCount,
    },
  };
}

function parseProposalRequirementSections(content: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  const headerRegex = /^##\s+(.+)$/gm;
  const matches: { title: string; index: number }[] = [];
  let match: RegExpExecArray | null = headerRegex.exec(content);

  while (match !== null) {
    const title = match[1]?.trim() || "";
    matches.push({ title, index: match.index });
    match = headerRegex.exec(content);
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    if (!current) continue;
    const nextIndex = matches[i + 1]?.index ?? content.length;
    const sectionBody = content.slice(current.index, nextIndex).trim();
    sections.push({
      title: current.title,
      content: sectionBody,
    });
  }

  return sections;
}
