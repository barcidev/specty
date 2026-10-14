import { execa } from "execa";

export interface GitUserInfo {
  name: string | null;
  email: string | null;
}

export async function isInsideGitRepo(cwd: string): Promise<boolean> {
  try {
    const result = await execa("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    return result.stdout.trim() === "true";
  } catch {
    return false;
  }
}

export async function getCurrentBranch(cwd: string): Promise<string | null> {
  try {
    const result = await execa("git", ["branch", "--show-current"], { cwd });
    const branch = result.stdout.trim();
    return branch.length > 0 ? branch : null;
  } catch {
    return null;
  }
}

export async function getGitUser(cwd: string): Promise<GitUserInfo> {
  let name: string | null = null;
  let email: string | null = null;

  try {
    const nameResult = await execa("git", ["config", "user.name"], { cwd });
    name = nameResult.stdout.trim() || null;
  } catch {
    // ignore
  }

  try {
    const emailResult = await execa("git", ["config", "user.email"], { cwd });
    email = emailResult.stdout.trim() || null;
  } catch {
    // ignore
  }

  return { name, email };
}

export async function getStagedFiles(cwd: string): Promise<string[]> {
  try {
    const result = await execa("git", ["diff", "--cached", "--name-only"], { cwd });
    const lines = result.stdout
      .split("\n")
      .map((l) => l.trim().replace(/\\/g, "/"))
      .filter((l) => l.length > 0);
    return lines;
  } catch {
    return [];
  }
}

export async function getHeadCommitSha(cwd: string): Promise<string | null> {
  try {
    const result = await execa("git", ["rev-parse", "HEAD"], { cwd });
    const sha = result.stdout.trim();
    return sha.length > 0 ? sha : null;
  } catch {
    return null;
  }
}

export async function getModifiedFiles(cwd: string, baseRef = "HEAD"): Promise<string[]> {
  try {
    const result = await execa("git", ["diff", "--name-only", baseRef], { cwd });
    const lines = result.stdout
      .split("\n")
      .map((l) => l.trim().replace(/\\/g, "/"))
      .filter((l) => l.length > 0);
    return lines;
  } catch {
    return [];
  }
}

export async function initGitRepo(cwd: string, branch = "main"): Promise<void> {
  await execa("git", ["init", "-b", branch], { cwd });
  try {
    const user = await getGitUser(cwd);
    if (!user.name) {
      await execa("git", ["config", "user.name", "specty"], { cwd });
    }
    if (!user.email) {
      await execa("git", ["config", "user.email", "specty@local"], { cwd });
    }
  } catch {
    // ignore
  }
}

export async function listLocalBranches(cwd: string): Promise<string[]> {
  try {
    const result = await execa("git", ["branch", "--format=%(refname:short)"], { cwd });
    return result.stdout
      .split("\n")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  } catch {
    return [];
  }
}

export async function checkoutBranch(
  cwd: string,
  branch: string,
  create = false,
): Promise<{ success: boolean; created: boolean; error?: string }> {
  try {
    const existing = await listLocalBranches(cwd);
    if (existing.includes(branch)) {
      await execa("git", ["checkout", branch], { cwd });
      return { success: true, created: false };
    }
    if (create) {
      await execa("git", ["checkout", "-b", branch], { cwd });
      return { success: true, created: true };
    }
    await execa("git", ["checkout", branch], { cwd });
    return { success: true, created: false };
  } catch (err: unknown) {
    return {
      success: false,
      created: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function deleteBranch(
  cwd: string,
  branch: string,
  force = false,
): Promise<{ success: boolean; error?: string }> {
  try {
    const flag = force ? "-D" : "-d";
    await execa("git", ["branch", flag, branch], { cwd });
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function mergeBranch(
  cwd: string,
  branch: string,
  options: { noFf?: boolean; message?: string } = {},
): Promise<{ success: boolean; error?: string }> {
  const args = ["merge"];
  if (options.noFf) {
    args.push("--no-ff");
  }
  if (options.message) {
    args.push("-m", options.message);
  }
  args.push(branch);

  try {
    await execa("git", args, { cwd });
    return { success: true };
  } catch (err: unknown) {
    try {
      await execa("git", ["merge", "--abort"], { cwd });
    } catch {
      // ignore abort error if merge hadn't started
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function commitWorkingTree(
  cwd: string,
  message: string,
): Promise<{ success: boolean; committed: boolean; error?: string }> {
  try {
    const status = await execa("git", ["status", "--porcelain"], { cwd });
    if (!status.stdout.trim()) {
      return { success: true, committed: false };
    }
    await execa("git", ["add", "-A"], { cwd });
    await execa("git", ["commit", "-m", message], { cwd });
    return { success: true, committed: true };
  } catch (err: unknown) {
    return {
      success: false,
      committed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface BranchDiffFile {
  status: "A" | "M" | "D" | "R" | "C" | "U" | "?";
  file: string;
  raw: string;
}

export async function getBranchDiffFiles(
  cwd: string,
  baseBranch: string,
  headBranch: string,
): Promise<BranchDiffFile[]> {
  try {
    const result = await execa("git", ["diff", "--name-status", `${baseBranch}...${headBranch}`], {
      cwd,
    });
    const lines = result.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return lines.map((line) => {
      const parts = line.split(/\s+/);
      const status = (parts[0]?.[0]?.toUpperCase() ?? "M") as BranchDiffFile["status"];
      const file = parts.slice(1).join(" ").replace(/\\/g, "/");
      return { status, file, raw: line };
    });
  } catch {
    try {
      // Fallback to two-dot diff
      const result = await execa("git", ["diff", "--name-status", `${baseBranch}..${headBranch}`], {
        cwd,
      });
      return result.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((line) => {
          const parts = line.split(/\s+/);
          const status = (parts[0]?.[0]?.toUpperCase() ?? "M") as BranchDiffFile["status"];
          const file = parts.slice(1).join(" ").replace(/\\/g, "/");
          return { status, file, raw: line };
        });
    } catch {
      return [];
    }
  }
}

export async function getBranchDiffSummary(
  cwd: string,
  baseBranch: string,
  headBranch: string,
): Promise<string> {
  try {
    const result = await execa("git", ["diff", "--stat", `${baseBranch}...${headBranch}`], {
      cwd,
    });
    return result.stdout.trim();
  } catch {
    try {
      const result = await execa("git", ["diff", "--stat", `${baseBranch}..${headBranch}`], {
        cwd,
      });
      return result.stdout.trim();
    } catch {
      return "";
    }
  }
}

export async function getBranchCommits(
  cwd: string,
  baseBranch: string,
  headBranch: string,
): Promise<Array<{ sha: string; message: string }>> {
  try {
    const result = await execa(
      "git",
      ["log", "--oneline", "--no-merges", `${baseBranch}..${headBranch}`],
      { cwd },
    );
    const lines = result.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return lines.map((line) => {
      const spaceIdx = line.indexOf(" ");
      if (spaceIdx === -1) {
        return { sha: line, message: "" };
      }
      return {
        sha: line.slice(0, spaceIdx),
        message: line.slice(spaceIdx + 1),
      };
    });
  } catch {
    return [];
  }
}
