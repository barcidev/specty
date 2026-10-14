import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeInit } from "../../../src/cli/commands/init.js";
import { writeChangeState } from "../../../src/engines/change-state.js";
import { getMcpToolDefinitions, handleMcpToolCall } from "../../../src/mcp/tools.js";

describe("mcp task tools", () => {
  let tmpDir: string;
  let changeDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-mcp-task-test-"));
    await executeInit({
      cwd: tmpDir,
      yes: true,
      lang: "es",
      specEngine: "builtin",
      tool: "antigravity",
    });

    changeDir = path.join(tmpDir, "openspec", "changes", "change-mcp");
    await fs.mkdir(changeDir, { recursive: true });

    await writeChangeState(changeDir, {
      change_id: "change-mcp",
      status: "in-progress",
    });

    const tasksMd = `# Tasks: change-mcp

## 1. Domain
- [ ] 1.1 Create domain model  [agent: data] [files: src/domain/*]
      verify: npm run test:domain
- [ ] 1.2 Implement service  [agent: backend] [files: src/service/*]
      verify: npm run test:service
`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksMd, "utf8");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("exposes task tools in getMcpToolDefinitions", () => {
    const defs = getMcpToolDefinitions();
    const names = defs.map((d) => d.name);
    expect(names).toContain("specty_task_next");
    expect(names).toContain("specty_task_list");
    expect(names).toContain("specty_task_add");
    expect(names).toContain("specty_task_complete");
  });

  it("handles specty_task_next", async () => {
    const res = await handleMcpToolCall("specty_task_next", { changeId: "change-mcp" }, tmpDir);

    expect(res.changeId).toBe("change-mcp");
    expect(res.allCompleted).toBe(false);
    expect(res.activeTask?.id).toBe("1.1");
    expect(res.activeTask?.filesGlobs).toEqual(["src/domain/*"]);
  });

  it("handles specty_task_list", async () => {
    const res = await handleMcpToolCall("specty_task_list", { changeId: "change-mcp" }, tmpDir);

    expect(res.changeId).toBe("change-mcp");
    expect(res.total).toBe(2);
    expect(res.completed).toBe(0);
    expect(res.activeTaskId).toBe("1.1");
    expect(res.tasks).toHaveLength(2);
  });

  it("handles specty_task_add", async () => {
    const res = await handleMcpToolCall(
      "specty_task_add",
      {
        changeId: "change-mcp",
        description: "Add integration tests",
        filesGlobs: ["test/integration/*"],
        role: "testing",
        verifyCommand: "npm run test:integration",
      },
      tmpDir,
    );

    expect(res.success).toBe(true);
    expect(res.addedTaskId).toBe("1.3");
    expect(res.filesGlobs).toEqual(["test/integration/*"]);
    expect(res.status).toBe("reapproval_required");
  });

  it("handles specty_task_complete", async () => {
    const res = await handleMcpToolCall(
      "specty_task_complete",
      {
        changeId: "change-mcp",
        taskId: "1.1",
      },
      tmpDir,
    );

    expect(res.success).toBe(true);
    expect(res.completedTaskId).toBe("1.1");
    expect(res.allCompleted).toBe(false);
    expect(res.nextActiveTask?.id).toBe("1.2");
  });
});
