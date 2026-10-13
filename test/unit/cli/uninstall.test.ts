import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeInit } from "../../../src/cli/commands/init.js";
import { executeUninstall } from "../../../src/cli/commands/uninstall.js";
import { getRegisteredCommands } from "../../../src/cli/index.js";
import { checkGitHooksStatus, installGitHooks } from "../../../src/governance/git-hooks.js";

describe("CLI uninstall command", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-cli-uninstall-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("registers uninstall, eject and remove commands in CLI entrypoint", () => {
    const commands = getRegisteredCommands();
    expect(commands).toContain("uninstall");
    expect(commands).toContain("eject");
    expect(commands).toContain("remove");
  });

  it("handles repository with no specty gracefully", async () => {
    const success = await executeUninstall({
      cwd: tempDir,
      yes: true,
    });
    expect(success).toBe(true);
  });

  it("performs partial uninstallation preserving openspec historical records", async () => {
    // 1. Initialize Specty
    await executeInit({
      yes: true,
      cwd: tempDir,
      skipGlobalInstall: true,
    });

    // 2. Simulate historical change and spec
    const changeDir = path.join(tempDir, "openspec/changes/user-auth-feature");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Proposal\nHistorical change completed by team",
      "utf8",
    );

    const specDir = path.join(tempDir, "openspec/specs/auth");
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(
      path.join(specDir, "spec.md"),
      "# Spec\nAuth capability specification",
      "utf8",
    );

    // Install hook explicitly to test removal
    await installGitHooks(tempDir);
    const hookBefore = await checkGitHooksStatus(tempDir);
    expect(hookBefore.active).toBe(true);

    // 3. Run partial uninstall
    const success = await executeUninstall({
      cwd: tempDir,
      yes: true,
    });
    expect(success).toBe(true);

    // 4. Verify openspec is preserved
    const proposalExists = await fs
      .access(path.join(changeDir, "proposal.md"))
      .then(() => true)
      .catch(() => false);
    expect(proposalExists).toBe(true);

    const specExists = await fs
      .access(path.join(specDir, "spec.md"))
      .then(() => true)
      .catch(() => false);
    expect(specExists).toBe(true);

    // 5. Verify Specty scaffolding files are deleted
    const agentsMdExists = await fs
      .access(path.join(tempDir, "AGENTS.md"))
      .then(() => true)
      .catch(() => false);
    expect(agentsMdExists).toBe(false);

    const configYamlExists = await fs
      .access(path.join(tempDir, ".specty/config.yaml"))
      .then(() => true)
      .catch(() => false);
    expect(configYamlExists).toBe(false);

    const manifestExists = await fs
      .access(path.join(tempDir, ".specty/manifest.json"))
      .then(() => true)
      .catch(() => false);
    expect(manifestExists).toBe(false);

    // 6. Verify adapters were deleted
    const cursorRuleExists = await fs
      .access(path.join(tempDir, ".cursor/rules/specty.mdc"))
      .then(() => true)
      .catch(() => false);
    expect(cursorRuleExists).toBe(false);

    const antigravityRuleExists = await fs
      .access(path.join(tempDir, ".agents/rules/specty.md"))
      .then(() => true)
      .catch(() => false);
    expect(antigravityRuleExists).toBe(false);

    // 7. Verify git hooks are uninstalled
    const hookAfter = await checkGitHooksStatus(tempDir);
    expect(hookAfter.active).toBe(false);
  });

  it("performs total uninstallation purging openspec and .specty entirely with --all", async () => {
    // 1. Initialize Specty
    await executeInit({
      yes: true,
      cwd: tempDir,
      skipGlobalInstall: true,
    });

    // 2. Add sample change in openspec
    const changeDir = path.join(tempDir, "openspec/changes/purge-feature");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, "proposal.md"), "# Proposal\nTo be purged", "utf8");

    // 3. Run total uninstall with all: true
    const success = await executeUninstall({
      cwd: tempDir,
      all: true,
      yes: true,
    });
    expect(success).toBe(true);

    // 4. Verify openspec is completely deleted
    const openspecExists = await fs
      .access(path.join(tempDir, "openspec"))
      .then(() => true)
      .catch(() => false);
    expect(openspecExists).toBe(false);

    // 5. Verify .specty is completely deleted
    const spectyDirExists = await fs
      .access(path.join(tempDir, ".specty"))
      .then(() => true)
      .catch(() => false);
    expect(spectyDirExists).toBe(false);

    // 6. Verify AGENTS.md is deleted
    const agentsMdExists = await fs
      .access(path.join(tempDir, "AGENTS.md"))
      .then(() => true)
      .catch(() => false);
    expect(agentsMdExists).toBe(false);

    // 7. Verify hooks are deactivated
    const hookStatus = await checkGitHooksStatus(tempDir);
    expect(hookStatus.active).toBe(false);
  });

  it("does not delete files in dry-run mode", async () => {
    // 1. Initialize Specty
    await executeInit({
      yes: true,
      cwd: tempDir,
      skipGlobalInstall: true,
    });

    await installGitHooks(tempDir);

    // 2. Run dry-run uninstall
    const success = await executeUninstall({
      cwd: tempDir,
      dryRun: true,
      yes: true,
    });
    expect(success).toBe(true);

    // 3. Verify files remain untouched
    const agentsMdExists = await fs
      .access(path.join(tempDir, "AGENTS.md"))
      .then(() => true)
      .catch(() => false);
    expect(agentsMdExists).toBe(true);

    const configYamlExists = await fs
      .access(path.join(tempDir, ".specty/config.yaml"))
      .then(() => true)
      .catch(() => false);
    expect(configYamlExists).toBe(true);

    const hookStatus = await checkGitHooksStatus(tempDir);
    expect(hookStatus.active).toBe(true);
  });
});
