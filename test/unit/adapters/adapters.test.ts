import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAdapter, getAllAdapters } from "../../../src/adapters/registry.js";
import type { AdapterContext } from "../../../src/adapters/types.js";
import {
  executeAdaptersAdd,
  executeAdaptersList,
  executeAdaptersRemove,
} from "../../../src/cli/commands/adapters.js";
import { createDefaultConfig, SUPPORTED_TOOLS, saveConfig } from "../../../src/core/config.js";
import { loadManifest } from "../../../src/core/manifest.js";

describe("tool adapters registry", () => {
  it("registers all 14 supported tools", () => {
    const all = getAllAdapters();
    expect(all).toHaveLength(14);

    for (const toolId of SUPPORTED_TOOLS) {
      const adapter = getAdapter(toolId);
      expect(adapter).toBeDefined();
      expect(adapter.id).toBe(toolId);
      expect(adapter.name.length).toBeGreaterThan(0);
    }
  });

  it("throws for unknown tool adapter", () => {
    expect(() => getAdapter("unknown-tool")).toThrow(/Unsupported tool/);
  });
});

describe("individual tool adapter generation", () => {
  const dummyCtx: AdapterContext = {
    repoRoot: "/test",
    config: createDefaultConfig(),
    language: "es",
    enableMcp: true,
  };

  it("generates expected files for Antigravity", async () => {
    const adapter = getAdapter("antigravity");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files).toHaveLength(1);
    expect(files[0]?.relativePath).toBe(".agent/rules/specty.md");
    expect(files[0]?.content).toContain("AGENTS.md");
    expect(adapter.getMcpInstructions?.("es")).toContain("Antigravity");
  });

  it("generates expected files for Claude Code with subagents and MCP", async () => {
    const adapter = getAdapter("claude");
    const files = await adapter.generateFiles(dummyCtx);
    const relPaths = files.map((f) => f.relativePath);

    expect(relPaths).toContain("CLAUDE.md");
    expect(relPaths).toContain(".claude/settings.json");
    expect(relPaths).toContain(".claude/agents/orchestrator.md");
    expect(relPaths).toContain(".claude/agents/frontend.md");
    expect(relPaths).toContain(".claude/agents/backend.md");
    expect(relPaths).toContain(".mcp.json");

    const mcpJson = files.find((f) => f.relativePath === ".mcp.json");
    const parsedMcp = JSON.parse(mcpJson?.content ?? "{}");
    expect(parsedMcp.mcpServers.specty).toBeDefined();
    expect(parsedMcp.mcpServers["codebase-memory"]).toEqual({
      command: "codebase-memory-mcp",
      args: [],
    });
  });

  it("generates expected files for Cursor with MDC and MCP", async () => {
    const adapter = getAdapter("cursor");
    const files = await adapter.generateFiles(dummyCtx);
    const relPaths = files.map((f) => f.relativePath);

    expect(relPaths).toContain(".cursor/rules/specty.mdc");
    expect(relPaths).toContain(".cursor/mcp.json");
    const mdc = files.find((f) => f.relativePath === ".cursor/rules/specty.mdc");
    expect(mdc?.content).toContain("---");
    expect(mdc?.content).toContain("alwaysApply: true");

    const mcpJson = files.find((f) => f.relativePath === ".cursor/mcp.json");
    const parsedMcp = JSON.parse(mcpJson?.content ?? "{}");
    expect(parsedMcp.mcpServers.specty).toBeDefined();
    expect(parsedMcp.mcpServers["codebase-memory"]).toBeDefined();
  });

  it("generates expected files for Copilot with VS Code MCP", async () => {
    const adapter = getAdapter("copilot");
    const files = await adapter.generateFiles(dummyCtx);
    const relPaths = files.map((f) => f.relativePath);

    expect(relPaths).toContain(".github/copilot-instructions.md");
    expect(relPaths).toContain(".vscode/mcp.json");

    const mcpJson = files.find((f) => f.relativePath === ".vscode/mcp.json");
    const parsedMcp = JSON.parse(mcpJson?.content ?? "{}");
    expect(parsedMcp.servers.specty).toBeDefined();
    expect(parsedMcp.servers["codebase-memory"]).toBeDefined();
  });

  it("generates expected files for Windsurf", async () => {
    const adapter = getAdapter("windsurf");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files[0]?.relativePath).toBe(".windsurf/rules/specty.md");
    expect(adapter.getMcpInstructions?.("es")).toContain("Windsurf");
  });

  it("generates expected files for Codex CLI (reads AGENTS.md natively)", async () => {
    const adapter = getAdapter("codex");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files).toHaveLength(0);
  });

  it("generates expected files for Gemini CLI", async () => {
    const adapter = getAdapter("gemini");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files[0]?.relativePath).toBe("GEMINI.md");
    expect(files[0]?.content).toContain("AGENTS.md");
  });

  it("generates expected files for Cline", async () => {
    const adapter = getAdapter("cline");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files[0]?.relativePath).toBe(".clinerules/specty.md");
  });

  it("generates expected files for Roo Code", async () => {
    const adapter = getAdapter("roo");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files[0]?.relativePath).toBe(".roo/rules/specty.md");
  });

  it("generates expected files for Continue", async () => {
    const adapter = getAdapter("continue");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files[0]?.relativePath).toBe(".continue/rules/specty.md");
  });

  it("generates expected files for Junie", async () => {
    const adapter = getAdapter("junie");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files[0]?.relativePath).toBe(".junie/guidelines.md");
  });

  it("generates expected files for Amazon Q Developer", async () => {
    const adapter = getAdapter("amazonq");
    const files = await adapter.generateFiles(dummyCtx);
    expect(files[0]?.relativePath).toBe(".amazonq/rules/specty.md");
  });

  it("generates expected files for Aider", async () => {
    const adapter = getAdapter("aider");
    const files = await adapter.generateFiles(dummyCtx);
    const relPaths = files.map((f) => f.relativePath);
    expect(relPaths).toContain("CONVENTIONS.md");
    expect(relPaths).toContain(".aider.conf.yml");
  });

  it("generates expected files for OpenCode with MCP and AGENTS.md instructions", async () => {
    const adapter = getAdapter("opencode");
    expect(adapter.id).toBe("opencode");
    expect(adapter.name).toBe("OpenCode");

    const files = await adapter.generateFiles(dummyCtx);
    expect(files).toHaveLength(1);
    expect(files[0]?.relativePath).toBe("opencode.json");

    const parsed = JSON.parse(files[0]?.content ?? "{}");
    expect(parsed.$schema).toBe("https://opencode.ai/config.json");
    expect(parsed.instructions).toContain("AGENTS.md");
    expect(parsed.mcp.specty).toEqual({
      type: "local",
      command: ["specty", "mcp"],
      enabled: true,
    });
    expect(parsed.mcp["codebase-memory"]).toEqual({
      type: "local",
      command: ["codebase-memory-mcp"],
      enabled: true,
    });
    expect(adapter.getMcpInstructions?.("es")).toContain("opencode.json");
    expect(adapter.getMcpInstructions?.("en")).toContain("opencode.json");
  });

  it("resolves open-code alias correctly", () => {
    const adapter = getAdapter("open-code");
    expect(adapter.id).toBe("opencode");
  });

  it("performs safe merge on existing opencode.json preserving custom configs", async () => {
    const testDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-opencode-merge-"));
    try {
      const existingConfig = {
        model: "ollama/llama3",
        theme: "dark",
        instructions: ["CUSTOM_RULES.md"],
        mcp: {
          existingServer: {
            type: "remote",
            url: "http://localhost:8080",
          },
        },
      };
      await fs.writeFile(
        path.join(testDir, "opencode.json"),
        JSON.stringify(existingConfig, null, 2),
      );

      const adapter = getAdapter("opencode");
      const files = await adapter.generateFiles({
        ...dummyCtx,
        repoRoot: testDir,
        enableMcp: true,
      });

      expect(files).toHaveLength(1);
      const merged = JSON.parse(files[0]?.content ?? "{}");
      expect(merged.model).toBe("ollama/llama3");
      expect(merged.theme).toBe("dark");
      expect(merged.instructions).toContain("CUSTOM_RULES.md");
      expect(merged.instructions).toContain("AGENTS.md");
      expect(merged.mcp.existingServer).toBeDefined();
      expect(merged.mcp.specty).toEqual({
        type: "local",
        command: ["specty", "mcp"],
        enabled: true,
      });
      expect(merged.mcp["codebase-memory"]).toBeDefined();
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  it("performs safe merge on existing opencode.json containing comments and trailing commas (JSONC)", async () => {
    const testDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-opencode-jsonc-"));
    try {
      const existingJsonc = `
      {
        // Custom model for OpenCode
        "model": "anthropic/claude-3-7-sonnet",
        "provider": "anthropic",
        /* Custom prompt instructions */
        "instructions": [
          "CUSTOM_RULE.md",
        ],
        "mcp": {
          "userCustomMcp": {
            "type": "remote",
            "url": "https://mcp.example.com",
          },
        },
      }
      `;
      await fs.writeFile(path.join(testDir, "opencode.json"), existingJsonc, "utf8");

      const adapter = getAdapter("opencode");
      const files = await adapter.generateFiles({
        ...dummyCtx,
        repoRoot: testDir,
        enableMcp: true,
      });

      expect(files).toHaveLength(1);
      const merged = JSON.parse(files[0]?.content ?? "{}");
      expect(merged.model).toBe("anthropic/claude-3-7-sonnet");
      expect(merged.provider).toBe("anthropic");
      expect(merged.instructions).toContain("CUSTOM_RULE.md");
      expect(merged.instructions).toContain("AGENTS.md");
      expect(merged.mcp.userCustomMcp).toBeDefined();
      expect(merged.mcp.specty).toBeDefined();
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  it("omits codebase-memory from MCP scaffolding when graph_provider is builtin", async () => {
    const builtinCtx: AdapterContext = {
      ...dummyCtx,
      config: createDefaultConfig({
        mcp: {
          enabled: true,
          graph_provider: "builtin",
          codebase_memory: { command: "codebase-memory-mcp", args: [], auto_index: false },
          graph: { max_file_kb: 512, exclude: [] },
        },
      }),
    };

    const opencodeAdapter = getAdapter("opencode");
    const opencodeFiles = await opencodeAdapter.generateFiles(builtinCtx);
    const opencodeJson = JSON.parse(opencodeFiles[0]?.content ?? "{}");
    expect(opencodeJson.mcp.specty).toBeDefined();
    expect(opencodeJson.mcp["codebase-memory"]).toBeUndefined();

    const cursorAdapter = getAdapter("cursor");
    const cursorFiles = await cursorAdapter.generateFiles(builtinCtx);
    const cursorMcp = JSON.parse(
      cursorFiles.find((f) => f.relativePath === ".cursor/mcp.json")?.content ?? "{}",
    );
    expect(cursorMcp.mcpServers.specty).toBeDefined();
    expect(cursorMcp.mcpServers["codebase-memory"]).toBeUndefined();
  });

  it("detects and respects .opencode/opencode.json if existing", async () => {
    const testDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-opencode-dir-"));
    try {
      await fs.mkdir(path.join(testDir, ".opencode"), { recursive: true });
      await fs.writeFile(
        path.join(testDir, ".opencode", "opencode.json"),
        JSON.stringify({ custom: true }),
      );

      const adapter = getAdapter("opencode");
      const files = await adapter.generateFiles({
        ...dummyCtx,
        repoRoot: testDir,
        enableMcp: true,
      });

      expect(files[0]?.relativePath).toBe(".opencode/opencode.json");
      expect(adapter.getExpectedFilePaths({ ...dummyCtx, repoRoot: testDir })).toEqual([
        ".opencode/opencode.json",
      ]);
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });
});

describe("adapters CLI commands: add, remove, list", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-adapters-cmd-"));
    const config = createDefaultConfig({
      tools: ["gemini"],
    });
    await saveConfig(tmpDir, config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("lists adapters without throwing", async () => {
    await expect(executeAdaptersList({ cwd: tmpDir })).resolves.not.toThrow();
  });

  it("adds a tool adapter and scaffolds its files", async () => {
    const success = await executeAdaptersAdd("cursor", { cwd: tmpDir });
    expect(success).toBe(true);

    const mdcPath = path.join(tmpDir, ".cursor/rules/specty.mdc");
    const exists = await fs
      .access(mdcPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    const manifest = await loadManifest(tmpDir);
    expect(manifest.files[".cursor/rules/specty.mdc"]).toBeDefined();
  });

  it("removes a tool adapter and cleans up its files", async () => {
    // First add cursor
    await executeAdaptersAdd("cursor", { cwd: tmpDir });
    const mdcPath = path.join(tmpDir, ".cursor/rules/specty.mdc");
    expect(
      await fs
        .access(mdcPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(true);

    // Now remove cursor
    const success = await executeAdaptersRemove("cursor", { cwd: tmpDir });
    expect(success).toBe(true);

    const existsAfter = await fs
      .access(mdcPath)
      .then(() => true)
      .catch(() => false);
    expect(existsAfter).toBe(false);

    const manifest = await loadManifest(tmpDir);
    expect(manifest.files[".cursor/rules/specty.mdc"]).toBeUndefined();
  });

  it("handles adding already enabled tool gracefully", async () => {
    const res = await executeAdaptersAdd("gemini", { cwd: tmpDir });
    expect(res).toBe(true);
  });

  it("rejects unknown tool name", async () => {
    const res = await executeAdaptersAdd("non-existent-tool", { cwd: tmpDir });
    expect(res).toBe(false);
  });

  it("adds and removes opencode adapter via CLI commands", async () => {
    const addSuccess = await executeAdaptersAdd("opencode", { cwd: tmpDir });
    expect(addSuccess).toBe(true);

    const configPath = path.join(tmpDir, "opencode.json");
    expect(
      await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(true);

    const removeSuccess = await executeAdaptersRemove("opencode", {
      cwd: tmpDir,
    });
    expect(removeSuccess).toBe(true);

    expect(
      await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(false);
  });
});
