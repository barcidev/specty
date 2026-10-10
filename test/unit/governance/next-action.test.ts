import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeApprove } from "../../../src/cli/commands/approve.js";
import { executeInit } from "../../../src/cli/commands/init.js";
import { writeChangeState } from "../../../src/engines/change-state.js";
import { determineNextAction } from "../../../src/governance/next-action.js";

describe("next-action state machine & status card", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-next-test-"));
    await executeInit({
      cwd: tmpDir,
      yes: true,
      lang: "en",
      stack: "node",
      specEngine: "builtin",
      hooks: false,
      ci: false,
      mcp: false,
    });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns PLAN_NEW_SPEC when no active changes exist", async () => {
    const report = await determineNextAction(tmpDir);
    expect(report.actionType).toBe("PLAN_NEW_SPEC");
    expect(report.prescribedCommand).toContain("specty openspec new");
    expect(report.statusCard).toBe(
      "[specty | change: none | status: clean | next: specty openspec new <change>]",
    );
  });

  it("returns AWAIT_APPROVAL when change is pending approval", async () => {
    const changeDir = path.join(tmpDir, "openspec", "changes", "user-auth");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, "proposal.md"), "# Proposal\n\nAuth feature\n");
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "- [ ] 1.1 Implement login [agent: backend] [files: src/auth/**]\n      verify: npm test\n",
    );

    const report = await determineNextAction(tmpDir, "user-auth");
    expect(report.actionType).toBe("AWAIT_APPROVAL");
    expect(report.prescribedCommand).toBe("specty approve user-auth");
    expect(report.statusCard).toContain("change: user-auth");
    expect(report.statusCard).toContain("next: specty approve user-auth");
  });

  it("returns EXECUTE_TASK with active task scope when change is approved", async () => {
    const changeDir = path.join(tmpDir, "openspec", "changes", "user-auth");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, "proposal.md"), "# Proposal\n\nAuth feature\n");
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      `# Tasks\n\n- [ ] 1.1 Implement login [agent: backend] [files: src/auth/**]\n      verify: npm test:auth\n- [ ] 2.1 UI login [agent: frontend] [files: src/ui/**]\n`,
    );

    await executeApprove("user-auth", { cwd: tmpDir, yes: true, force: true });

    const report = await determineNextAction(tmpDir, "user-auth");
    expect(report.actionType).toBe("EXECUTE_TASK");
    expect(report.activeTask?.id).toBe("1.1");
    expect(report.activeTask?.role).toBe("backend");
    expect(report.allowedFiles).toEqual(["src/auth/**"]);
    expect(report.statusCard).toBe(
      "[specty | change: user-auth | status: approved | task: 1.1 (backend) | files: src/auth/** | next: npm test:auth]",
    );
  });

  it("returns VERIFY_CHANGE when all tasks are completed but unverified", async () => {
    const changeDir = path.join(tmpDir, "openspec", "changes", "user-auth");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, "proposal.md"), "# Proposal\n\nAuth feature\n");
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      `# Tasks\n\n- [x] 1.1 Implement login [agent: backend] [files: src/auth/**]\n      verify: npm test:auth\n`,
    );

    await executeApprove("user-auth", { cwd: tmpDir, yes: true, force: true });

    const report = await determineNextAction(tmpDir, "user-auth");
    expect(report.actionType).toBe("VERIFY_CHANGE");
    expect(report.prescribedCommand).toBe("specty verify user-auth");
    expect(report.statusCard).toBe(
      "[specty | change: user-auth | status: verifying | next: specty verify user-auth]",
    );
  });

  it("returns READY_TO_ARCHIVE when verification has passed", async () => {
    const changeDir = path.join(tmpDir, "openspec", "changes", "user-auth");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, "proposal.md"), "# Proposal\n\nAuth feature\n");
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      `# Tasks\n\n- [x] 1.1 Implement login [agent: backend] [files: src/auth/**]\n      verify: npm test:auth\n`,
    );

    await executeApprove("user-auth", { cwd: tmpDir, yes: true, force: true });

    // Mark verification_passed in specty.yaml
    const existingState = await (
      await import("../../../src/engines/change-state.js")
    ).readChangeState(changeDir);
    await writeChangeState(changeDir, {
      ...existingState,
      change_id: "user-auth",
      status: "approved",
      verification_passed: true,
    });

    const report = await determineNextAction(tmpDir, "user-auth");
    expect(report.actionType).toBe("READY_TO_ARCHIVE");
    expect(report.prescribedCommand).toBe("specty openspec archive user-auth");
    expect(report.statusCard).toBe(
      "[specty | change: user-auth | status: verified | next: specty openspec archive user-auth]",
    );
  });
});
