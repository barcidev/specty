import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeInit } from "../../../src/cli/commands/init.js";
import { loadConfig } from "../../../src/core/config.js";

describe("cli/commands/init", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-cli-init-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("initializes repository with defaults in non-interactive mode", async () => {
    const res = await executeInit({
      yes: true,
      cwd: tempDir,
    });

    expect(res.applied).toBe(true);
    expect(res.canceled).toBe(false);
    expect(res.language).toBe("es");

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.language).toBe("es");
    expect(savedConfig.spec_engine).toBe("openspec");
    expect(savedConfig.tools.length).toBeGreaterThan(10);
    expect(savedConfig.governance.hooks).toBe(true);
    expect(savedConfig.governance.ci).toBe("github");
    expect(savedConfig.mcp.enabled).toBe(true);
  });

  it("honors language flag --lang en", async () => {
    const res = await executeInit({
      yes: true,
      lang: "en",
      cwd: tempDir,
    });

    expect(res.language).toBe("en");
    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.language).toBe("en");
  });

  it("does not write configuration in dry-run mode", async () => {
    const res = await executeInit({
      yes: true,
      dryRun: true,
      cwd: tempDir,
    });

    expect(res.dryRun).toBe(true);
    expect(res.applied).toBe(false);

    // .specty/config.yaml must not exist
    await expect(loadConfig(tempDir)).rejects.toThrow();
  });

  it("filters specific tools when --tool is provided", async () => {
    await executeInit({
      yes: true,
      tool: "claude,cursor",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.tools).toEqual(["claude", "cursor"]);
  });

  it("disables hooks, ci, and mcp when flags are passed", async () => {
    await executeInit({
      yes: true,
      hooks: false,
      ci: false,
      mcp: false,
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.governance.hooks).toBe(false);
    expect(savedConfig.governance.ci).toBe("none");
    expect(savedConfig.mcp.enabled).toBe(false);
  });

  it("supports --spec-engine builtin", async () => {
    await executeInit({
      yes: true,
      specEngine: "builtin",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.spec_engine).toBe("builtin");
  });

  it("detects existing stack during init and configures scope", async () => {
    await fs.writeFile(
      path.join(tempDir, "pubspec.yaml"),
      "name: flutter_app\ndependencies:\n  flutter:\n    sdk: flutter\n",
    );

    const res = await executeInit({
      yes: true,
      cwd: tempDir,
    });

    expect(res.inferredStack).toBe("dart");
    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.scopes[0]?.stack.language).toBe("dart");
    expect(savedConfig.scopes[0]?.stack.frameworks).toContain("flutter");
  });

  it("configures default git workflow and commit convention in config and generates rules", async () => {
    await executeInit({
      yes: true,
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.git.workflow).toBe("feature-branch");
    expect(savedConfig.git.commit_convention).toBe("conventional");

    const ruleFile = await fs.readFile(path.join(tempDir, ".specty/rules/core/git.md"), "utf8");
    expect(ruleFile).toContain("Feature Branch Workflow");
    expect(ruleFile).toContain("Conventional Commits");
  });

  it("configures custom git workflow and hybrid commit convention via flags", async () => {
    await executeInit({
      yes: true,
      gitWorkflow: "gitflow",
      commitConvention: "gitmoji-conventional-ticket",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.git.workflow).toBe("gitflow");
    expect(savedConfig.git.commit_convention).toBe("gitmoji-conventional-ticket");

    const ruleFile = await fs.readFile(path.join(tempDir, ".specty/rules/core/git.md"), "utf8");
    expect(ruleFile).toContain("GitFlow");
    expect(ruleFile).toContain("Híbrido: Gitmoji + Conventional Commits + Tickets");
    expect(ruleFile).toContain("✨ feat(auth): [PROJ-123] add google oauth2 login");
  });
});
