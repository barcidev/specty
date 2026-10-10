import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildMcpServersConfig } from "../../../src/adapters/common.js";
import { executeInit } from "../../../src/cli/commands/init.js";
import { executeMcpAdd, executeMcpList, executeMcpRemove } from "../../../src/cli/commands/mcp.js";
import { createDefaultConfig, loadConfig } from "../../../src/core/config.js";
import { getMcpPreset, listMcpPresets } from "../../../src/mcp/presets.js";

describe("mcp/custom-servers", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-mcp-custom-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("lists all available 3rd-party presets", () => {
    const presets = listMcpPresets();
    const ids = presets.map((p) => p.id);
    expect(ids).toContain("jira");
    expect(ids).toContain("azure-devops");
    expect(ids).toContain("postgres");
    expect(ids).toContain("figma");
    expect(ids).toContain("github");

    const jira = getMcpPreset("jira");
    expect(jira?.server.command).toBe("npx");
    expect(jira?.server.env?.JIRA_URL).toBeDefined();
    expect(jira?.server.roles).toContain("orchestrator");
  });

  it("merges custom_servers into buildMcpServersConfig for tool adapters", () => {
    const config = createDefaultConfig({
      mcp: {
        custom_servers: {
          figma: {
            command: "npx",
            args: ["-y", "figma-mcp-server"],
            env: { FIGMA_ACCESS_TOKEN: "secret" },
          },
        },
      },
    });

    const servers = buildMcpServersConfig({
      repoRoot: tempDir,
      config,
      language: "es",
      enableMcp: true,
    });

    expect(servers.specty).toBeDefined();
    expect(servers["codebase-memory"]).toBeDefined();
    expect(servers.figma).toBeDefined();
    expect(servers.figma?.command).toBe("npx");
    expect(servers.figma?.args).toContain("figma-mcp-server");
    expect(servers.figma?.env?.FIGMA_ACCESS_TOKEN).toBe("secret");
  });

  it("registers preset MCP server via executeMcpAdd and propagates to editor files", async () => {
    await executeInit({
      yes: true,
      cwd: tempDir,
    });

    // 1. Add Jira preset
    const added = await executeMcpAdd("jira", {
      preset: "jira",
      cwd: tempDir,
    });
    expect(added).toBe(true);

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.mcp.custom_servers.jira).toBeDefined();
    expect(savedConfig.mcp.custom_servers.jira?.command).toBe("npx");

    // Check Claude .mcp.json propagation
    const claudeMcpPath = path.join(tempDir, ".mcp.json");
    const claudeMcp = JSON.parse(await fs.readFile(claudeMcpPath, "utf8"));
    expect(claudeMcp.mcpServers.jira).toBeDefined();
    expect(claudeMcp.mcpServers.jira.command).toBe("npx");
    expect(claudeMcp.mcpServers.jira.env.JIRA_URL).toBeDefined();

    // Check VS Code .vscode/mcp.json propagation
    const vscodeMcpPath = path.join(tempDir, ".vscode/mcp.json");
    const vscodeMcp = JSON.parse(await fs.readFile(vscodeMcpPath, "utf8"));
    expect(vscodeMcp.servers.jira).toBeDefined();

    // Check Cursor .cursor/mcp.json propagation
    const cursorMcpPath = path.join(tempDir, ".cursor/mcp.json");
    const cursorMcp = JSON.parse(await fs.readFile(cursorMcpPath, "utf8"));
    expect(cursorMcp.mcpServers.jira).toBeDefined();

    // Check Zed .zed/settings.json propagation
    const zedSettingsPath = path.join(tempDir, ".zed/settings.json");
    const zedSettings = JSON.parse(await fs.readFile(zedSettingsPath, "utf8"));
    expect(zedSettings.context_servers.jira).toBeDefined();

    // 2. List servers without throwing
    await expect(executeMcpList({ cwd: tempDir })).resolves.not.toThrow();

    // 3. Remove Jira and verify clean up in editor files
    const removed = await executeMcpRemove("jira", { cwd: tempDir });
    expect(removed).toBe(true);

    const configAfterRemove = await loadConfig(tempDir);
    expect(configAfterRemove.mcp.custom_servers.jira).toBeUndefined();

    const claudeAfterRemove = JSON.parse(await fs.readFile(claudeMcpPath, "utf8"));
    expect(claudeAfterRemove.mcpServers.jira).toBeUndefined();

    const vscodeAfterRemove = JSON.parse(await fs.readFile(vscodeMcpPath, "utf8"));
    expect(vscodeAfterRemove.servers.jira).toBeUndefined();
  });
});
