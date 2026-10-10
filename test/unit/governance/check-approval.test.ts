import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { approveChange } from "../../../src/governance/approvals.js";
import {
  BYPASS_AUDIT_FILENAME,
  checkApprovalGate,
} from "../../../src/governance/check-approval.js";
import { generateGitHubWorkflow } from "../../../src/governance/ci-templates.js";
import { installGitHooks, uninstallGitHooks } from "../../../src/governance/git-hooks.js";

describe("governance check-approval gate", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-gate-test-"));
    await initGitRepo(tmpDir);

    const config = createDefaultConfig({
      spec_engine: "builtin",
      governance: {
        hooks: true,
        ci: "github",
        source_paths: ["src/**"],
        exempt_paths: ["**/*.md", "openspec/**", ".specty/**"],
        bypass: { env: "SPECTY_BYPASS", trailer: "Specty-Bypass" },
        quality_gates: { lint: true, test: true, static: true, coverage_min: 0 },
      },
    });
    await saveConfig(tmpDir, config);

    // Initial commit so HEAD exists
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const x = 1;\n");
    await execa("git", ["config", "user.name", "Specty Tester"], { cwd: tmpDir });
    await execa("git", ["config", "user.email", "tester@specty.local"], { cwd: tmpDir });
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "initial commit"], { cwd: tmpDir });

    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
  });

  afterEach(async () => {
    delete process.env.SPECTY_BYPASS;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("passes when modifying non-governed / exempt files (e.g. README.md)", async () => {
    await fs.writeFile(path.join(tmpDir, "README.md"), "# Docs\n");
    await execa("git", ["add", "README.md"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(true);
    expect(result.modifiedSourceFiles).toHaveLength(0);
  });

  it("fails when modifying source files without an approved change", async () => {
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const x = 2;\n");
    await execa("git", ["add", "src/index.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.modifiedSourceFiles).toContain("src/index.ts");
    expect(result.reason).toContain("without an active approved change");
  });

  it("passes when source files are modified under an approved change", async () => {
    // 1. Create and approve change
    await engine.createChange(tmpDir, "auth-update", { title: "Auth Update" });
    await approveChange(tmpDir, "auth-update", { approvedBy: "Security Lead" });

    // 2. Modify source code
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const x = 99;\n");
    await execa("git", ["add", "src/index.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(true);
    expect(result.activeApprovedChange).toBe("auth-update");
  });

  it("allows emergency bypass via environment variable and logs audit entry", async () => {
    process.env.SPECTY_BYPASS = "1";

    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const hotfix = true;\n");
    await execa("git", ["add", "src/index.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, {
      stagedOnly: true,
      bypassReason: "Production crash hotfix",
    });

    expect(result.passed).toBe(true);
    expect(result.bypassed).toBe(true);

    const auditContent = await fs.readFile(path.join(tmpDir, BYPASS_AUDIT_FILENAME), "utf8");
    expect(auditContent).toContain("Production crash hotfix");
  });

  it("checks PR diff against base branch using baseRef", async () => {
    // 1. Create a feature branch with unapproved source modifications
    await execa("git", ["checkout", "-b", "feature/unapproved"], { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const prChange = true;\n");
    await execa("git", ["add", "src/index.ts"], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "feat: unapproved change"], { cwd: tmpDir });

    // Without approved change, comparing against master/main fails
    const failResult = await checkApprovalGate(tmpDir, { baseRef: "HEAD~1" });
    expect(failResult.passed).toBe(false);
    expect(failResult.modifiedSourceFiles).toContain("src/index.ts");

    // 2. Now approve a change and check again
    await engine.createChange(tmpDir, "feature-spec", { title: "Feature Spec" });
    await approveChange(tmpDir, "feature-spec");

    const passResult = await checkApprovalGate(tmpDir, { baseRef: "HEAD~1" });
    expect(passResult.passed).toBe(true);
    expect(passResult.activeApprovedChange).toBe("feature-spec");
    expect(passResult.changeDetails?.id).toBe("feature-spec");
  });

  it("detects emergency bypass from commit trailers in git log", async () => {
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const emergency = true;\n");
    await execa("git", ["add", "src/index.ts"], { cwd: tmpDir });
    await execa(
      "git",
      ["commit", "-m", "fix: critical prod patch\n\nSpecty-Bypass: Critical outage incident 789"],
      { cwd: tmpDir },
    );

    const result = await checkApprovalGate(tmpDir, { baseRef: "HEAD~1" });
    expect(result.passed).toBe(true);
    expect(result.bypassed).toBe(true);
    expect(result.bypassDetails?.source).toBe("trailer");
    expect(result.bypassDetails?.reason).toContain("Critical outage incident 789");

    const auditContent = await fs.readFile(path.join(tmpDir, BYPASS_AUDIT_FILENAME), "utf8");
    expect(auditContent).toContain("Critical outage incident 789");
  });
});

describe("git hooks and CI templates", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-hooks-test-"));
    await initGitRepo(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("installs and uninstalls pre-commit hook", async () => {
    const installed = await installGitHooks(tmpDir);
    expect(installed).toBe(true);

    const hookPath = path.join(tmpDir, ".git/hooks/pre-commit");
    const content = await fs.readFile(hookPath, "utf8");
    expect(content).toContain("specty check-approval");

    const uninstalled = await uninstallGitHooks(tmpDir);
    expect(uninstalled).toBe(true);

    const existsAfter = await fs
      .access(hookPath)
      .then(() => true)
      .catch(() => false);
    expect(existsAfter).toBe(false);
  });

  it("generates GitHub workflow template with verification commands", () => {
    const config = createDefaultConfig({
      scopes: [
        {
          path: ".",
          stack: { language: "typescript", frameworks: [] },
          verify: {
            lint: "npm run lint",
            test: "npm test",
          },
        },
      ],
    });

    const workflow = generateGitHubWorkflow(config);
    expect(workflow).toContain("specty gate --comment");
    expect(workflow).toContain("pull-requests: write");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm test");
  });
});
