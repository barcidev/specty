import fs from "node:fs/promises";
import path from "node:path";
import { parseTasksSummary, readChangeState, writeChangeState } from "./change-state.js";
import type {
  ChangeMetadata,
  ChangeStatus,
  CreateChangeOptions,
  SpecEngine,
  ValidationIssue,
  ValidationResult,
} from "./types.js";

export class BuiltinSpecEngine implements SpecEngine {
  readonly id = "builtin" as const;

  private getChangesDir(repoRoot: string): string {
    return path.join(repoRoot, "openspec", "changes");
  }

  private getArchiveDir(repoRoot: string): string {
    return path.join(repoRoot, "openspec", "changes", "archive");
  }

  private getSpecsDir(repoRoot: string): string {
    return path.join(repoRoot, "openspec", "specs");
  }

  async init(repoRoot: string, options?: { dryRun?: boolean }): Promise<void> {
    if (options?.dryRun) {
      return;
    }
    await fs.mkdir(this.getChangesDir(repoRoot), { recursive: true });
    await fs.mkdir(this.getArchiveDir(repoRoot), { recursive: true });
    await fs.mkdir(this.getSpecsDir(repoRoot), { recursive: true });
  }

  async listChanges(repoRoot: string): Promise<ChangeMetadata[]> {
    const changesDir = this.getChangesDir(repoRoot);
    const results: ChangeMetadata[] = [];

    try {
      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === "archive" || entry.name.startsWith(".")) {
          continue;
        }

        const change = await this.getChange(repoRoot, entry.name);
        if (change) {
          results.push(change);
        }
      }
    } catch {
      // directory does not exist yet
    }

    return results;
  }

  async getChange(repoRoot: string, changeId: string): Promise<ChangeMetadata | null> {
    const changeDir = path.join(this.getChangesDir(repoRoot), changeId);

    try {
      const stat = await fs.stat(changeDir);
      if (!stat.isDirectory()) {
        return null;
      }
    } catch {
      return null;
    }

    const state = await readChangeState(changeDir);
    let tasksContent = "";
    try {
      tasksContent = await fs.readFile(path.join(changeDir, "tasks.md"), "utf8");
    } catch {
      // no tasks.md
    }

    const tasks = parseTasksSummary(tasksContent);
    const status: ChangeStatus = state?.status ?? "draft";

    let title: string | undefined;
    try {
      const proposalContent = await fs.readFile(path.join(changeDir, "proposal.md"), "utf8");
      const match = proposalContent.match(/^#\s+(?:Change:\s*)?(.+)$/m);
      if (match) {
        title = match[1]?.trim();
      }
    } catch {
      // no proposal.md
    }

    return {
      id: changeId,
      title: title ?? changeId,
      status,
      path: changeDir,
      isArchived: false,
      approvedAt: state?.approved_at,
      approvedHash: state?.content_hash,
      tasks,
    };
  }

  async createChange(
    repoRoot: string,
    changeId: string,
    options?: CreateChangeOptions,
  ): Promise<string> {
    const changeDir = path.join(this.getChangesDir(repoRoot), changeId);

    if (options?.dryRun) {
      return changeDir;
    }

    await fs.mkdir(changeDir, { recursive: true });

    const title = options?.title ?? changeId;
    const proposalContent = `# Change: ${title}\n\n## Objective\nDescribe the objective of this change.\n\n## Proposed Architecture\nOutline architectural decisions.\n\n## Acceptance Criteria\n- [ ] Criteria 1\n`;
    const tasksContent = `# Tasks: ${title}\n\n## 1. Implementation\n- [ ] 1.1 Initial task\n`;

    await fs.writeFile(path.join(changeDir, "proposal.md"), proposalContent, "utf8");
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksContent, "utf8");

    await writeChangeState(changeDir, {
      change_id: changeId,
      status: "draft",
      tasks_total: 1,
      tasks_completed: 0,
    });

    return changeDir;
  }

  async validate(repoRoot: string, changeId?: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    const changesToValidate = changeId
      ? [changeId]
      : (await this.listChanges(repoRoot)).map((c) => c.id);

    for (const id of changesToValidate) {
      const changeDir = path.join(this.getChangesDir(repoRoot), id);
      const proposalPath = path.join(changeDir, "proposal.md");
      const tasksPath = path.join(changeDir, "tasks.md");

      try {
        const proposalContent = await fs.readFile(proposalPath, "utf8");
        if (proposalContent.trim().length === 0) {
          issues.push({
            file: `openspec/changes/${id}/proposal.md`,
            message: "Proposal file is empty",
            severity: "error",
          });
        }
      } catch {
        issues.push({
          file: `openspec/changes/${id}/proposal.md`,
          message: "Missing proposal.md in change",
          severity: "error",
        });
      }

      try {
        const tasksContent = await fs.readFile(tasksPath, "utf8");
        const summary = parseTasksSummary(tasksContent);
        if (summary.total === 0) {
          issues.push({
            file: `openspec/changes/${id}/tasks.md`,
            message: "Tasks file does not contain any checkboxes (- [ ])",
            severity: "warning",
          });
        }
      } catch {
        issues.push({
          file: `openspec/changes/${id}/tasks.md`,
          message: "Missing tasks.md in change",
          severity: "error",
        });
      }
    }

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }

  async archive(
    repoRoot: string,
    changeId: string,
    options?: { dryRun?: boolean },
  ): Promise<boolean> {
    const changeDir = path.join(this.getChangesDir(repoRoot), changeId);
    const archiveDir = this.getArchiveDir(repoRoot);

    try {
      await fs.stat(changeDir);
    } catch {
      return false;
    }

    if (options?.dryRun) {
      return true;
    }

    await fs.mkdir(archiveDir, { recursive: true });

    // Update state to archived
    const state = (await readChangeState(changeDir)) ?? {
      change_id: changeId,
      status: "archived",
    };
    state.status = "archived";
    await writeChangeState(changeDir, state);

    const targetDir = path.join(archiveDir, changeId);
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.rename(changeDir, targetDir);

    return true;
  }
}
