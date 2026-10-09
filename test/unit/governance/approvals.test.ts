import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeApprove } from "../../../src/cli/commands/approve.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { approveChange, checkApprovalStatus } from "../../../src/governance/approvals.js";
import {
  computeChangeContentHash,
  normalizeTasksForHashing,
} from "../../../src/governance/hashing.js";

describe("content hashing and task normalization", () => {
  it("normalizes task completion checkboxes identically", () => {
    const raw = "- [ ] Task 1\n- [x] Task 2\n- [X] Task 3";
    const normalized = normalizeTasksForHashing(raw);

    expect(normalized).toBe("- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3");
  });

  it("yields identical hash when only task checkboxes change from [ ] to [x]", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "specty-hash-"));
    try {
      await fs.writeFile(path.join(tmp, "proposal.md"), "# Proposal\nDo something useful.");
      await fs.writeFile(path.join(tmp, "tasks.md"), "# Tasks\n- [ ] Task A\n- [ ] Task B");

      const hash1 = await computeChangeContentHash(tmp);

      // Complete Task A
      await fs.writeFile(path.join(tmp, "tasks.md"), "# Tasks\n- [x] Task A\n- [ ] Task B");
      const hash2 = await computeChangeContentHash(tmp);

      expect(hash1).toBe(hash2);

      // Now add a new task: hash must change!
      await fs.writeFile(
        path.join(tmp, "tasks.md"),
        "# Tasks\n- [x] Task A\n- [ ] Task B\n- [ ] Task C",
      );
      const hash3 = await computeChangeContentHash(tmp);

      expect(hash3).not.toBe(hash1);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe("governance approvals lifecycle", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-approve-"));
    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
    const config = createDefaultConfig({ spec_engine: "builtin" });
    await saveConfig(tmpDir, config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("approves change and invalidates on scope drift", async () => {
    await engine.createChange(tmpDir, "feature-x", { title: "Feature X" });

    // 1. Initial status is pending
    const initial = await checkApprovalStatus(tmpDir, "feature-x");
    expect(initial.approved).toBe(false);
    expect(initial.code).toBe("pending");

    // 2. Approve change
    const record = await approveChange(tmpDir, "feature-x", {
      approvedBy: "Alice",
    });
    expect(record.approvedBy).toBe("Alice");
    expect(record.contentHash).toBeDefined();

    // 3. Status is now approved
    const afterApproval = await checkApprovalStatus(tmpDir, "feature-x");
    expect(afterApproval.approved).toBe(true);
    expect(afterApproval.code).toBe("approved");

    // 4. Audit log was appended
    const auditFile = path.join(tmpDir, ".specty/audit/approvals.jsonl");
    const auditLog = await fs.readFile(auditFile, "utf8");
    expect(auditLog).toContain("feature-x");
    expect(auditLog).toContain("Alice");

    // 5. Complete a task: status remains approved
    const tasksPath = path.join(tmpDir, "openspec/changes/feature-x/tasks.md");
    const currentTasks = await fs.readFile(tasksPath, "utf8");
    await fs.writeFile(tasksPath, currentTasks.replace("- [ ]", "- [x]"));

    const afterTaskDone = await checkApprovalStatus(tmpDir, "feature-x");
    expect(afterTaskDone.approved).toBe(true);

    // 6. Modify proposal text: requires re-approval!
    const proposalPath = path.join(tmpDir, "openspec/changes/feature-x/proposal.md");
    await fs.appendFile(proposalPath, "\nAdditional unauthorized scope change!");

    const afterDrift = await checkApprovalStatus(tmpDir, "feature-x");
    expect(afterDrift.approved).toBe(false);
    expect(afterDrift.code).toBe("reapproval_required");
  });

  it("CLI executeApprove approves change in non-interactive mode", async () => {
    await engine.createChange(tmpDir, "cli-feature");

    const success = await executeApprove("cli-feature", {
      cwd: tmpDir,
      yes: true,
      user: "CLI User",
    });
    expect(success).toBe(true);

    const status = await checkApprovalStatus(tmpDir, "cli-feature");
    expect(status.approved).toBe(true);
    expect(status.approvedBy).toBe("CLI User");
  });

  it("CLI executeApprove handles non-existent change gracefully", async () => {
    const res = await executeApprove("missing-change", {
      cwd: tmpDir,
      yes: true,
    });
    expect(res).toBe(false);
  });
});
