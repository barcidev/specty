import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeValidate } from "../../../src/cli/commands/validate.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";

describe("cli validate command", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-val-cli-test-"));
    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
    const config = createDefaultConfig({ spec_engine: "builtin" });
    await saveConfig(tmpDir, config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns true when no active changes exist", async () => {
    const valid = await executeValidate(undefined, { cwd: tmpDir });
    expect(valid).toBe(true);
  });

  it("returns false and reports errors when proposal contains unresolved placeholders", async () => {
    await engine.createChange(tmpDir, "broken-proposal");
    const proposalPath = path.join(tmpDir, "openspec/changes/broken-proposal/proposal.md");
    await fs.writeFile(
      proposalPath,
      "# Proposal: Broken\n\n## Why\n{{why}}\n\n## What Changes\nChanges\n\n## Impact\nNone",
    );

    const valid = await executeValidate("broken-proposal", { cwd: tmpDir });
    expect(valid).toBe(false);
  });

  it("returns false and reports errors when tasks.md lacks checkboxes", async () => {
    await engine.createChange(tmpDir, "broken-tasks");
    const tasksPath = path.join(tmpDir, "openspec/changes/broken-tasks/tasks.md");
    await fs.writeFile(tasksPath, "# Tasks: Broken\n\n## 1. Phase\n- Not a checkbox task\n");

    const valid = await executeValidate("broken-tasks", { cwd: tmpDir });
    expect(valid).toBe(false);
  });

  it("returns true for a fully conforming change", async () => {
    await engine.createChange(tmpDir, "valid-change");
    const valid = await executeValidate("valid-change", { cwd: tmpDir });
    expect(valid).toBe(true);
  });

  it("outputs JSON report when json: true", async () => {
    await engine.createChange(tmpDir, "json-change");
    const valid = await executeValidate("json-change", { cwd: tmpDir, json: true });
    expect(valid).toBe(true);
  });
});
