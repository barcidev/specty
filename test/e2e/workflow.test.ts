import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeApprove } from "../../src/cli/commands/approve.js";
import { executeDoctor } from "../../src/cli/commands/doctor.js";
import { executeHandoffCreate } from "../../src/cli/commands/handoff.js";
import { executeInit } from "../../src/cli/commands/init.js";
import { checkApprovalGate } from "../../src/governance/check-approval.js";
import { readMetricEvents } from "../../src/metrics/index.js";

describe("E2E Full Governed Workflow", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-e2e-workflow-"));
    // Initialize real git repo
    await execa("git", ["init", "-b", "main"], { cwd: tempDir });
    await execa("git", ["config", "user.name", "Specty Tester"], { cwd: tempDir });
    await execa("git", ["config", "user.email", "test@specty.dev"], { cwd: tempDir });

    // Create a dummy source file
    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "src", "index.ts"),
      "export const hello = () => 'world';\n",
      "utf8",
    );
    await execa("git", ["add", "."], { cwd: tempDir });
    await execa("git", ["commit", "-m", "chore: initial commit"], { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("completes full end-to-end lifecycle: init -> change -> gate fail -> approve -> gate pass -> checkbox task -> handoff -> doctor", async () => {
    // 1. Initialize specty in repository
    await executeInit({
      cwd: tempDir,
      yes: true,
      lang: "en",
      specEngine: "builtin",
      tool: ["antigravity", "claude"],
    });

    expect(
      await fs
        .stat(path.join(tempDir, ".specty", "config.yaml"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);

    // 2. AI creates a specification change
    const changeDir = path.join(tempDir, "openspec", "changes", "001-add-login");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Proposal: User Login\nImplement OAuth login for users.\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "# Tasks\n\n- [ ] Task 1: Setup auth route\n- [ ] Task 2: Validate token\n",
      "utf8",
    );

    // 3. AI modifies governed source code
    await fs.writeFile(
      path.join(tempDir, "src", "index.ts"),
      "export const hello = () => 'logged in';\n",
      "utf8",
    );
    await execa("git", ["add", "src/index.ts"], { cwd: tempDir });

    // 4. Pre-commit Gate must FAIL because 001-add-login is not approved yet
    const failGate = await checkApprovalGate(tempDir, { stagedOnly: true });
    expect(failGate.passed).toBe(false);
    expect(failGate.reason).toContain("without an active approved change");

    // 5. Human reviews and executes specty approve
    const approved = await executeApprove("001-add-login", {
      cwd: tempDir,
      yes: true,
      user: "lead-reviewer",
    });
    expect(approved).toBe(true);

    // 6. Pre-commit Gate must now PASS
    const passGate = await checkApprovalGate(tempDir, { stagedOnly: true });
    expect(passGate.passed).toBe(true);
    expect(passGate.activeApprovedChange).toBe("001-add-login");

    // 7. Developer marks Task 1 as completed in tasks.md
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "# Tasks\n\n- [x] Task 1: Setup auth route\n- [ ] Task 2: Validate token\n",
      "utf8",
    );

    // Gate must STILL PASS thanks to normalized task hashing
    const taskDoneGate = await checkApprovalGate(tempDir, { stagedOnly: true });
    expect(taskDoneGate.passed).toBe(true);

    // 8. Agent records a handoff to QA
    const handoffSuccess = await executeHandoffCreate("001-add-login", {
      cwd: tempDir,
      from: "backend",
      to: "qa",
      tasks: "Setup auth route",
      files: "src/index.ts",
      decisions: "Used JWT with 15min expiry",
    });
    expect(handoffSuccess).toBe(true);

    // 9. Verify metrics events were recorded locally
    const metrics = await readMetricEvents(tempDir);
    expect(metrics.length).toBeGreaterThanOrEqual(2);
    expect(metrics.some((m) => m.type === "approval_granted")).toBe(true);
    expect(metrics.some((m) => m.type === "handoff_recorded")).toBe(true);

    // 10. Run doctor
    const doctorPass = await executeDoctor({ cwd: tempDir });
    expect(doctorPass.healthy).toBe(true);
  });
});
