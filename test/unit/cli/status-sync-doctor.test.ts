import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeDoctor } from "../../../src/cli/commands/doctor.js";
import { executeInit } from "../../../src/cli/commands/init.js";
import { executeStatus } from "../../../src/cli/commands/status.js";
import { executeSync } from "../../../src/cli/commands/sync.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { approveChange } from "../../../src/governance/approvals.js";

describe("cli status, sync, and doctor commands", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-status-sync-test-"));
    await initGitRepo(tmpDir);
    await executeInit({
      cwd: tmpDir,
      yes: true,
      lang: "es",
      tool: "cursor,claude",
      specEngine: "builtin",
    });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("executeStatus reports accurate project state", async () => {
    const engine = new BuiltinSpecEngine();
    await engine.createChange(tmpDir, "new-login", { title: "New Login Flow" });
    await approveChange(tmpDir, "new-login", { approvedBy: "Tester" });

    const status = await executeStatus({ cwd: tmpDir, json: true });

    expect(status.language).toBe("es");
    expect(status.specEngine).toBe("builtin");
    expect(status.tools).toContain("cursor");
    expect(status.tools).toContain("claude");
    expect(status.changes).toHaveLength(1);
    expect(status.changes[0]?.id).toBe("new-login");
    expect(status.changes[0]?.approvalCode).toBe("approved");
    expect(status.reapprovalNeededCount).toBe(0);
  });

  it("executeSync resynchronizes tool configurations", async () => {
    const syncRes = await executeSync({ cwd: tmpDir });
    expect(syncRes.generation.files.length).toBeGreaterThan(10);

    // Verify key files exist
    const agentsExists = await fs
      .access(path.join(tmpDir, "AGENTS.md"))
      .then(() => true)
      .catch(() => false);
    expect(agentsExists).toBe(true);

    const cursorMdcExists = await fs
      .access(path.join(tmpDir, ".cursor/rules/specty.mdc"))
      .then(() => true)
      .catch(() => false);
    expect(cursorMdcExists).toBe(true);
  });

  it("executeDoctor reports healthy repository and repairs missing files with --fix", async () => {
    // 1. Initial healthy state
    const report1 = await executeDoctor({ cwd: tmpDir });
    expect(report1.healthy).toBe(true);
    expect(report1.checks.every((c) => c.status !== "fail")).toBe(true);

    // 2. Delete AGENTS.md to trigger a failure
    await fs.rm(path.join(tmpDir, "AGENTS.md"));

    const report2 = await executeDoctor({ cwd: tmpDir });
    expect(report2.healthy).toBe(false);
    expect(report2.checks.some((c) => c.id === "agents-md" && c.status === "fail")).toBe(true);

    // 3. Run doctor with --fix: should automatically repair
    await executeDoctor({ cwd: tmpDir, fix: true });
    // After fixing, AGENTS.md should exist again
    const agentsRestored = await fs
      .access(path.join(tmpDir, "AGENTS.md"))
      .then(() => true)
      .catch(() => false);
    expect(agentsRestored).toBe(true);
  });
});
