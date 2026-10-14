import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { readChangeState, writeChangeState } from "../../../src/engines/change-state.js";
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

  it("detects and logs audit when SPECTY_HOOK_DISABLED is active", async () => {
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const hookDisabled = true;\n");
    await execa("git", ["add", "src/index.ts"], { cwd: tmpDir });

    const prevEnv = process.env.SPECTY_HOOK_DISABLED;
    process.env.SPECTY_HOOK_DISABLED = "1";
    try {
      const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
      expect(result.passed).toBe(true);
      expect(result.bypassed).toBe(true);
      expect(result.bypassDetails?.reason).toContain("SPECTY_HOOK_DISABLED");

      const auditContent = await fs.readFile(path.join(tmpDir, BYPASS_AUDIT_FILENAME), "utf8");
      expect(auditContent).toContain("SPECTY_HOOK_DISABLED");
    } finally {
      if (prevEnv !== undefined) {
        process.env.SPECTY_HOOK_DISABLED = prevEnv;
      } else {
        delete process.env.SPECTY_HOOK_DISABLED;
      }
    }
  });

  it("rejects command injection attempts in baseRef", async () => {
    await expect(() => checkApprovalGate(tmpDir, { baseRef: "main; echo pwned" })).rejects.toThrow(
      /Invalid git reference/,
    );
  });

  it("fails with all_tasks_completed when all tasks in tasks.md are marked - [x] (Sqadra Incident Reproduction)", async () => {
    const changeDir = await engine.createChange(tmpDir, "adaptive-grid", {
      title: "Adaptive Grid",
    });

    // Both tasks completed
    const tasks = `# Tasks: Adaptive Grid\n\n## 1. Implementation\n- [x] 1.1 Task 1 [agent: frontend] [files: src/grid.ts]\n- [x] 1.2 Task 2 [agent: frontend] [files: src/scene.ts]\n`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasks, "utf8");
    await approveChange(tmpDir, "adaptive-grid", { approvedBy: "Lead" });

    // Simulate post-execution adjustment on src/scene.ts without new task
    await fs.writeFile(path.join(tmpDir, "src/scene.ts"), "export const scene = 'modified';\n");
    await execa("git", ["add", "src/scene.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("all_tasks_completed");
    expect(result.reason).toContain('All tasks in change "adaptive-grid" are marked completed');
  });

  it("fails with no_tasks_declared when tasks.md has no tasks declared", async () => {
    const changeDir = await engine.createChange(tmpDir, "empty-tasks-change", {
      title: "Empty Tasks Change",
    });

    const tasks = `# Tasks: Empty Tasks Change\n\n## 1. Implementation\n<!-- No tasks yet -->\n`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasks, "utf8");
    await approveChange(tmpDir, "empty-tasks-change", { approvedBy: "Lead" });

    await fs.writeFile(path.join(tmpDir, "src/scene.ts"), "export const scene = 'unplanned';\n");
    await execa("git", ["add", "src/scene.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("no_tasks_declared");
    expect(result.reason).toContain('does not declare any tasks in tasks.md');
  });

  it("fails with all_tasks_completed when change status is verifying", async () => {
    const changeDir = await engine.createChange(tmpDir, "verifying-change", {
      title: "Verifying Change",
    });
    await approveChange(tmpDir, "verifying-change");

    // Move state to verifying while preserving approval fields
    const existing = await readChangeState(changeDir);
    await writeChangeState(changeDir, {
      ...existing,
      change_id: "verifying-change",
      status: "verifying",
    });

    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const tweaked = true;\n");
    await execa("git", ["add", "src/index.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("all_tasks_completed");
    expect(result.reason).toContain("verifying");
  });

  it("fails with out_of_scope when modifying file belonging to a subsequent pending task", async () => {
    const changeDir = await engine.createChange(tmpDir, "multi-step", {
      title: "Multi Step Feature",
    });

    const tasks = `# Tasks: Multi Step\n\n## 1. Implementation\n- [ ] 1.1 Task 1 [agent: frontend] [files: src/step1.ts]\n- [ ] 1.2 Task 2 [agent: frontend] [files: src/step2.ts]\n`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasks, "utf8");
    await approveChange(tmpDir, "multi-step", { approvedBy: "Lead" });

    // Task 1.1 is active (files: src/step1.ts), but agent touches src/step2.ts
    await fs.writeFile(path.join(tmpDir, "src/step2.ts"), "export const step2 = true;\n");
    await execa("git", ["add", "src/step2.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("out_of_scope");
    expect(result.outOfScopeFiles).toContain("src/step2.ts");
    expect(result.reason).toContain(
      'outside the scope of approved change "multi-step" (active task 1.1)',
    );
  });

  it("passes when modifying file strictly matching active task scope", async () => {
    const changeDir = await engine.createChange(tmpDir, "atomic-task", {
      title: "Atomic Task",
    });

    const tasks = `# Tasks: Atomic Task\n\n## 1. Implementation\n- [ ] 1.1 Task 1 [agent: frontend] [files: src/step1.ts]\n- [ ] 1.2 Task 2 [agent: frontend] [files: src/step2.ts]\n`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasks, "utf8");
    await approveChange(tmpDir, "atomic-task", { approvedBy: "Lead" });

    // Modify file belonging to active task 1.1
    await fs.writeFile(path.join(tmpDir, "src/step1.ts"), "export const step1 = 'done';\n");
    await execa("git", ["add", "src/step1.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(true);
    expect(result.reason).toContain("active task 1.1");
  });

  it("fails with out_of_scope when active task has no declared scope but touches files reserved by subsequent tasks", async () => {
    const changeDir = await engine.createChange(tmpDir, "unscoped-active", {
      title: "Unscoped Active Task",
    });

    const tasks = `# Tasks: Unscoped Active\n\n## 1. Implementation\n- [ ] 1.1 Unscoped task [agent: backend]\n- [ ] 1.2 Scoped task [agent: frontend] [files: src/scoped.ts]\n`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasks, "utf8");
    await approveChange(tmpDir, "unscoped-active", { approvedBy: "Lead" });

    // Active task 1.1 has no scope, but touches src/scoped.ts which is reserved by task 1.2
    await fs.writeFile(path.join(tmpDir, "src/scoped.ts"), "export const reserved = true;\n");
    await execa("git", ["add", "src/scoped.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("out_of_scope");
    expect(result.outOfScopeFiles).toContain("src/scoped.ts");
    expect(result.reason).toContain("reserved by other tasks");
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
