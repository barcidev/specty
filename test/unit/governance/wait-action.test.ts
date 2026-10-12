import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeWait } from "../../../src/cli/commands/wait.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { approveChange } from "../../../src/governance/approvals.js";
import { waitForChangeAction } from "../../../src/governance/wait-action.js";
import { saveChangeReviews } from "../../../src/ui/reviews.js";

describe("waitForChangeAction & executeWait", () => {
  let tmp: string;
  const changeId = "feature-wait-test";

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "specty-wait-"));
    const config = createDefaultConfig();
    await saveConfig(tmp, config);

    const changeDir = path.join(tmp, "openspec", "changes", changeId);
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Proposal: Initial Version\n\n## Why\nInitial why content.",
    );
    await fs.writeFile(path.join(changeDir, "tasks.md"), "# Tasks\n\n- [ ] 1.1 Task one");
    await fs.writeFile(path.join(changeDir, "specty.yaml"), `id: ${changeId}\nstatus: draft\n`);
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("detects when a plan is approved asynchronously", async () => {
    // Programar aprobación en 150ms
    setTimeout(async () => {
      await approveChange(tmp, changeId, { approvedBy: "test-user" });
    }, 150);

    const result = await waitForChangeAction(tmp, changeId, {
      timeoutMs: 3000,
      pollIntervalMs: 50,
    });

    expect(result.action).toBe("approved");
    expect(result.changeId).toBe(changeId);
    expect(result.details?.approvedBy).toBe("test-user");
  });

  it("detects when proposal.md is updated", async () => {
    const proposalPath = path.join(tmp, "openspec", "changes", changeId, "proposal.md");

    setTimeout(async () => {
      await fs.writeFile(proposalPath, "# Proposal: Updated Version\n\n## Why\nUpdated content.");
    }, 150);

    const result = await waitForChangeAction(tmp, changeId, {
      timeoutMs: 3000,
      pollIntervalMs: 50,
    });

    expect(result.action).toBe("updated");
    expect(result.changeId).toBe(changeId);
  });

  it("detects when reviews are applied and resolved", async () => {
    // Guardar reviews pendientes al inicio
    await saveChangeReviews(tmp, changeId, [
      {
        id: "rev-1",
        sectionId: "why",
        comment: "Please refine why",
        resolved: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    // Resolver el review en 150ms
    setTimeout(async () => {
      await saveChangeReviews(tmp, changeId, [
        {
          id: "rev-1",
          sectionId: "why",
          comment: "Please refine why",
          resolved: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    }, 150);

    const result = await waitForChangeAction(tmp, changeId, {
      timeoutMs: 3000,
      pollIntervalMs: 50,
    });

    expect(result.action).toBe("updated");
    expect(result.changeId).toBe(changeId);
  });

  it("returns timeout when no action occurs within timeoutMs", async () => {
    const result = await waitForChangeAction(tmp, changeId, {
      timeoutMs: 150,
      pollIntervalMs: 40,
    });

    expect(result.action).toBe("timeout");
    expect(result.changeId).toBe(changeId);
  });

  it("executes CLI executeWait with --json option", async () => {
    setTimeout(async () => {
      await approveChange(tmp, changeId, { approvedBy: "cli-tester" });
    }, 100);

    const result = await executeWait(changeId, {
      cwd: tmp,
      timeout: 3,
      poll: 40,
      json: true,
    });

    expect(result.action).toBe("approved");
    expect(result.changeId).toBe(changeId);
  });
});
