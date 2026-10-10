import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeGovernanceAnalytics,
  exportGovernanceReport,
  generateHtmlReport,
  generateMarkdownReport,
} from "../../../src/metrics/index.js";
import { recordMetricEvent } from "../../../src/metrics/recorder.js";

describe("Governance Report Exporters", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-exporters-test-"));
    const spectyDir = path.join(tempDir, ".specty");
    await fs.mkdir(spectyDir, { recursive: true });
    await fs.writeFile(
      path.join(spectyDir, "config.yaml"),
      'schema_version: "1.0"\nlanguage: en\nspec_engine: builtin\n',
      "utf8",
    );

    // Setup dummy change & events
    const changeDir = path.join(tempDir, "openspec", "changes", "feat-metrics");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "specty.yaml"),
      `change_id: feat-metrics\nstatus: approved\ncreated_at: 2026-01-01T08:00:00.000Z\napproved_at: 2026-01-01T12:00:00.000Z\ntasks_total: 2\ntasks_completed: 2\n`,
      "utf8",
    );

    await recordMetricEvent(tempDir, {
      type: "change_created",
      changeId: "feat-metrics",
      timestamp: "2026-01-01T08:00:00.000Z",
    });

    await recordMetricEvent(tempDir, {
      type: "approval_granted",
      changeId: "feat-metrics",
      hash: "abc",
      approver: "auditor",
      timestamp: "2026-01-01T12:00:00.000Z",
    });

    await recordMetricEvent(tempDir, {
      type: "bypass_used",
      reason: "Emergency hotfix outage",
      user: "bob",
      stagedFilesCount: 1,
      timestamp: "2026-01-01T13:00:00.000Z",
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("generates markdown executive report with valid structure", async () => {
    const report = await computeGovernanceAnalytics(tempDir);
    const markdown = generateMarkdownReport(report);

    expect(markdown).toContain("# Reporte Ejecutivo de Gobernanza y Analítica");
    expect(markdown).toContain("MTTA Promedio");
    expect(markdown).toContain("Tasa de Cumplimiento General");
    expect(markdown).toContain("Frecuencia de Bypass de Emergencia");
    expect(markdown).toContain("`feat-metrics`");
    expect(markdown).toContain("Emergency hotfix outage");
  });

  it("generates standalone HTML executive report with inline SVGs", async () => {
    const report = await computeGovernanceAnalytics(tempDir);
    const html = generateHtmlReport(report);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<svg");
    expect(html).toContain("Specty Governance & Analytics");
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain("feat-metrics");
    expect(html).toContain("Emergency hotfix outage");
    expect(html).toContain("toggleTheme");
  });

  it("exports report to disk in HTML format by default", async () => {
    const result = await exportGovernanceReport(tempDir);

    expect(result.generatedFiles).toHaveLength(1);
    expect(result.generatedFiles[0]?.format).toBe("html");
    const htmlFile = result.generatedFiles[0]?.path;
    expect(htmlFile).toBeDefined();
    if (!htmlFile) throw new Error("Expected htmlFile to be defined");

    const exists = await fs
      .stat(htmlFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(htmlFile, "utf8");
    expect(content).toContain("<!DOCTYPE html>");
  });

  it("exports report to disk in Markdown format when requested", async () => {
    const targetFile = path.join(tempDir, "custom-report.md");
    const result = await exportGovernanceReport(tempDir, {
      outputPath: targetFile,
      format: "markdown",
    });

    expect(result.generatedFiles).toHaveLength(1);
    expect(result.generatedFiles[0]?.format).toBe("markdown");
    expect(result.generatedFiles[0]?.path).toBe(targetFile);

    const content = await fs.readFile(targetFile, "utf8");
    expect(content).toContain("# Reporte Ejecutivo de Gobernanza");
  });

  it("exports both formats when format is all", async () => {
    const result = await exportGovernanceReport(tempDir, { format: "all" });

    expect(result.generatedFiles).toHaveLength(2);
    const formats = result.generatedFiles.map((f) => f.format);
    expect(formats).toContain("html");
    expect(formats).toContain("markdown");
  });
});
