import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  executeTaskAdd,
  executeTaskComplete,
  executeTaskList,
  executeTaskNext,
} from "../../../src/cli/commands/task.js";
import { writeChangeState } from "../../../src/engines/change-state.js";

describe("cli task commands", () => {
  let tmpDir: string;
  let changeDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-cli-task-test-"));
    changeDir = path.join(tmpDir, "openspec", "changes", "feature-task-cli");
    await fs.mkdir(changeDir, { recursive: true });

    await writeChangeState(changeDir, {
      change_id: "feature-task-cli",
      status: "in-progress",
    });

    const tasksMd = `# Tasks: feature-task-cli

## 1. Core Logic
- [ ] 1.1 Implement engine  [agent: backend] [files: src/engine/*]
      verify: npm run test:engine
- [ ] 1.2 Implement ui  [agent: frontend] [files: src/ui/*]
      verify: npm run test:ui
`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksMd, "utf8");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("executeTaskNext displays active task details", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const success = await executeTaskNext("feature-task-cli", {
      cwd: tmpDir,
      json: true,
    });

    expect(success).toBe(true);
    expect(logSpy).toHaveBeenCalled();
    const output = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(output.activeTask.id).toBe("1.1");
    expect(output.activeTask.filesGlobs).toEqual(["src/engine/*"]);
  });

  it("executeTaskList lists all tasks with status", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const success = await executeTaskList("feature-task-cli", {
      cwd: tmpDir,
      json: true,
    });

    expect(success).toBe(true);
    const output = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(output.total).toBe(2);
    expect(output.completed).toBe(0);
    expect(output.activeTaskId).toBe("1.1");
  });

  it("executeTaskAdd adds a task and outputs JSON metadata", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const success = await executeTaskAdd("Add e2e tests", "feature-task-cli", {
      cwd: tmpDir,
      files: "test/e2e/*, test/specs/*",
      agent: "testing",
      verify: "npm run test:e2e",
      json: true,
    });

    expect(success).toBe(true);
    const output = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(output.addedTaskId).toBe("1.3");
    expect(output.filesGlobs).toEqual(["test/e2e/*", "test/specs/*"]);
    expect(output.role).toBe("testing");
  });

  it("executeTaskComplete completes task and reports progression", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const success = await executeTaskComplete("1.1", "feature-task-cli", {
      cwd: tmpDir,
      json: true,
    });

    expect(success).toBe(true);
    const output = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(output.completedTaskId).toBe("1.1");
    expect(output.allCompleted).toBe(false);
    expect(output.nextActiveTask.id).toBe("1.2");
  });
});
