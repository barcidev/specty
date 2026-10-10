import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import yaml from "yaml";
import { executeVerify } from "../../../src/cli/commands/verify.js";
import { createDefaultConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { readChangeState } from "../../../src/engines/change-state.js";
import {
  executeVerification,
  parseTaskVerificationCommands,
} from "../../../src/governance/verifier.js";

describe("Specty Verifier (specty verify)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-verifier-test-"));
    await initGitRepo(tmpDir);

    // Write minimal config
    const config = createDefaultConfig({
      language: "es",
      spec_engine: "builtin",
      scopes: [
        {
          path: ".",
          stack: { language: "typescript", frameworks: [] },
          verify: {
            lint: "node -e 'process.exit(0)'",
            test: "node -e 'process.exit(0)'",
          },
        },
      ],
    });
    await fs.mkdir(path.join(tmpDir, ".specty"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".specty", "config.yaml"), yaml.stringify(config), "utf8");

    // Commit baseline so git HEAD exists
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "chore: initial commit"], { cwd: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("parseTaskVerificationCommands correctly parses verify: commands under tasks", () => {
    const markdown = `# Tasks: Sample Change
## 1. Implementation
- [ ] 1.1 Implement user login service [agent: backend] [files: src/auth/**]
  verify: npm test test/auth.test.ts
- [x] 1.2 Write documentation [agent: orchestrator] [files: docs/**]
  verify: npm run lint:docs
- [ ] 1.3 Task without verification [agent: frontend] [files: src/ui/**]
`;

    const items = parseTaskVerificationCommands(markdown);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      id: "1.1",
      description: "1.1 Implement user login service [agent: backend] [files: src/auth/**]",
      command: "npm test test/auth.test.ts",
      completed: false,
    });
    expect(items[1]).toEqual({
      id: "1.2",
      description: "1.2 Write documentation [agent: orchestrator] [files: docs/**]",
      command: "npm run lint:docs",
      completed: true,
    });
  });

  it("executeVerification runs stack and task verifications and persists verification.json", async () => {
    const engine = new BuiltinSpecEngine();
    await engine.createChange(tmpDir, "test-feature", { title: "Test Feature" });

    const changeDir = path.join(tmpDir, "openspec", "changes", "test-feature");
    const tasksContent = `# Tasks: Test Feature
## 1. Implementation
- [ ] 1.1 First task [agent: backend] [files: src/**]
  verify: node -e 'process.exit(0)'
`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksContent, "utf8");

    const report = await executeVerification(tmpDir, { changeId: "test-feature" });

    expect(report.passed).toBe(true);
    expect(report.commitSha).toBeTruthy();
    expect(report.changeId).toBe("test-feature");
    expect(report.stackResults).toHaveLength(2);
    expect(report.tasksResults).toHaveLength(1);
    expect(report.tasksResults[0]?.command).toBe("node -e 'process.exit(0)'");
    expect(report.tasksResults[0]?.passed).toBe(true);

    // Verify verification.json exists
    const evidenceRaw = await fs.readFile(path.join(changeDir, "verification.json"), "utf8");
    const evidence = JSON.parse(evidenceRaw);
    expect(evidence.passed).toBe(true);
    expect(evidence.commitSha).toBe(report.commitSha);

    // Verify specty.yaml was updated with verification_passed: true
    const state = await readChangeState(changeDir);
    expect(state?.verification_passed).toBe(true);
  });

  it("executeVerification marks passed as false when a task command fails", async () => {
    const engine = new BuiltinSpecEngine();
    await engine.createChange(tmpDir, "failing-feature", { title: "Failing Feature" });

    const changeDir = path.join(tmpDir, "openspec", "changes", "failing-feature");
    const tasksContent = `# Tasks: Failing Feature
## 1. Implementation
- [ ] 1.1 Broken task [agent: backend] [files: src/**]
  verify: node -e 'process.exit(1)'
`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksContent, "utf8");

    const report = await executeVerification(tmpDir, { changeId: "failing-feature" });

    expect(report.passed).toBe(false);
    expect(report.tasksResults[0]?.passed).toBe(false);
    expect(report.tasksResults[0]?.exitCode).toBe(1);

    const state = await readChangeState(changeDir);
    expect(state?.verification_passed).toBe(false);
  });

  it("executeVerify CLI command returns boolean and supports JSON mode", async () => {
    const passed = await executeVerify(undefined, { cwd: tmpDir, json: true });
    expect(passed).toBe(true);
  });
});
