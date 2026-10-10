import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  AVAILABLE_STACKS,
  executePlaygroundClean,
  executePlaygroundInit,
  executePlaygroundList,
} from "../../../src/cli/commands/playground.js";

describe("CLI: specty playground", () => {
  it("exposes all 16 supported stacks with valid metadata", () => {
    expect(AVAILABLE_STACKS.length).toBe(16);
    for (const stack of AVAILABLE_STACKS) {
      expect(stack.id).toBeTruthy();
      expect(stack.name).toBeTruthy();
      expect(stack.category).toBeTruthy();
      expect(stack.description).toBeTruthy();
    }
  });

  it("lists all stacks to console", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await executePlaygroundList();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("throws error for unknown stack", async () => {
    await expect(executePlaygroundInit("non-existent-stack", { yes: true })).rejects.toThrow(
      "Stack desconocido: 'non-existent-stack'",
    );
  });

  it("scaffolds an isolated playground with PLAYGROUND_GUIDE.md and git repo", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-playground-test-"));

    try {
      const generatedPath = await executePlaygroundInit("fastapi-app", {
        dir: tempDir,
        lang: "es",
        yes: true,
      });

      expect(generatedPath).toBe(tempDir);

      // Check config file
      const configExists = await fs
        .stat(path.join(tempDir, ".specty", "config.yaml"))
        .then(() => true)
        .catch(() => false);
      expect(configExists).toBe(true);

      // Check PLAYGROUND_GUIDE.md
      const guideExists = await fs
        .stat(path.join(tempDir, "PLAYGROUND_GUIDE.md"))
        .then(() => true)
        .catch(() => false);
      expect(guideExists).toBe(true);

      const guideContent = await fs.readFile(path.join(tempDir, "PLAYGROUND_GUIDE.md"), "utf8");
      expect(guideContent).toContain("FastAPI");
      expect(guideContent).toContain("specty approve");

      // Check clean command
      await executePlaygroundClean({ dir: tempDir });
      const dirAfterClean = await fs
        .stat(tempDir)
        .then(() => true)
        .catch(() => false);
      expect(dirAfterClean).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
