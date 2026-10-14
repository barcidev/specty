import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { getCurrentBranch, initGitRepo, listLocalBranches } from "../../../src/core/git.js";
import { closeFeatureBranch } from "../../../src/governance/branch-manager.js";

describe("closeFeatureBranch governance", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-branch-mgr-test-"));
    await initGitRepo(tmpDir, "main");

    await execa("git", ["config", "user.name", "Tester"], { cwd: tmpDir });
    await execa("git", ["config", "user.email", "tester@specty.local"], { cwd: tmpDir });

    await fs.writeFile(path.join(tmpDir, "README.md"), "# Initial", "utf8");
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "chore: initial commit"], { cwd: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("merges and closes feature branch into main in feature-branch workflow", async () => {
    const config = createDefaultConfig({
      git: { workflow: "feature-branch" },
    });
    await saveConfig(tmpDir, config);

    // Create and switch to feature branch
    await execa("git", ["checkout", "-b", "feature/user-auth"], { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "auth.ts"), "export const auth = true;\n", "utf8");
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "feat(auth): add auth module"], { cwd: tmpDir });

    const result = await closeFeatureBranch(tmpDir, "user-auth");
    expect(result.success).toBe(true);
    expect(result.closedBranch).toBe("feature/user-auth");
    expect(result.targetBranch).toBe("main");
    expect(result.merged).toBe(true);
    expect(result.deleted).toBe(true);

    const current = await getCurrentBranch(tmpDir);
    expect(current).toBe("main");

    const branches = await listLocalBranches(tmpDir);
    expect(branches).not.toContain("feature/user-auth");

    const authExists = await fs
      .stat(path.join(tmpDir, "auth.ts"))
      .then(() => true)
      .catch(() => false);
    expect(authExists).toBe(true);
  });

  it("merges and closes feature branch into develop in gitflow workflow", async () => {
    // Create develop branch from main
    await execa("git", ["checkout", "-b", "develop"], { cwd: tmpDir });

    const config = createDefaultConfig({
      git: { workflow: "gitflow" },
    });
    await saveConfig(tmpDir, config);

    // Create feature branch
    await execa("git", ["checkout", "-b", "feature/cart-checkout"], { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "cart.ts"), "export const cart = 1;\n", "utf8");
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "feat(cart): add cart"], { cwd: tmpDir });

    const result = await closeFeatureBranch(tmpDir, "cart-checkout");
    expect(result.success).toBe(true);
    expect(result.closedBranch).toBe("feature/cart-checkout");
    expect(result.targetBranch).toBe("develop");

    const current = await getCurrentBranch(tmpDir);
    expect(current).toBe("develop");

    const branches = await listLocalBranches(tmpDir);
    expect(branches).not.toContain("feature/cart-checkout");
  });

  it("handles centralized workflow without deleting branches", async () => {
    const config = createDefaultConfig({
      git: { workflow: "centralized" },
    });
    await saveConfig(tmpDir, config);

    const result = await closeFeatureBranch(tmpDir, "some-change");
    expect(result.success).toBe(true);
    expect(result.targetBranch).toBe("main");
    expect(result.message).toContain("Centralized workflow");
  });

  it("supports dryRun without executing git mutations", async () => {
    const config = createDefaultConfig({
      git: { workflow: "feature-branch" },
    });
    await saveConfig(tmpDir, config);

    await execa("git", ["checkout", "-b", "feature/dry-test"], { cwd: tmpDir });

    const result = await closeFeatureBranch(tmpDir, "dry-test", { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.closedBranch).toBe("feature/dry-test");
    expect(result.targetBranch).toBe("main");

    const current = await getCurrentBranch(tmpDir);
    expect(current).toBe("feature/dry-test");

    const branches = await listLocalBranches(tmpDir);
    expect(branches).toContain("feature/dry-test");
  });
});
