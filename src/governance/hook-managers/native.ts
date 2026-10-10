import fs from "node:fs/promises";
import path from "node:path";
import { isInsideGitRepo } from "../../core/git.js";
import { NATIVE_HOOK_BLOCK, SPECTY_END_MARKER, SPECTY_START_MARKER } from "./constants.js";
import type { HookInstallResult, HookUninstallResult } from "./types.js";

export const PRE_COMMIT_HOOK_NAME = "pre-commit";

export async function isNativeHookInstalled(repoRoot: string): Promise<boolean> {
  const hookFile = path.join(repoRoot, ".git", "hooks", PRE_COMMIT_HOOK_NAME);
  try {
    const content = await fs.readFile(hookFile, "utf8");
    return content.includes("specty check-approval");
  } catch {
    return false;
  }
}

export async function hasCustomNativeHook(repoRoot: string): Promise<boolean> {
  const hookFile = path.join(repoRoot, ".git", "hooks", PRE_COMMIT_HOOK_NAME);
  try {
    const content = await fs.readFile(hookFile, "utf8");
    const nonCommentContent = content
      .split("\n")
      .filter((l) => {
        const trimmed = l.trim();
        return (
          trimmed.length > 0 &&
          !trimmed.startsWith("#") &&
          !trimmed.includes("specty") &&
          !trimmed.includes("SPECTY")
        );
      })
      .join("")
      .trim();
    return nonCommentContent.length > 0;
  } catch {
    return false;
  }
}

export async function installNativeHook(repoRoot: string): Promise<HookInstallResult> {
  const isGit = await isInsideGitRepo(repoRoot);
  if (!isGit) {
    return {
      success: false,
      manager: "native",
      targetPath: ".git/hooks/pre-commit",
      action: "skipped",
      message: "Not inside a Git repository",
    };
  }

  const hooksDir = path.join(repoRoot, ".git", "hooks");
  await fs.mkdir(hooksDir, { recursive: true });

  const hookFile = path.join(hooksDir, PRE_COMMIT_HOOK_NAME);
  let existingContent = "";
  let exists = false;

  try {
    existingContent = await fs.readFile(hookFile, "utf8");
    exists = true;
  } catch {
    exists = false;
  }

  if (exists && existingContent.includes("specty check-approval")) {
    return {
      success: true,
      manager: "native",
      targetPath: ".git/hooks/pre-commit",
      action: "already-installed",
      message: "Specty hook is already active in .git/hooks/pre-commit",
    };
  }

  if (exists) {
    const separator = existingContent.endsWith("\n") || existingContent.length === 0 ? "" : "\n";
    const toAppend = `${separator}\n${NATIVE_HOOK_BLOCK}`;
    await fs.appendFile(hookFile, toAppend, "utf8");
    try {
      await fs.chmod(hookFile, 0o755);
    } catch {
      // ignore
    }
    return {
      success: true,
      manager: "native",
      targetPath: ".git/hooks/pre-commit",
      action: "appended",
      message: "Appended Specty hook block to existing .git/hooks/pre-commit",
    };
  }

  const content = `#!/usr/bin/env sh\n${NATIVE_HOOK_BLOCK}`;
  await fs.writeFile(hookFile, content, { mode: 0o755, encoding: "utf8" });
  try {
    await fs.chmod(hookFile, 0o755);
  } catch {
    // ignore
  }

  return {
    success: true,
    manager: "native",
    targetPath: ".git/hooks/pre-commit",
    action: "created",
    message: "Installed Specty pre-commit hook in .git/hooks/pre-commit",
  };
}

export async function uninstallNativeHook(repoRoot: string): Promise<HookUninstallResult> {
  const hookFile = path.join(repoRoot, ".git", "hooks", PRE_COMMIT_HOOK_NAME);

  try {
    const content = await fs.readFile(hookFile, "utf8");
    if (!content.includes("specty check-approval") && !content.includes("Managed by specty")) {
      return {
        success: false,
        manager: "native",
        targetPath: ".git/hooks/pre-commit",
        action: "not-found",
        message: "Specty hook not found in .git/hooks/pre-commit",
      };
    }

    let cleaned = content;

    if (content.includes(SPECTY_START_MARKER) && content.includes(SPECTY_END_MARKER)) {
      const startIndex = content.indexOf(SPECTY_START_MARKER);
      const endIndex = content.indexOf(SPECTY_END_MARKER) + SPECTY_END_MARKER.length;
      cleaned = `${content.slice(0, startIndex)}${content.slice(endIndex)}`;
    } else {
      // Legacy uninstaller logic for whole-file legacy scripts
      const lines = content.split("\n");
      cleaned = lines
        .filter((l) => {
          const t = l.trim();
          if (t.includes("Managed by specty")) return false;
          if (t.includes("SPECTY_HOOK_DISABLED") || t.includes("SPECTY_BYPASS")) return false;
          if (t.includes("specty check-approval")) return false;
          return true;
        })
        .join("\n");
    }

    const nonCommentContent = cleaned
      .split("\n")
      .filter((l) => {
        const t = l.trim();
        return t.length > 0 && !t.startsWith("#!");
      })
      .join("")
      .trim();

    if (nonCommentContent.length === 0) {
      await fs.rm(hookFile, { force: true });
      return {
        success: true,
        manager: "native",
        targetPath: ".git/hooks/pre-commit",
        action: "removed-file",
        message: "Removed .git/hooks/pre-commit",
      };
    }

    await fs.writeFile(hookFile, `${cleaned.trim()}\n`, { mode: 0o755, encoding: "utf8" });
    return {
      success: true,
      manager: "native",
      targetPath: ".git/hooks/pre-commit",
      action: "removed-entry",
      message: "Removed Specty hook block from .git/hooks/pre-commit",
    };
  } catch {
    return {
      success: false,
      manager: "native",
      targetPath: ".git/hooks/pre-commit",
      action: "not-found",
      message: ".git/hooks/pre-commit not found",
    };
  }
}
