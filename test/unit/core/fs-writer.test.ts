import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyNewline, detectNewline, SafeFileWriter } from "../../../src/core/fs-writer.js";

describe("core/fs-writer", () => {
  let tempDir: string;
  let writer: SafeFileWriter;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-writer-test-"));
    writer = new SafeFileWriter(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("detects and applies newlines properly", () => {
    expect(detectNewline("a\r\nb\r\nc\r\n")).toBe("\r\n");
    expect(detectNewline("a\nb\nc\n")).toBe("\n");
    expect(applyNewline("a\nb\n", "\r\n")).toBe("a\r\nb\r\n");
  });

  it("writes a new file atomically", async () => {
    const res = await writer.writeFile("docs/spec.md", "# Test Content\n");

    expect(res.written).toBe(true);
    expect(res.backedUp).toBe(false);

    const onDisk = await fs.readFile(res.filePath, "utf8");
    expect(onDisk).toBe("# Test Content\n");
  });

  it("supports dryRun mode without modifying disk", async () => {
    const res = await writer.writeFile("docs/spec.md", "# Dry Run Content\n", { dryRun: true });

    expect(res.written).toBe(false);
    expect(res.diff).toBeDefined();

    // File should not exist on disk
    await expect(fs.access(res.filePath)).rejects.toThrow();
  });

  it("backs up existing file before overwrite", async () => {
    await writer.writeFile("file.txt", "initial content\n");

    const updateRes = await writer.writeFile("file.txt", "updated content\n", {
      createBackup: true,
    });

    expect(updateRes.written).toBe(true);
    expect(updateRes.backedUp).toBe(true);
    expect(updateRes.backupPath).toBeDefined();

    const backupContent = await fs.readFile(updateRes.backupPath as string, "utf8");
    expect(backupContent).toBe("initial content\n");
  });

  it("preserves CRLF if existing file has CRLF", async () => {
    const targetPath = path.join(tempDir, "crlf.txt");
    await fs.writeFile(targetPath, "line1\r\nline2\r\n", "utf8");

    await writer.writeFile("crlf.txt", "line1\nline2\nline3\n");

    const content = await fs.readFile(targetPath, "utf8");
    expect(content).toContain("\r\n");
    expect(content).not.toMatch(/[^\r]\n/);
  });

  it("blocks writing to sensitive files", async () => {
    await expect(writer.writeFile(".env", "SECRET=123")).rejects.toThrow("Security error");
    await expect(writer.writeFile("config/.env.local", "KEY=456")).rejects.toThrow(
      "Security error",
    );
  });

  it("blocks path traversal outside repository", async () => {
    await expect(writer.writeFile("../outside.txt", "data")).rejects.toThrow("Security error");
  });
});
