import fs from "node:fs/promises";
import path from "node:path";
import * as diff from "diff";
import { execa } from "execa";
import fg from "fast-glob";
import type { ChangeDiffSummary, FileDiffItem } from "./types.js";

export async function getGitDiffs(
  cwd: string,
  scope: "all" | "staged" | "unstaged" = "all",
): Promise<FileDiffItem[]> {
  const items: FileDiffItem[] = [];

  try {
    let diffOutput = "";
    if (scope === "staged") {
      const res = await execa("git", ["diff", "--cached"], { cwd });
      diffOutput = res.stdout;
    } else if (scope === "unstaged") {
      const res = await execa("git", ["diff"], { cwd });
      diffOutput = res.stdout;
    } else {
      // All: first check working directory (staged + unstaged against HEAD)
      const res = await execa("git", ["diff", "HEAD"], { cwd });
      diffOutput = res.stdout;
      if (!diffOutput.trim()) {
        // Fallback: compare with origin/main or previous commit if on a branch
        const branchRes = await execa("git", ["diff", "HEAD~1"], { cwd }).catch(() => null);
        if (branchRes) {
          diffOutput = branchRes.stdout;
        }
      }
    }

    if (diffOutput.trim()) {
      const parsedFiles = parseUnifiedDiffText(diffOutput);
      items.push(...parsedFiles);
    }
  } catch {
    // If not in git or error, gracefully return empty items
  }

  return items;
}

export async function getChangeFileBaseline(
  repoRoot: string,
  changeId: string,
  fileName: string,
): Promise<string | null> {
  const relPath = path.join("openspec", "changes", changeId, fileName);

  // 1. Try from .specty/backups (newest backup first)
  try {
    const backupsDir = path.join(repoRoot, ".specty", "backups");
    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    const backupDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();

    for (const bDir of backupDirs) {
      const candidate = path.join(backupsDir, bDir, relPath);
      try {
        return await fs.readFile(candidate, "utf8");
      } catch {
        // next backup candidate
      }
    }
  } catch {
    // no backups directory
  }

  // 2. Try git HEAD
  try {
    const gitPath = relPath.replace(/\\/g, "/");
    const { stdout } = await execa("git", ["show", `HEAD:${gitPath}`], { cwd: repoRoot });
    return stdout;
  } catch {
    // not in git HEAD
  }

  return null;
}

export async function getSpecDeltaDiffs(
  repoRoot: string,
  changeId: string,
): Promise<FileDiffItem[]> {
  const items: FileDiffItem[] = [];

  // 1. Compare tasks.md against baseline
  try {
    const tasksPath = path.join(repoRoot, "openspec", "changes", changeId, "tasks.md");
    const currentTasks = await fs.readFile(tasksPath, "utf8");
    const baselineTasks = await getChangeFileBaseline(repoRoot, changeId, "tasks.md");
    if (baselineTasks !== null && baselineTasks !== currentTasks) {
      const patch = diff.createPatch(
        `openspec/changes/${changeId}/tasks.md`,
        baselineTasks,
        currentTasks,
        "aprobado",
        "actual",
      );
      const { additions, deletions } = countPatchMetrics(patch);
      items.push({
        file: `openspec/changes/${changeId}/tasks.md`,
        status: "modified",
        additions,
        deletions,
        patch,
      });
    }
  } catch {
    // tasks.md may not exist
  }

  // 2. Compare proposal.md against baseline
  try {
    const proposalPath = path.join(repoRoot, "openspec", "changes", changeId, "proposal.md");
    const currentProposal = await fs.readFile(proposalPath, "utf8");
    const baselineProposal = await getChangeFileBaseline(repoRoot, changeId, "proposal.md");
    if (baselineProposal !== null && baselineProposal !== currentProposal) {
      const patch = diff.createPatch(
        `openspec/changes/${changeId}/proposal.md`,
        baselineProposal,
        currentProposal,
        "aprobado",
        "actual",
      );
      const { additions, deletions } = countPatchMetrics(patch);
      items.push({
        file: `openspec/changes/${changeId}/proposal.md`,
        status: "modified",
        additions,
        deletions,
        patch,
      });
    }
  } catch {
    // proposal.md may not exist
  }

  // 3. Compare specs directory
  const changeSpecsDir = path.join(repoRoot, "openspec", "changes", changeId, "specs");
  const mainSpecsDir = path.join(repoRoot, "openspec", "specs");

  try {
    const specFiles = await fg("**/*.md", { cwd: changeSpecsDir, dot: false });
    for (const relFile of specFiles) {
      const changeFilePath = path.join(changeSpecsDir, relFile);
      const mainFilePath = path.join(mainSpecsDir, relFile);

      const changeContent = await fs.readFile(changeFilePath, "utf8");
      let mainContent = "";
      let existsInMain = false;

      try {
        mainContent = await fs.readFile(mainFilePath, "utf8");
        existsInMain = true;
      } catch {
        const baselineSpec = await getChangeFileBaseline(
          repoRoot,
          changeId,
          path.join("specs", relFile),
        );
        if (baselineSpec !== null) {
          mainContent = baselineSpec;
          existsInMain = true;
        }
      }

      if (changeContent !== mainContent) {
        const patch = diff.createPatch(
          `specs/${relFile}`,
          mainContent,
          changeContent,
          existsInMain ? "baseline" : "new",
          "change",
        );
        const { additions, deletions } = countPatchMetrics(patch);

        items.push({
          file: `openspec/specs/${relFile}`,
          status: !existsInMain ? "added" : "modified",
          additions,
          deletions,
          patch,
        });
      }
    }
  } catch {
    // directory may not exist
  }

  return items;
}

export async function getChangeDiffSummary(
  repoRoot: string,
  changeId: string,
  scope: "all" | "staged" | "unstaged" = "all",
): Promise<ChangeDiffSummary> {
  const [gitDiffs, specDiffs] = await Promise.all([
    getGitDiffs(repoRoot, scope),
    getSpecDeltaDiffs(repoRoot, changeId),
  ]);

  const allFiles = [...specDiffs, ...gitDiffs];
  const totalAdditions = allFiles.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = allFiles.reduce((acc, f) => acc + f.deletions, 0);

  return {
    changeId,
    files: allFiles,
    totalAdditions,
    totalDeletions,
  };
}

function parseUnifiedDiffText(rawDiff: string): FileDiffItem[] {
  const files: FileDiffItem[] = [];
  const parsed = diff.parsePatch(rawDiff);

  for (const p of parsed) {
    const fileName = (p.newFileName || p.oldFileName || "unknown").replace(/^[ab]\//, "");
    let additions = 0;
    let deletions = 0;

    for (const hunk of p.hunks) {
      for (const line of hunk.lines) {
        if (line.startsWith("+") && !line.startsWith("+++")) additions++;
        else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
      }
    }

    let status: "added" | "modified" | "deleted" = "modified";
    if (p.oldFileName === "/dev/null") status = "added";
    else if (p.newFileName === "/dev/null") status = "deleted";

    const patch = diff.formatPatch(p);
    files.push({
      file: fileName,
      status,
      additions,
      deletions,
      patch,
    });
  }

  return files;
}

function countPatchMetrics(patch: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  const lines = patch.split("\n");

  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }

  return { additions, deletions };
}
