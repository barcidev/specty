import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { parseTasksSummary, readChangeState, writeChangeState } from "../engines/change-state.js";
import { getAgentSession } from "../governance/agent-session.js";
import { checkApprovalStatus } from "../governance/approvals.js";
import { validateChangeSpecification } from "../governance/spec-validator.js";
import type { VerificationReport } from "../governance/verifier.js";
import { getChangeFileBaseline, getSpecDeltaDiffs } from "./diff-service.js";
import { loadChangeReviews } from "./reviews.js";
import type {
  ChangeDetailPayload,
  FileDiffItem,
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
  let isAdjustmentSection = false;
  let total = 0;
  let completed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // Check for section headers (e.g. roles, adjustments, phases)
    const headerMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (headerMatch?.[1]) {
      const headerTitle = headerMatch[1].trim().toLowerCase();
      const roleMatch = headerTitle.match(/\[?rol(?:e)?:\s*([a-zA-Z0-9_-]+)\]?/i);
      if (roleMatch?.[1]) {
        currentRole = roleMatch[1].toLowerCase();
        rolesSet.add(currentRole);
      }
      isAdjustmentSection = /(?:ajuste|correcci|fix|patch|adjustment)/i.test(headerTitle);
      continue;
    }

    if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]")) {
      total++;
      completed++;
      const text = trimmed.replace(/^-\s*\[[xX]\]\s*/, "");
      const hasAdjustmentTag = /\[(?:ajuste|adjustment|fix)\]/i.test(text);
      items.push({
        id: `task-${i}`,
        lineIndex: i,
        text,
        completed: true,
        role: currentRole,
        isAdjustment: isAdjustmentSection || hasAdjustmentTag,
      });
    } else if (trimmed.startsWith("- [ ]")) {
      total++;
      const text = trimmed.replace(/^-\s*\[\s*\]\s*/, "");
      const hasAdjustmentTag = /\[(?:ajuste|adjustment|fix)\]/i.test(text);
      items.push({
        id: `task-${i}`,
        lineIndex: i,
        text,
        completed: false,
        role: currentRole,
        isAdjustment: isAdjustmentSection || hasAdjustmentTag,
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
  let changeDir = path.join(repoRoot, "openspec", "changes", changeId);
  let isArchived = false;

  try {
    const stat = await fs.stat(changeDir);
    if (!stat.isDirectory()) {
      changeDir = "";
    }
  } catch {
    changeDir = "";
  }

  if (!changeDir) {
    const archiveBase = path.join(repoRoot, "openspec", "changes", "archive");
    try {
      const entries = await fs.readdir(archiveBase);
      for (const entry of entries) {
        if (entry === changeId || entry.endsWith(`-${changeId}`)) {
          const candidate = path.join(archiveBase, entry);
          const stat = await fs.stat(candidate);
          if (stat.isDirectory()) {
            changeDir = candidate;
            isArchived = true;
            break;
          }
        }
      }
    } catch {
      // no archive directory
    }
  }

  if (!changeDir) return null;

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

  // Compare against baseline to detect added or modified tasks
  try {
    const baselineTasksRaw = await getChangeFileBaseline(repoRoot, changeId, "tasks.md");
    if (baselineTasksRaw) {
      const baselineTasksData = parseTasksData(baselineTasksRaw);
      const baselineTexts = new Set(
        baselineTasksData.items.map((it) => it.text.trim().toLowerCase()),
      );
      for (const item of tasksData.items) {
        if (!baselineTexts.has(item.text.trim().toLowerCase())) {
          item.isNew = true;
          item.isAdjustment = true;
        }
      }
    }
  } catch {
    // ignore baseline check error
  }

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

  let verification: VerificationReport | null = null;
  try {
    const rawVerif = await fs.readFile(path.join(changeDir, "verification.json"), "utf8");
    verification = JSON.parse(rawVerif) as VerificationReport;
  } catch {
    // no verification evidence yet
  }

  let effectiveStatus = state?.status ?? "draft";
  if (
    (effectiveStatus === "verifying" || effectiveStatus === "done") &&
    tasksData.total > 0 &&
    tasksData.completed < tasksData.total
  ) {
    effectiveStatus = "in-progress";
    if (state && state.status !== "in-progress") {
      await writeChangeState(changeDir, {
        ...state,
        status: "in-progress",
        verification_passed: false,
      }).catch(() => {});
    }
  }

  // Load spec delta diffs to attach file changes to audit log items
  let specDiffs: FileDiffItem[] = [];
  try {
    specDiffs = await getSpecDeltaDiffs(repoRoot, changeId);
  } catch {
    // ignore
  }

  // Consolidate all adjustments to the initial plan (both before execution and after coding)
  const allReviews = reviews.map((r) => {
    if (r.diffs && r.diffs.length > 0) return r;
    const matching = specDiffs.filter((d) => {
      if (r.sectionId === "tasks" || r.sectionTitle?.includes("tasks.md")) {
        return d.file.includes("tasks.md");
      }
      if (r.sectionId === "proposal" || r.sectionTitle?.includes("proposal.md")) {
        return d.file.includes("proposal.md");
      }
      return false;
    });
    return matching.length > 0 ? { ...r, diffs: matching } : r;
  });

  for (const item of tasksData.items) {
    if (item.isAdjustment) {
      const exists = allReviews.some(
        (r) => r.id === `adj-${item.id}` || r.comment.includes(item.text),
      );
      if (!exists) {
        const tasksDiff = specDiffs.filter((d) => d.file.includes("tasks.md"));
        allReviews.push({
          id: `adj-${item.id}`,
          changeId,
          sectionId: "tasks",
          sectionTitle: "tasks.md",
          comment: `Ajuste al plan: ${item.text}`,
          type: "comment",
          author: item.role ? `@${item.role}` : "agent",
          createdAt: state?.approved_at || new Date().toISOString(),
          resolved: true,
          diffs: tasksDiff.length > 0 ? tasksDiff : undefined,
        });
      }
    }
  }

  if (approval.code === "reapproval_required") {
    const exists = allReviews.some((r) => r.id === `spec-delta-${changeId}`);
    if (!exists) {
      const newOrAdjusted = tasksData.items.filter((t) => t.isNew || t.isAdjustment);
      let tasksNote = "";
      if (newOrAdjusted.length > 0) {
        tasksNote =
          `\n\nTareas añadidas o ajustadas en tasks.md (${newOrAdjusted.length}):\n` +
          newOrAdjusted.map((t) => `• ${t.text}`).join("\n");
      }

      const relevantDiffs = specDiffs.filter(
        (d) =>
          d.file.includes("tasks.md") ||
          d.file.includes("proposal.md") ||
          d.file.includes("specs/"),
      );

      allReviews.push({
        id: `spec-delta-${changeId}`,
        changeId,
        sectionId: "proposal",
        sectionTitle: "proposal.md / tasks.md",
        comment: `Ajuste detectado en la especificación tras la aprobación inicial (Hash inicial: ${approval.approvedHash?.slice(0, 8) ?? "N/A"}... → Actual: ${approval.currentHash?.slice(0, 8) ?? "N/A"}...).${tasksNote}`,
        type: "change_request",
        author: "governance",
        createdAt: approval.approvedAt || new Date().toISOString(),
        resolved: false,
        diffs: relevantDiffs.length > 0 ? relevantDiffs : undefined,
      });
    }
  }

  try {
    const backupsDir = path.join(repoRoot, ".specty", "backups");
    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    for (const b of entries) {
      if (b.isDirectory()) {
        const exists = allReviews.some((r) => r.id === `backup-${b.name}`);
        if (!exists) {
          allReviews.push({
            id: `backup-${b.name}`,
            changeId,
            sectionId: "backups",
            sectionTitle: "Historial de Backup",
            comment: `Snapshot de versión previa del plan respaldada antes de ajuste (${b.name}).`,
            type: "comment",
            author: "backup-engine",
            createdAt: parseBackupTimestamp(b.name),
            resolved: true,
          });
        }
      }
    }
  } catch {
    // No backups directory
  }

  const agentSession = await getAgentSession(repoRoot, changeId);

  return {
    id: changeId,
    title: extractTitleFromProposal(proposalRaw, changeId),
    status: effectiveStatus,
    path: changeDir,
    isArchived: isArchived || Boolean(state?.status === "archived"),
    proposalRaw,
    proposalSections,
    tasksRaw,
    tasksData,
    approval,
    validation,
    reviews: allReviews,
    specFiles,
    verification,
    agentSession,
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

function parseBackupTimestamp(name: string): string {
  const iso = name.replace(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?Z?$/,
    (_, d, h, m, s, ms) => `${d}T${h}:${m}:${s}${ms ? `.${ms}` : ".000"}Z`,
  );
  const parsed = Date.parse(iso);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}
