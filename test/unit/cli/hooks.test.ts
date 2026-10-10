import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeHooksInstall, executeHooksUninstall } from "../../../src/cli/commands/hooks.js";
import { initGitRepo } from "../../../src/core/git.js";

describe("CLI hooks install and uninstall commands", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-cli-hooks-test-"));
    await initGitRepo(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("executeHooksInstall installs native hook in non-interactive mode", async () => {
    const success = await executeHooksInstall({ cwd: tmpDir, yes: true });
    expect(success).toBe(true);

    const hookExists = await fs
      .access(path.join(tmpDir, ".git/hooks/pre-commit"))
      .then(() => true)
      .catch(() => false);
    expect(hookExists).toBe(true);

    const content = await fs.readFile(path.join(tmpDir, ".git/hooks/pre-commit"), "utf8");
    expect(content).toContain("specty check-approval");
  });

  it("executeHooksInstall targets husky when manager option is specified", async () => {
    const success = await executeHooksInstall({
      cwd: tmpDir,
      manager: "husky",
      yes: true,
    });
    expect(success).toBe(true);

    const huskyHook = await fs.readFile(path.join(tmpDir, ".husky/pre-commit"), "utf8");
    expect(huskyHook).toContain("specty check-approval");
  });

  it("executeHooksUninstall removes hook and reports success", async () => {
    await executeHooksInstall({ cwd: tmpDir, yes: true });

    const uninstalled = await executeHooksUninstall({ cwd: tmpDir });
    expect(uninstalled).toBe(true);

    const hookExists = await fs
      .access(path.join(tmpDir, ".git/hooks/pre-commit"))
      .then(() => true)
      .catch(() => false);
    expect(hookExists).toBe(false);
  });

  it("fails gracefully outside of a git repository", async () => {
    const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-non-git-"));
    try {
      const success = await executeHooksInstall({ cwd: nonGitDir, yes: true });
      expect(success).toBe(false);
    } finally {
      await fs.rm(nonGitDir, { recursive: true, force: true });
    }
  });
});
