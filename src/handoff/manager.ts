import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { CreateHandoffOptions, HandoffRecord } from "./types.js";

export function formatHandoffMarkdown(record: HandoffRecord): string {
  const tasksSection =
    record.tasksCompleted.length > 0
      ? record.tasksCompleted.map((t) => `- [x] ${t}`).join("\n")
      : "- None";

  const filesSection =
    record.filesModified.length > 0
      ? record.filesModified.map((f) => `- \`${f}\``).join("\n")
      : "- None";

  const decisionsSection =
    record.decisions.length > 0 ? record.decisions.map((d) => `- ${d}`).join("\n") : "- None";

  const blockersSection =
    (record.blockers?.length ?? 0) > 0
      ? record.blockers?.map((b) => `- ${b}`).join("\n")
      : "- None";

  const nextStepsSection =
    record.nextSteps.length > 0 ? record.nextSteps.map((s) => `- [ ] ${s}`).join("\n") : "- None";

  return `# Handoff: ${record.id}

- **From:** ${record.fromRole}
- **To:** ${record.toRole}
- **Timestamp:** ${record.timestamp}
- **Change:** ${record.changeId}

## Completed Tasks
${tasksSection}

## Modified Files
${filesSection}

## Decisions Taken
${decisionsSection}

## Blockers & Notes
${blockersSection}
${record.notes ? `\n> ${record.notes}` : ""}

## Next Steps for ${record.toRole}
${nextStepsSection}
`;
}

export function parseHandoffMarkdown(
  changeId: string,
  filename: string,
  content: string,
): HandoffRecord {
  const fromMatch = content.match(/\*\*From:\*\*\s*(.+)/);
  const toMatch = content.match(/\*\*To:\*\*\s*(.+)/);
  const timeMatch = content.match(/\*\*Timestamp:\*\*\s*(.+)/);

  const fromRole = fromMatch ? (fromMatch[1]?.trim() ?? "unknown") : "unknown";
  const toRole = toMatch ? (toMatch[1]?.trim() ?? "unknown") : "unknown";
  const timestamp = timeMatch ? (timeMatch[1]?.trim() ?? "") : "";

  const id = path.basename(filename, ".md");

  // Extract lists by sections
  const extractSectionList = (header: string): string[] => {
    const regex = new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = content.match(regex);
    if (!match?.[1]) return [];
    return match[1]
      .split("\n")
      .map((l) =>
        l
          .replace(/^[-*]\s*(\[[ xX]\]\s*)?`?/, "")
          .replace(/`$/, "")
          .trim(),
      )
      .filter((l) => l && l.toLowerCase() !== "none");
  };

  return {
    id,
    changeId,
    fromRole,
    toRole,
    timestamp,
    tasksCompleted: extractSectionList("Completed Tasks"),
    filesModified: extractSectionList("Modified Files"),
    decisions: extractSectionList("Decisions Taken"),
    blockers: extractSectionList("Blockers & Notes"),
    nextSteps: extractSectionList(`Next Steps for ${toRole}`),
  };
}

export async function createHandoff(
  repoRoot: string,
  changeId: string,
  options: CreateHandoffOptions,
): Promise<HandoffRecord> {
  const handoffsDir = path.join(repoRoot, "openspec", "changes", changeId, "handoffs");
  await fs.mkdir(handoffsDir, { recursive: true });

  const existingFiles = await fg("*.md", { cwd: handoffsDir });
  const index = existingFiles.length + 1;
  const padIndex = String(index).padStart(3, "0");
  const id = `${padIndex}-${options.fromRole}-to-${options.toRole}`;

  const record: HandoffRecord = {
    id,
    changeId,
    fromRole: options.fromRole,
    toRole: options.toRole,
    timestamp: new Date().toISOString(),
    tasksCompleted: options.tasksCompleted ?? [],
    filesModified: options.filesModified ?? [],
    decisions: options.decisions ?? [],
    blockers: options.blockers,
    nextSteps: options.nextSteps ?? [],
    notes: options.notes,
  };

  const filePath = path.join(handoffsDir, `${id}.md`);
  await fs.writeFile(filePath, formatHandoffMarkdown(record), "utf8");

  return record;
}

export async function listHandoffs(repoRoot: string, changeId: string): Promise<HandoffRecord[]> {
  const handoffsDir = path.join(repoRoot, "openspec", "changes", changeId, "handoffs");

  try {
    const files = (await fg("*.md", { cwd: handoffsDir })).sort();
    const records: HandoffRecord[] = [];

    for (const f of files) {
      const content = await fs.readFile(path.join(handoffsDir, f), "utf8");
      records.push(parseHandoffMarkdown(changeId, f, content));
    }

    return records;
  } catch {
    return [];
  }
}

export async function getLatestHandoff(
  repoRoot: string,
  changeId: string,
): Promise<HandoffRecord | null> {
  const handoffs = await listHandoffs(repoRoot, changeId);
  return handoffs.length > 0 ? (handoffs[handoffs.length - 1] ?? null) : null;
}
