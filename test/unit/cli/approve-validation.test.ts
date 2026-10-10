import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeApprove } from "../../../src/cli/commands/approve.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { checkApprovalStatus } from "../../../src/governance/approvals.js";

describe("approve command semantic validation gatekeeper", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-appr-val-"));
    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
    const config = createDefaultConfig({ spec_engine: "builtin" });
    await saveConfig(tmpDir, config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("blocks approval when proposal.md contains unresolved mustache placeholders", async () => {
    await engine.createChange(tmpDir, "change-with-placeholders");
    const proposalPath = path.join(tmpDir, "openspec/changes/change-with-placeholders/proposal.md");
    await fs.writeFile(
      proposalPath,
      "# Proposal: Unfinished\n\n## Why\n{{whyDescription}}\n\n## What Changes\n- Item 1\n\n## Impact\nNone",
    );

    const approved = await executeApprove("change-with-placeholders", {
      cwd: tmpDir,
      yes: true,
    });
    expect(approved).toBe(false);

    const status = await checkApprovalStatus(tmpDir, "change-with-placeholders");
    expect(status.approved).toBe(false);
  });

  it("blocks approval when tasks.md has no markdown checkboxes", async () => {
    await engine.createChange(tmpDir, "change-bad-tasks");
    const tasksPath = path.join(tmpDir, "openspec/changes/change-bad-tasks/tasks.md");
    await fs.writeFile(
      tasksPath,
      "# Tasks: Malformed\n\n## 1. Implementation\n- Just text without checkboxes\n",
    );

    const approved = await executeApprove("change-bad-tasks", {
      cwd: tmpDir,
      yes: true,
    });
    expect(approved).toBe(false);

    const status = await checkApprovalStatus(tmpDir, "change-bad-tasks");
    expect(status.approved).toBe(false);
  });

  it("allows approval of defective change when --force flag is specified", async () => {
    await engine.createChange(tmpDir, "change-forced");
    const proposalPath = path.join(tmpDir, "openspec/changes/change-forced/proposal.md");
    await fs.writeFile(
      proposalPath,
      "# Proposal: Incomplete\n\n## Why\n{{placeholder}}\n\n## What Changes\nChanges\n\n## Impact\nImpact",
    );

    const approved = await executeApprove("change-forced", {
      cwd: tmpDir,
      yes: true,
      force: true,
    });
    expect(approved).toBe(true);

    const status = await checkApprovalStatus(tmpDir, "change-forced");
    expect(status.approved).toBe(true);
  });

  it("blocks approval in --strict mode when tasks lack Specty metadata tags", async () => {
    await engine.createChange(tmpDir, "change-strict-warning");
    const tasksPath = path.join(tmpDir, "openspec/changes/change-strict-warning/tasks.md");
    // Checkbox exists, but missing [agent: ...], [files: ...] and verify: lines
    await fs.writeFile(
      tasksPath,
      "# Tasks: Strict Test\n\n## 1. Implementation\n- [ ] 1.1 Simple task without metadata\n",
    );

    // Normal mode passes (warnings don't block)
    const normalApprove = await executeApprove("change-strict-warning", {
      cwd: tmpDir,
      yes: true,
      strict: false,
    });
    expect(normalApprove).toBe(true);

    // Create another change for strict mode
    await engine.createChange(tmpDir, "change-strict-fail");
    const failTasksPath = path.join(tmpDir, "openspec/changes/change-strict-fail/tasks.md");
    await fs.writeFile(
      failTasksPath,
      "# Tasks: Strict Test\n\n## 1. Implementation\n- [ ] 1.1 Simple task without metadata\n",
    );

    const strictApprove = await executeApprove("change-strict-fail", {
      cwd: tmpDir,
      yes: true,
      strict: true,
    });
    expect(strictApprove).toBe(false);
  });

  it("approves conforming specification without errors", async () => {
    await engine.createChange(tmpDir, "conforming-change");
    const approved = await executeApprove("conforming-change", {
      cwd: tmpDir,
      yes: true,
      user: "Auditor",
    });
    expect(approved).toBe(true);

    const status = await checkApprovalStatus(tmpDir, "conforming-change");
    expect(status.approved).toBe(true);
    expect(status.approvedBy).toBe("Auditor");
  });
});
