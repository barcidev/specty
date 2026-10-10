import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeDoctor } from "../../../src/cli/commands/doctor.js";
import { executeInit } from "../../../src/cli/commands/init.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";

describe("doctor specification semantics diagnostics", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-doc-val-test-"));
    await initGitRepo(tmpDir);
    await executeInit({
      cwd: tmpDir,
      yes: true,
      lang: "en",
      tool: "cursor",
      specEngine: "builtin",
    });
    engine = new BuiltinSpecEngine();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("reports pass for spec-semantics when active change conforms", async () => {
    await engine.createChange(tmpDir, "good-change");
    const report = await executeDoctor({ cwd: tmpDir });

    const semanticCheck = report.checks.find((c) => c.id === "spec-semantics");
    expect(semanticCheck).toBeDefined();
    expect(semanticCheck?.status).toBe("pass");
    expect(semanticCheck?.message).toContain("conform");
  });

  it("reports fail for spec-semantics when active change has malformed tasks or unresolved placeholders", async () => {
    await engine.createChange(tmpDir, "bad-change");
    const proposalPath = path.join(tmpDir, "openspec/changes/bad-change/proposal.md");
    await fs.writeFile(
      proposalPath,
      "# Proposal: Broken\n\n## Why\n{{whyDescription}}\n\n## What Changes\nChanges\n\n## Impact\nNone",
    );

    const report = await executeDoctor({ cwd: tmpDir });
    expect(report.healthy).toBe(false);

    const semanticCheck = report.checks.find((c) => c.id === "spec-semantics");
    expect(semanticCheck).toBeDefined();
    expect(semanticCheck?.status).toBe("fail");
    expect(semanticCheck?.message).toContain("bad-change");
  });
});
