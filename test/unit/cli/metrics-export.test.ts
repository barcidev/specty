import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeMetrics } from "../../../src/cli/commands/metrics.js";
import { recordMetricEvent } from "../../../src/metrics/recorder.js";

describe("CLI metrics --export command", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-cli-metrics-export-"));
    const spectyDir = path.join(tempDir, ".specty");
    await fs.mkdir(spectyDir, { recursive: true });
    await fs.writeFile(
      path.join(spectyDir, "config.yaml"),
      'schema_version: "1.0"\nlanguage: en\nspec_engine: builtin\n',
      "utf8",
    );

    await recordMetricEvent(tempDir, {
      type: "change_created",
      changeId: "001-cli-export",
    });

    await recordMetricEvent(tempDir, {
      type: "approval_granted",
      changeId: "001-cli-export",
      hash: "abc",
      approver: "lead",
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("exports default HTML report via CLI execution", async () => {
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
    let capturedStdout = "";
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((str) => {
      capturedStdout += str;
      return true;
    });

    await executeMetrics({ export: true });

    cwdSpy.mockRestore();
    stdoutSpy.mockRestore();

    expect(capturedStdout).toContain("Reporte ejecutivo de gobernanza exportado exitosamente");
    expect(capturedStdout).toContain("[HTML]");

    const reportsDir = path.join(tempDir, ".specty", "reports");
    const files = await fs.readdir(reportsDir);
    expect(files.some((f) => f.endsWith(".html"))).toBe(true);
  });

  it("exports custom Markdown report via CLI execution", async () => {
    const customOutput = path.join(tempDir, "governance.md");
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
    let capturedStdout = "";
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((str) => {
      capturedStdout += str;
      return true;
    });

    await executeMetrics({ export: customOutput, format: "markdown" });

    cwdSpy.mockRestore();
    stdoutSpy.mockRestore();

    expect(capturedStdout).toContain("[MARKDOWN]");
    expect(capturedStdout).toContain(customOutput);

    const exists = await fs
      .stat(customOutput)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    const content = await fs.readFile(customOutput, "utf8");
    expect(content).toContain("# Reporte Ejecutivo de Gobernanza");
  });
});
