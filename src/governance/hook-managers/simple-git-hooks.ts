import fs from "node:fs/promises";
import path from "node:path";
import { SPECTY_HOOK_CMD } from "./constants.js";
import type { HookInstallResult, HookUninstallResult } from "./types.js";

const SIMPLE_GIT_HOOKS_CONFIG_FILES = [
  ".simple-git-hooks.json",
  ".simple-git-hooks.js",
  ".simple-git-hooks.cjs",
];

export async function isSimpleGitHooksConfigured(repoRoot: string): Promise<boolean> {
  for (const file of SIMPLE_GIT_HOOKS_CONFIG_FILES) {
    const exists = await fs
      .access(path.join(repoRoot, file))
      .then(() => true)
      .catch(() => false);
    if (exists) return true;
  }

  try {
    const pkgRaw = await fs.readFile(path.join(repoRoot, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw);
    return Boolean(
      pkg["simple-git-hooks"] ||
        pkg.devDependencies?.["simple-git-hooks"] ||
        pkg.dependencies?.["simple-git-hooks"],
    );
  } catch {
    return false;
  }
}

export async function isSimpleGitHooksInstalled(repoRoot: string): Promise<boolean> {
  try {
    const pkgRaw = await fs.readFile(path.join(repoRoot, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw);
    const preCommit = pkg["simple-git-hooks"]?.["pre-commit"];
    if (typeof preCommit === "string" && preCommit.includes("specty check-approval")) {
      return true;
    }
  } catch {
    // ignore
  }

  const jsonConfig = path.join(repoRoot, ".simple-git-hooks.json");
  try {
    const raw = await fs.readFile(jsonConfig, "utf8");
    return raw.includes("specty check-approval");
  } catch {
    return false;
  }
}

export async function installSimpleGitHooks(repoRoot: string): Promise<HookInstallResult> {
  const pkgPath = path.join(repoRoot, "package.json");
  try {
    const pkgRaw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(pkgRaw);

    if (!pkg["simple-git-hooks"]) {
      pkg["simple-git-hooks"] = {};
    }

    const currentHook = pkg["simple-git-hooks"]["pre-commit"];
    if (typeof currentHook === "string" && currentHook.includes("specty check-approval")) {
      return {
        success: true,
        manager: "simple-git-hooks",
        targetPath: "package.json",
        action: "already-installed",
        message: "Specty command already configured in package.json (simple-git-hooks)",
      };
    }

    if (currentHook && typeof currentHook === "string") {
      pkg["simple-git-hooks"]["pre-commit"] = `${currentHook} && ${SPECTY_HOOK_CMD}`;
    } else {
      pkg["simple-git-hooks"]["pre-commit"] = SPECTY_HOOK_CMD;
    }

    await fs.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    return {
      success: true,
      manager: "simple-git-hooks",
      targetPath: "package.json",
      action: "appended",
      message: "Updated package.json simple-git-hooks pre-commit command",
    };
  } catch (err: unknown) {
    return {
      success: false,
      manager: "simple-git-hooks",
      targetPath: "package.json",
      action: "skipped",
      message: `Failed to configure simple-git-hooks: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function uninstallSimpleGitHooks(repoRoot: string): Promise<HookUninstallResult> {
  const pkgPath = path.join(repoRoot, "package.json");
  try {
    const pkgRaw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(pkgRaw);

    const currentHook = pkg["simple-git-hooks"]?.["pre-commit"];
    if (
      !currentHook ||
      typeof currentHook !== "string" ||
      !currentHook.includes("specty check-approval")
    ) {
      return {
        success: false,
        manager: "simple-git-hooks",
        targetPath: "package.json",
        action: "not-found",
        message: "Specty hook not configured in package.json simple-git-hooks",
      };
    }

    const cleaned = currentHook
      .replace(
        new RegExp(`\\s*&&\\s*${SPECTY_HOOK_CMD.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
        "",
      )
      .replace(
        new RegExp(`${SPECTY_HOOK_CMD.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*&&\\s*`),
        "",
      )
      .replace(SPECTY_HOOK_CMD, "")
      .trim();

    if (cleaned.length === 0) {
      delete pkg["simple-git-hooks"]["pre-commit"];
      if (Object.keys(pkg["simple-git-hooks"]).length === 0) {
        delete pkg["simple-git-hooks"];
      }
    } else {
      pkg["simple-git-hooks"]["pre-commit"] = cleaned;
    }

    await fs.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    return {
      success: true,
      manager: "simple-git-hooks",
      targetPath: "package.json",
      action: "removed-entry",
      message: "Removed Specty command from package.json simple-git-hooks",
    };
  } catch {
    return {
      success: false,
      manager: "simple-git-hooks",
      targetPath: "package.json",
      action: "not-found",
      message: "Could not read package.json",
    };
  }
}
