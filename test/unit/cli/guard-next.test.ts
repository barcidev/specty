import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeGuard } from "../../../src/cli/commands/guard.js";
import { executeInit } from "../../../src/cli/commands/init.js";
import { executeNext } from "../../../src/cli/commands/next.js";
import { executeStatus } from "../../../src/cli/commands/status.js";

describe("CLI commands: guard and next", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-cli-guard-next-"));
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

  it("executeGuard blocks forbidden commands and unapproved source edits", async () => {
    // 1. Forbidden bash
    const bashBlocked = await executeGuard({
      cwd: tmpDir,
      tool: "Bash",
      command: "specty approve foo",
    });
    expect(bashBlocked).toBe(false);

    // 2. Unapproved source edit
    const editBlocked = await executeGuard({
      cwd: tmpDir,
      tool: "Edit",
      file: "src/index.ts",
    });
    expect(editBlocked).toBe(false);

    // 3. Allowed markdown edit
    const mdAllowed = await executeGuard({
      cwd: tmpDir,
      tool: "Edit",
      file: "openspec/changes/foo/proposal.md",
    });
    expect(mdAllowed).toBe(true);
  });

  it("executeNext provides prescriptive next action and status card", async () => {
    const report = await executeNext({ cwd: tmpDir });
    expect(report.actionType).toBe("PLAN_NEW_SPEC");
    expect(report.statusCard).toBe(
      "[specty | change: none | status: clean | next: specty openspec new <change>]",
    );
  });

  it("executeStatus supports --card flag returning compact status card", async () => {
    const statusReport = await executeStatus({ cwd: tmpDir, card: true });
    expect(statusReport.statusCard).toBe(
      "[specty | change: none | status: clean | next: specty openspec new <change>]",
    );
  });
});
