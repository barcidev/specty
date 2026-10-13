import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { triggerCodebaseIndex } from "../../../src/mcp/indexer.js";

describe("mcp/indexer", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-indexer-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("returns indexed: false when MCP is disabled", async () => {
    const config = createDefaultConfig();
    config.mcp.enabled = false;
    await saveConfig(tempDir, config);

    const result = await triggerCodebaseIndex(tempDir, { silent: true });
    expect(result.indexed).toBe(false);
    expect(result.provider).toBe("none");
  });

  it("returns indexed: false when graph provider is not codebase-memory", async () => {
    const config = createDefaultConfig();
    config.mcp.enabled = true;
    config.mcp.graph_provider = "builtin";
    await saveConfig(tempDir, config);

    const result = await triggerCodebaseIndex(tempDir, { silent: true });
    expect(result.indexed).toBe(false);
    expect(result.provider).toBe("builtin");
  });

  it("returns indexed: false when auto_index is false", async () => {
    const config = createDefaultConfig();
    config.mcp.enabled = true;
    config.mcp.graph_provider = "codebase-memory";
    config.mcp.codebase_memory.auto_index = false;
    await saveConfig(tempDir, config);

    const result = await triggerCodebaseIndex(tempDir, { silent: true });
    expect(result.indexed).toBe(false);
    expect(result.provider).toBe("codebase-memory");
  });

  it("handles execution failure gracefully without throwing", async () => {
    const config = createDefaultConfig();
    config.mcp.enabled = true;
    config.mcp.graph_provider = "codebase-memory";
    config.mcp.codebase_memory.auto_index = true;
    config.mcp.codebase_memory.command = "non-existent-cbm-binary-12345";
    await saveConfig(tempDir, config);

    const result = await triggerCodebaseIndex(tempDir, { silent: true });
    expect(result.indexed).toBe(false);
    expect(result.provider).toBe("codebase-memory");
    expect(result.error).toBeDefined();
  });
});
