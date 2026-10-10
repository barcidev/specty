import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { parseTasksSummary, readChangeState, writeChangeState } from "../engines/change-state.js";
import { checkApprovalStatus } from "../governance/approvals.js";
import { validateChangeSpecification } from "../governance/spec-validator.js";
import { loadChangeReviews } from "./reviews.js";
import type {
  ChangeDetailPayload,
  ParsedSpecSection,
  ParsedTaskItem,
  ParsedTasksData,
} from "./types.js";

export function parseProposalSections(markdown: string): ParsedSpecSection[] {
  const lines = markdown.split("\n");
  const sections: ParsedSpecSection[] = [];

  let currentHeading = "";
  let currentLevel = 1;
  let currentLines: string[] = [];

  const flush = () => {
    const raw = currentLines.join("\n").trim();
    if (raw || currentHeading) {
      const heading = currentHeading || "Overview";
      const id = slugify(heading);
      sections.push({
        id,
        title: heading,
        level: currentLevel,
        content: raw,
        rawMarkdown: raw,
      });
      currentLines = [];
    }
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match?.[1] && match[2]) {
      flush();
      currentLevel = match[1].length;
      currentHeading = match[2].trim();
    } else {
      currentLines.push(line);
    }
  }

  flush();
  return sections;
}

export function parseTasksData(markdown: string): ParsedTasksData {
  const lines = markdown.split("\n");
  const items: ParsedTaskItem[] = [];
  const rolesSet = new Set<string>();

  let currentRole: string | undefined;
  let total = 0;
  let completed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // Check for role headers, e.g. "## [rol: frontend]" or "## Role: backend"
    const roleMatch = trimmed.match(/^#{1,4}\s+\[?rol(?:e)?:\s*([a-zA-Z0-9_-]+)\]?/i);
    if (roleMatch?.[1]) {
      currentRole = roleMatch[1].toLowerCase();
      rolesSet.add(currentRole);
      continue;
    }

    if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]")) {
      total++;
      completed++;
      const text = trimmed.replace(/^-\s*\[[xX]\]\s*/, "");
      items.push({
        id: `task-${i}`,
        lineIndex: i,
        text,
        completed: true,
        role: currentRole,
      });
    } else if (trimmed.startsWith("- [ ]")) {
      total++;
      const text = trimmed.replace(/^-\s*\[\s*\]\s*/, "");
      items.push({
        id: `task-${i}`,
        lineIndex: i,
        text,
        completed: false,
        role: currentRole,
      });
    }
  }

  return {
    total,
    completed,
    items,
    roles: Array.from(rolesSet),
  };
}

export async function toggleTaskStatus(
  repoRoot: string,
  changeId: string,
  lineIndex: number,
  targetCompleted?: boolean,
): Promise<ParsedTasksData> {
  const changeDir = path.join(repoRoot, "openspec", "changes", changeId);
  const tasksPath = path.join(changeDir, "tasks.md");

  const raw = await fs.readFile(tasksPath, "utf8");
  const lines = raw.split("\n");

  if (lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error(`Invalid lineIndex ${lineIndex} for tasks.md (length ${lines.length})`);
  }

  const currentLine = lines[lineIndex] ?? "";
  const isCurrentlyChecked =
    currentLine.trim().startsWith("- [x]") || currentLine.trim().startsWith("- [X]");
  const willBeCompleted = targetCompleted !== undefined ? targetCompleted : !isCurrentlyChecked;

  if (willBeCompleted) {
    lines[lineIndex] = currentLine.replace(/-\s*\[\s*\]/, "- [x]");
  } else {
    lines[lineIndex] = currentLine.replace(/-\s*\[[xX]\]/, "- [ ]");
  }

  const newContent = lines.join("\n");
  await fs.writeFile(tasksPath, newContent, "utf8");

  // Update specty.yaml summary
  const summary = parseTasksSummary(newContent);
  const state = await readChangeState(changeDir);
  if (state) {
    state.tasks_total = summary.total;
    state.tasks_completed = summary.completed;
    await writeChangeState(changeDir, state);
  }

  return parseTasksData(newContent);
}

export async function getChangeDetail(
  repoRoot: string,
  changeId: string,
): Promise<ChangeDetailPayload | null> {
  const changeDir = path.join(repoRoot, "openspec", "changes", changeId);

  try {
    const stat = await fs.stat(changeDir);
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }

  const state = await readChangeState(changeDir);

  let proposalRaw = "";
  try {
    proposalRaw = await fs.readFile(path.join(changeDir, "proposal.md"), "utf8");
  } catch {
    // proposal may be missing
  }

  let tasksRaw = "";
  try {
    tasksRaw = await fs.readFile(path.join(changeDir, "tasks.md"), "utf8");
  } catch {
    // tasks may be missing
  }

  const proposalSections = parseProposalSections(proposalRaw);
  const tasksData = parseTasksData(tasksRaw);

  const [approval, validation, reviews] = await Promise.all([
    checkApprovalStatus(repoRoot, changeId),
    validateChangeSpecification(changeDir),
    loadChangeReviews(repoRoot, changeId),
  ]);

  let specFiles: string[] = [];
  try {
    const specsDir = path.join(changeDir, "specs");
    specFiles = await fg("**/*.md", { cwd: specsDir, dot: false });
  } catch {
    // ignore
  }

  return {
    id: changeId,
    title: extractTitleFromProposal(proposalRaw, changeId),
    status: state?.status ?? "draft",
    path: changeDir,
    isArchived: false,
    proposalRaw,
    proposalSections,
    tasksRaw,
    tasksData,
    approval,
    validation,
    reviews,
    specFiles,
  };
}

function extractTitleFromProposal(proposal: string, fallback: string): string {
  const match = proposal.match(/^#\s+(.+)$/m);
  if (match?.[1]) {
    return match[1].replace(/Change Proposal:?/i, "").trim();
  }
  return fallback;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
