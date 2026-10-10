import fs from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";
import type { ChangeStatus, ChangeTaskSummary } from "./types.js";

export interface ChangeState {
  change_id: string;
  status: ChangeStatus;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  approved_at?: string;
  approved_by?: string;
  content_hash?: string;
  tasks_total?: number;
  tasks_completed?: number;
  verification_passed?: boolean;
}

export const CHANGE_STATE_FILENAME = "specty.yaml";

export async function readChangeState(changeDir: string): Promise<ChangeState | null> {
  const filePath = path.join(changeDir, CHANGE_STATE_FILENAME);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = yaml.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as ChangeState;
  } catch {
    return null;
  }
}

export async function writeChangeState(changeDir: string, state: ChangeState): Promise<void> {
  const filePath = path.join(changeDir, CHANGE_STATE_FILENAME);
  const content = `# Specty Change Metadata\n${yaml.stringify(state)}`;
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export function parseTasksSummary(content: string): ChangeTaskSummary {
  const lines = content.split("\n");
  let total = 0;
  let completed = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]")) {
      total++;
      completed++;
    } else if (trimmed.startsWith("- [ ]")) {
      total++;
    }
  }

  return { total, completed };
}
