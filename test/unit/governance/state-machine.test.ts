import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { approveChange } from "../../../src/governance/approvals.js";
import { transitionChangeState } from "../../../src/governance/state-machine.js";
import { executeVerification } from "../../../src/governance/verifier.js";

describe("state machine and lifecycle transitions (in-progress, verifying, done)", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-state-test-"));
    await initGitRepo(tmpDir, "main");

    const config = createDefaultConfig({
      spec_engine: "builtin",
      scopes: [
        {
          path: ".",
          stack: { language: "typescript", frameworks: [] },
          verify: { test: "echo 'all tests green'" },
        },
      ],
      governance: {
        hooks: true,
        ci: "github",
        source_paths: ["src/**"],
        exempt_paths: ["**/*.md", "openspec/**", "docs/**"],
        bypass: { env: "SPECTY_BYPASS", trailer: "Specty-Bypass" },
        quality_gates: { lint: true, test: true, static: true, coverage_min: 0 },
      },
    });
    await saveConfig(tmpDir, config);

    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const init = 1;\n");

    await execa("git", ["config", "user.name", "Tester"], { cwd: tmpDir });
    await execa("git", ["config", "user.email", "tester@specty.local"], { cwd: tmpDir });
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "initial commit"], { cwd: tmpDir });

    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("fails to transition to in-progress if change is still in draft", async () => {
    await engine.createChange(tmpDir, "draft-feature", { title: "Draft Feature" });

    const result = await transitionChangeState(tmpDir, "draft-feature", "in-progress");
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Invalid transition from "draft" to "in-progress"');
  });

  it("transitions approved change to in-progress successfully", async () => {
    await engine.createChange(tmpDir, "approved-feature", { title: "Approved Feature" });
    await approveChange(tmpDir, "approved-feature", { approvedBy: "Lead" });

    const result = await transitionChangeState(tmpDir, "approved-feature", "in-progress");
    expect(result.success).toBe(true);
    expect(result.fromStatus).toBe("approved");
    expect(result.toStatus).toBe("in-progress");

    const change = await engine.getChange(tmpDir, "approved-feature");
    expect(change?.status).toBe("in-progress");
  });

  it("fails to transition to done if tasks remain incomplete", async () => {
    const _changeDir = await engine.createChange(tmpDir, "incomplete-feature", {
      title: "Incomplete Feature",
    });
    await approveChange(tmpDir, "incomplete-feature", { approvedBy: "Lead" });
    await transitionChangeState(tmpDir, "incomplete-feature", "in-progress");

    // tasks.md has incomplete task: - [ ] 1.1 Initial task
    const result = await transitionChangeState(tmpDir, "incomplete-feature", "done");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("task(s) remain incomplete");
  });

  it("fails to transition to done if verification evidence is missing or failed", async () => {
    const changeDir = await engine.createChange(tmpDir, "unverified-feature", {
      title: "Unverified Feature",
    });

    // Mark task completed
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "# Tasks\n\n## 1. Implementation\n- [x] 1.1 Done task [agent: backend] [files: src/**]\n",
      "utf8",
    );
    await approveChange(tmpDir, "unverified-feature", { approvedBy: "Lead" });
    await transitionChangeState(tmpDir, "unverified-feature", "in-progress");

    // Try done without running verify
    const result = await transitionChangeState(tmpDir, "unverified-feature", "done");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("No verification evidence found");
  });

  it("transitions to done when 100% of tasks are completed and verification passed on current HEAD", async () => {
    const changeDir = await engine.createChange(tmpDir, "full-feature", { title: "Full Feature" });

    // Mark tasks completed
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "# Tasks\n\n## 1. Implementation\n- [x] 1.1 All done [agent: backend] [files: src/**]\n",
      "utf8",
    );
    await approveChange(tmpDir, "full-feature", { approvedBy: "Lead" });
    await transitionChangeState(tmpDir, "full-feature", "in-progress");

    // Commit change to git
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "implement full feature"], { cwd: tmpDir });

    // Run verification to generate verification.json for HEAD
    const report = await executeVerification(tmpDir, { changeId: "full-feature" });
    expect(report.passed).toBe(true);

    const result = await transitionChangeState(tmpDir, "full-feature", "done");
    expect(result.success).toBe(true);
    expect(result.toStatus).toBe("done");

    const change = await engine.getChange(tmpDir, "full-feature");
    expect(change?.status).toBe("done");
  });

  it("transitions from done to archived", async () => {
    const changeDir = await engine.createChange(tmpDir, "ready-to-archive", {
      title: "Archive Me",
    });
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "# Tasks\n\n## 1. Implementation\n- [x] 1.1 Done [agent: backend] [files: src/**]\n",
      "utf8",
    );
    await approveChange(tmpDir, "ready-to-archive", { approvedBy: "Lead" });
    await transitionChangeState(tmpDir, "ready-to-archive", "in-progress");

    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "ready to archive commit"], { cwd: tmpDir });

    await executeVerification(tmpDir, { changeId: "ready-to-archive" });
    await transitionChangeState(tmpDir, "ready-to-archive", "done");

    const archiveResult = await transitionChangeState(tmpDir, "ready-to-archive", "archived");
    expect(archiveResult.success).toBe(true);
    expect(archiveResult.toStatus).toBe("archived");
  });
});
