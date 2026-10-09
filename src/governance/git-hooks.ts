import fs from "node:fs/promises";
import path from "node:path";
import { isInsideGitRepo } from "../core/git.js";

export const PRE_COMMIT_HOOK_NAME = "pre-commit";

export const HOOK_SCRIPT = `#!/usr/bin/env sh
# Managed by specty (AI assistant governance)
if [ "$SPECTY_HOOK_DISABLED" = "1" ] || [ "$SPECTY_BYPASS" = "1" ]; then
  exit 0
fi

npx specty check-approval --staged
`;

export async function installGitHooks(repoRoot: string): Promise<boolean> {
  const isGit = await isInsideGitRepo(repoRoot);
  if (!isGit) {
    return false;
  }

  const hooksDir = path.join(repoRoot, ".git", "hooks");
  await fs.mkdir(hooksDir, { recursive: true });

  const hookFile = path.join(hooksDir, PRE_COMMIT_HOOK_NAME);
  await fs.writeFile(hookFile, HOOK_SCRIPT, { mode: 0o755 });
  await fs.chmod(hookFile, 0o755);

  return true;
}

export async function uninstallGitHooks(repoRoot: string): Promise<boolean> {
  const hookFile = path.join(repoRoot, ".git", "hooks", PRE_COMMIT_HOOK_NAME);
  try {
    const content = await fs.readFile(hookFile, "utf8");
    if (content.includes("Managed by specty")) {
      await fs.rm(hookFile, { force: true });
      return true;
    }
  } catch {
    // not found
  }
  return false;
}
