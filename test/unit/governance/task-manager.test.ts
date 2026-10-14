import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readChangeState, writeChangeState } from "../../../src/engines/change-state.js";
import {
  addTaskToChange,
  completeTaskInChange,
  listChangeTasks,
} from "../../../src/governance/task-manager.js";

describe("task-manager", () => {
  let tmpDir: string;
  let changeDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-task-mgr-test-"));
    changeDir = path.join(tmpDir, "openspec", "changes", "test-change");
    await fs.mkdir(changeDir, { recursive: true });

    // Seed change state in specty.yaml
    await writeChangeState(changeDir, {
      change_id: "test-change",
      status: "in-progress",
    });

    // Seed tasks.md
    const tasksMd = `# Tasks: test-change

## 1. Foundation
- [ ] 1.1 First task  [agent: backend] [files: src/backend/*]
      verify: npm run test:backend
- [ ] 1.2 Second task  [agent: frontend] [files: src/frontend/*]
      verify: npm run test:frontend
`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksMd, "utf8");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("listChangeTasks", () => {
    it("lists all tasks and returns the active task", async () => {
      const { tasks, activeTask } = await listChangeTasks(tmpDir, "test-change");
      expect(tasks).toHaveLength(2);
      expect(activeTask?.id).toBe("1.1");
      expect(activeTask?.role).toBe("backend");
      expect(activeTask?.filesGlobs).toEqual(["src/backend/*"]);
      expect(activeTask?.verifyCommand).toBe("npm run test:backend");
    });
  });

  describe("addTaskToChange", () => {
    it("appends a new task with sequential numbering and scope", async () => {
      const res = await addTaskToChange(tmpDir, "test-change", {
        description: "Third task",
        role: "testing",
        filesGlobs: ["test/integration/*"],
        verifyCommand: "npm test",
      });

      expect(res.success).toBe(true);
      expect(res.addedTaskId).toBe("1.3");
      expect(res.filesGlobs).toEqual(["test/integration/*"]);
      expect(res.status).toBe("reapproval_required");

      const { tasks } = await listChangeTasks(tmpDir, "test-change");
      expect(tasks).toHaveLength(3);
      expect(tasks[2]?.id).toBe("1.3");
      expect(tasks[2]?.description).toContain("Third task");
      expect(tasks[2]?.filesGlobs).toEqual(["test/integration/*"]);
    });

    it("creates an adjustments phase when all tasks were completed", async () => {
      // Mark all tasks completed first
      await completeTaskInChange(tmpDir, "test-change", "1.1");
      await completeTaskInChange(tmpDir, "test-change", "1.2");

      // Now add a post-execution adjustment task
      const res = await addTaskToChange(tmpDir, "test-change", {
        description: "Post-execution grid adjustment",
        filesGlobs: ["src/frontend/grid.service.ts"],
      });

      expect(res.success).toBe(true);
      expect(res.addedTaskId).toBe("2.1");

      const fileContent = await fs.readFile(path.join(changeDir, "tasks.md"), "utf8");
      expect(fileContent).toContain("## 2. Ajustes y Refinamiento");
      expect(fileContent).toContain("- [ ] 2.1 Post-execution grid adjustment");
      expect(fileContent).toContain("[files: src/frontend/grid.service.ts]");
    });
  });

  describe("completeTaskInChange", () => {
    it("marks task completed and returns next active task", async () => {
      const res = await completeTaskInChange(tmpDir, "test-change", "1.1");

      expect(res.success).toBe(true);
      expect(res.completedTaskId).toBe("1.1");
      expect(res.allCompleted).toBe(false);
      expect(res.remainingCount).toBe(1);
      expect(res.nextActiveTask?.id).toBe("1.2");

      const content = await fs.readFile(path.join(changeDir, "tasks.md"), "utf8");
      expect(content).toContain("- [x] 1.1 First task");
      expect(content).toContain("- [ ] 1.2 Second task");
    });

    it("transitions state to verifying when the final task is completed", async () => {
      await completeTaskInChange(tmpDir, "test-change", "1.1");
      const res = await completeTaskInChange(tmpDir, "test-change", "1.2");

      expect(res.success).toBe(true);
      expect(res.allCompleted).toBe(true);
      expect(res.remainingCount).toBe(0);
      expect(res.nextActiveTask).toBeNull();
      expect(res.advice).toContain("specty verify test-change");

      const state = await readChangeState(changeDir);
      expect(state?.status).toBe("verifying");
    });

    it("returns error if task does not exist", async () => {
      const res = await completeTaskInChange(tmpDir, "test-change", "9.9");
      expect(res.success).toBe(false);
      expect(res.error).toContain('Task with ID "9.9" not found');
    });
  });
});
