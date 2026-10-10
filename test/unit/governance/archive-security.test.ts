import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeChangeState } from "../../../src/engines/change-state.js";
import { checkApprovalStatus } from "../../../src/governance/approvals.js";

describe("archive state security (A5)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-archive-sec-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("rejects approval for active change that sets status: archived in changes dir", async () => {
    const changeDir = path.join(tmpDir, "openspec/changes/sneaky-change");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, "proposal.md"), "# Sneaky\n");
    await fs.writeFile(path.join(changeDir, "tasks.md"), "- [ ] Task\n");

    // Attempt bypass by setting status: archived directly
    await writeChangeState(changeDir, {
      change_id: "sneaky-change",
      status: "archived",
      created_at: new Date().toISOString(),
    });

    const status = await checkApprovalStatus(tmpDir, "sneaky-change");
    expect(status.approved).toBe(false);
    expect(status.code).toBe("pending");
    expect(status.reason).toContain("cannot claim archived status to bypass governance");
  });

  it("accepts approval for legitimately archived change in archive directory with valid hash", async () => {
    const archiveDir = path.join(tmpDir, "openspec/changes/archive/legit-done");
    await fs.mkdir(archiveDir, { recursive: true });
    await fs.writeFile(path.join(archiveDir, "proposal.md"), "# Done\n");
    await fs.writeFile(path.join(archiveDir, "tasks.md"), "- [x] Done Task\n");

    await writeChangeState(archiveDir, {
      change_id: "legit-done",
      status: "archived",
      approved_at: new Date().toISOString(),
      approved_by: "Security Lead",
      content_hash: "abcd1234abcd1234abcd1234abcd1234",
    });

    const status = await checkApprovalStatus(tmpDir, "archive/legit-done");
    expect(status.approved).toBe(true);
    expect(status.code).toBe("approved");
    expect(status.approvedHash).toBe("abcd1234abcd1234abcd1234abcd1234");
  });
});
