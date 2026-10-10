import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeInit } from "../../../src/cli/commands/init.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { CodeGraph } from "../../../src/mcp/graph.js";
import { getMcpToolDefinitions, handleMcpToolCall } from "../../../src/mcp/tools.js";

describe("SQLite code graph", () => {
  let graph: CodeGraph;

  beforeEach(() => {
    graph = new CodeGraph(":memory:");
  });

  afterEach(() => {
    graph.close();
  });

  it("indexes symbols and dependencies from source code", () => {
    const code = `
import { helper } from "./utils.js";
import express from "express";

export interface UserDto {
  id: string;
}

export type UserId = string;

export class UserService {
  async findUser(): Promise<UserDto> {
    return { id: "1" };
  }
}

export function parseToken() {
  return true;
}
`;

    graph.indexFile("src/user.ts", code);

    const stats = graph.getStats();
    expect(stats.filesCount).toBe(1);
    expect(stats.symbolsCount).toBeGreaterThanOrEqual(4);
    expect(stats.depsCount).toBe(2);

    // Symbols query
    const userSymbols = graph.findSymbols("User");
    const names = userSymbols.map((s) => s.name);
    expect(names).toContain("UserDto");
    expect(names).toContain("UserId");
    expect(names).toContain("UserService");

    // Dependencies query
    const deps = graph.getDependencies("src/user.ts");
    expect(deps).toContain("./utils.js");
    expect(deps).toContain("express");
  });
});

describe("MCP tools definitions and dispatch", () => {
  let tmpDir: string;
  let graph: CodeGraph;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-mcp-test-"));
    graph = new CodeGraph(":memory:");
    graph.indexFile(
      "src/main.ts",
      'import { run } from "./lib.js";\nexport function start() { return run(); }',
    );

    await executeInit({
      cwd: tmpDir,
      yes: true,
      lang: "es",
      specEngine: "builtin",
      tool: "cursor",
    });

    const engine = new BuiltinSpecEngine();
    await engine.createChange(tmpDir, "mcp-feat", { title: "MCP Feature" });
  });

  afterEach(async () => {
    graph.close();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("exposes all 8 core MCP tools with schemas", () => {
    const tools = getMcpToolDefinitions();
    expect(tools).toHaveLength(8);

    const names = tools.map((t) => t.name);
    expect(names).toContain("specty_get_active_change");
    expect(names).toContain("specty_validate_change");
    expect(names).toContain("specty_get_rules");
    expect(names).toContain("specty_get_agent_role");
    expect(names).toContain("specty_get_latest_handoff");
    expect(names).toContain("specty_record_handoff");
    expect(names).toContain("specty_get_code_graph");
    expect(names).toContain("specty_verify");
  });

  it("handles specty_get_active_change", async () => {
    const res = await handleMcpToolCall("specty_get_active_change", {}, tmpDir, graph);
    expect(res.change).toBeDefined();
    expect(res.change.id).toBe("mcp-feat");
    expect(res.proposal).toContain("MCP Feature");
  });

  it("handles specty_validate_change", async () => {
    const res = await handleMcpToolCall("specty_validate_change", {}, tmpDir, graph);
    expect(res.changeId).toBe("mcp-feat");
    expect(res.valid).toBe(true);
    expect(res.errorsCount).toBe(0);
  });

  it("handles specty_get_rules", async () => {
    const res = await handleMcpToolCall(
      "specty_get_rules",
      { taskType: "api", languageOrFramework: "typescript" },
      tmpDir,
      graph,
    );
    expect(res["task:api"]).toBeDefined();
    expect(res["lang:typescript"]).toBeDefined();
  });

  it("handles specty_get_agent_role", async () => {
    const res = await handleMcpToolCall(
      "specty_get_agent_role",
      { role: "orchestrator" },
      tmpDir,
      graph,
    );
    expect(res.role).toBe("orchestrator");
    expect(res.content).toContain("Orchestrator");
  });

  it("handles handoff recording and retrieval", async () => {
    const recordRes = await handleMcpToolCall(
      "specty_record_handoff",
      {
        changeId: "mcp-feat",
        fromRole: "orchestrator",
        toRole: "backend",
        tasksCompleted: ["Task 1"],
        filesModified: ["src/main.ts"],
        decisions: ["Decision 1"],
      },
      tmpDir,
      graph,
    );
    expect(recordRes.success).toBe(true);

    const latest = await handleMcpToolCall(
      "specty_get_latest_handoff",
      { changeId: "mcp-feat" },
      tmpDir,
      graph,
    );
    expect("id" in latest).toBe(true);
    if ("id" in latest) {
      expect(latest.id).toContain("orchestrator-to-backend");
      expect(latest.tasksCompleted).toContain("Task 1");
    }
  });

  it("handles specty_get_code_graph", async () => {
    const res = await handleMcpToolCall(
      "specty_get_code_graph",
      { query: "start", filePath: "src/main.ts" },
      tmpDir,
      graph,
    );
    expect(res.provider).toBe("codebase-memory");
    expect(res.notice).toContain("codebase-memory-mcp");
    expect(res.symbols).toHaveLength(1);
    expect(res.symbols[0]?.name).toBe("start");
    expect(res.dependencies).toContain("./lib.js");
  });

  it("throws on unknown tool", async () => {
    await expect(handleMcpToolCall("non_existent_tool", {}, tmpDir, graph)).rejects.toThrow(
      /Unknown MCP tool/,
    );
  });
});
