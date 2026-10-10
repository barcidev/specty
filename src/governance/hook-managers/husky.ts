import fs from "node:fs/promises";
import path from "node:path";
import { SPECTY_HOOK_CMD } from "./constants.js";
import type { HookInstallResult, HookUninstallResult } from "./types.js";

export async function isHuskyConfigured(repoRoot: string): Promise<boolean> {
  const huskyDir = path.join(repoRoot, ".husky");
  const dirExists = await fs
    .stat(huskyDir)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (dirExists) {
    return true;
  }

  try {
    const pkgRaw = await fs.readFile(path.join(repoRoot, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw);
    return Boolean(pkg.devDependencies?.husky || pkg.dependencies?.husky);
  } catch {
    return false;
  }
}

export async function isHuskyHookInstalled(repoRoot: string): Promise<boolean> {
  const hookFile = path.join(repoRoot, ".husky", "pre-commit");
  try {
    const content = await fs.readFile(hookFile, "utf8");
    return content.includes("specty check-approval");
  } catch {
    return false;
  }
}

export async function installHuskyHook(repoRoot: string): Promise<HookInstallResult> {
  const huskyDir = path.join(repoRoot, ".husky");
  await fs.mkdir(huskyDir, { recursive: true });

  const hookFile = path.join(huskyDir, "pre-commit");
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
      manager: "husky",
      targetPath: ".husky/pre-commit",
      action: "already-installed",
      message: "Specty hook is already active in .husky/pre-commit",
    };
  }

  if (exists) {
    const separator = existingContent.endsWith("\n") || existingContent.length === 0 ? "" : "\n";
    const toAppend = `${separator}# Managed by specty (AI assistant governance)\n${SPECTY_HOOK_CMD}\n`;
    await fs.appendFile(hookFile, toAppend, "utf8");
    try {
      await fs.chmod(hookFile, 0o755);
    } catch {
      // ignore chmod on unsupported filesystems
    }
    return {
      success: true,
      manager: "husky",
      targetPath: ".husky/pre-commit",
      action: "appended",
      message: "Injected Specty hook into existing .husky/pre-commit",
    };
  }

  const newContent = `#!/usr/bin/env sh
# Managed by specty (AI assistant governance)
${SPECTY_HOOK_CMD}
`;

  await fs.writeFile(hookFile, newContent, { mode: 0o755, encoding: "utf8" });
  try {
    await fs.chmod(hookFile, 0o755);
  } catch {
    // ignore
  }

  return {
    success: true,
    manager: "husky",
    targetPath: ".husky/pre-commit",
    action: "created",
    message: "Created .husky/pre-commit with Specty hook",
  };
}

export async function uninstallHuskyHook(repoRoot: string): Promise<HookUninstallResult> {
  const hookFile = path.join(repoRoot, ".husky", "pre-commit");

  try {
    const content = await fs.readFile(hookFile, "utf8");
    if (!content.includes("specty check-approval")) {
      return {
        success: false,
        manager: "husky",
        targetPath: ".husky/pre-commit",
        action: "not-found",
        message: "Specty hook not found in .husky/pre-commit",
      };
    }

    const lines = content.split("\n");
    const cleanedLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.includes("specty check-approval")) return false;
      if (trimmed.includes("Managed by specty")) return false;
      return true;
    });

    const nonCommentContent = cleanedLines
      .filter((l) => l.trim().length > 0 && !l.trim().startsWith("#!"))
      .join("")
      .trim();

    if (nonCommentContent.length === 0) {
      await fs.rm(hookFile, { force: true });
      return {
        success: true,
        manager: "husky",
        targetPath: ".husky/pre-commit",
        action: "removed-file",
        message: "Removed .husky/pre-commit (was only managed by Specty)",
      };
    }

    await fs.writeFile(hookFile, `${cleanedLines.join("\n").trim()}\n`, "utf8");
    return {
      success: true,
      manager: "husky",
      targetPath: ".husky/pre-commit",
      action: "removed-entry",
      message: "Removed Specty hook from .husky/pre-commit (preserved remaining commands)",
    };
  } catch {
    return {
      success: false,
      manager: "husky",
      targetPath: ".husky/pre-commit",
      action: "not-found",
      message: ".husky/pre-commit was not found",
    };
  }
}
