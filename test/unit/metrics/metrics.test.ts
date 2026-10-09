import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeMetrics } from "../../../src/cli/commands/metrics.js";
import {
  computeMetricsSummary,
  readMetricEvents,
  recordMetricEvent,
} from "../../../src/metrics/index.js";
import type { SpectyEvent } from "../../../src/metrics/types.js";

describe("Metrics System & Events Logging", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-metrics-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("returns empty array if no events have been recorded", async () => {
    const events = await readMetricEvents(tempDir);
    expect(events).toEqual([]);

    const summary = computeMetricsSummary(events);
    expect(summary.totalEvents).toBe(0);
    expect(summary.totalChanges).toBe(0);
    expect(summary.totalApprovals).toBe(0);
    expect(summary.approvalPassRate).toBe(100);
    expect(summary.verificationSuccessRate).toBe(100);
  });

  it("records and reads multiple event types sequentially in jsonl", async () => {
    await recordMetricEvent(tempDir, {
      type: "change_created",
      changeId: "001-user-auth",
      tool: "antigravity",
    });

    await recordMetricEvent(tempDir, {
      type: "approval_granted",
      changeId: "001-user-auth",
      hash: "abc12345",
      approver: "lead-dev",
    });

    await recordMetricEvent(tempDir, {
      type: "verification_run",
      scope: "root",
      commandType: "test",
      command: "npm test",
      exitCode: 0,
      durationMs: 120,
      success: true,
    });

    await recordMetricEvent(tempDir, {
      type: "verification_run",
      scope: "root",
      commandType: "lint",
      command: "npm run lint",
      exitCode: 1,
      durationMs: 80,
      success: false,
    });

    await recordMetricEvent(tempDir, {
      type: "handoff_recorded",
      changeId: "001-user-auth",
      handoffId: "001-orchestrator-to-backend",
      fromRole: "orchestrator",
      toRole: "backend",
    });

    await recordMetricEvent(tempDir, {
      type: "bypass_used",
      reason: "urgent hotfix for outage",
      user: "oncall",
      stagedFilesCount: 2,
    });

    const events = await readMetricEvents(tempDir);
    expect(events).toHaveLength(6);
    expect(events[0]?.type).toBe("change_created");
    expect(events[1]?.type).toBe("approval_granted");
    expect(events[2]?.type).toBe("verification_run");
    expect(events[5]?.type).toBe("bypass_used");

    const summary = computeMetricsSummary(events);
    expect(summary.totalEvents).toBe(6);
    expect(summary.totalChanges).toBe(1);
    expect(summary.totalApprovals).toBe(1);
    expect(summary.totalInvalidations).toBe(0);
    expect(summary.approvalPassRate).toBe(100);
    expect(summary.totalVerifications).toBe(2);
    expect(summary.verificationSuccessRate).toBe(50);
    expect(summary.verificationsByType.test).toEqual({ total: 1, passed: 1, failed: 0 });
    expect(summary.verificationsByType.lint).toEqual({ total: 1, passed: 0, failed: 1 });
    expect(summary.totalHandoffs).toBe(1);
    expect(summary.handoffsByRole.orchestrator).toEqual({ from: 1, to: 0 });
    expect(summary.handoffsByRole.backend).toEqual({ from: 0, to: 1 });
    expect(summary.totalBypasses).toBe(1);
  });

  it("handles corrupted jsonl lines gracefully", async () => {
    const metricsDir = path.join(tempDir, ".specty", "metrics");
    await fs.mkdir(metricsDir, { recursive: true });
    const eventsFile = path.join(metricsDir, "events.jsonl");

    const validEvent: SpectyEvent = {
      type: "approval_granted",
      changeId: "002-test",
      hash: "xyz789",
      approver: "alice",
      timestamp: new Date().toISOString(),
    };

    const lines = [
      JSON.stringify(validEvent),
      "{ corrupt json ...",
      "",
      JSON.stringify({ missingType: true }),
    ].join("\n");

    await fs.writeFile(eventsFile, lines, "utf8");

    const events = await readMetricEvents(tempDir);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("approval_granted");
  });

  it("calculates approval pass rate when invalidations occur", () => {
    const events: SpectyEvent[] = [
      {
        type: "approval_granted",
        changeId: "ch-1",
        hash: "h1",
        approver: "bob",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "approval_invalidated",
        changeId: "ch-1",
        expectedHash: "h1",
        actualHash: "h2",
        timestamp: "2026-01-01T01:00:00Z",
      },
      {
        type: "approval_granted",
        changeId: "ch-1",
        hash: "h2",
        approver: "bob",
        timestamp: "2026-01-01T02:00:00Z",
      },
    ];

    const summary = computeMetricsSummary(events);
    expect(summary.totalApprovals).toBe(2);
    expect(summary.totalInvalidations).toBe(1);
    // 2 approvals out of 3 checks = 67%
    expect(summary.approvalPassRate).toBe(67);
  });

  it("executes CLI metrics command with --json output", async () => {
    // Setup specty config
    const spectyDir = path.join(tempDir, ".specty");
    await fs.mkdir(spectyDir, { recursive: true });
    await fs.writeFile(
      path.join(spectyDir, "config.yaml"),
      `schema_version: "1.0"\nlanguage: en\ntools: [antigravity]\nspec_engine: builtin\n`,
      "utf8",
    );

    await recordMetricEvent(tempDir, {
      type: "change_created",
      changeId: "003-cli-test",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
    let capturedStdout = "";
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((str) => {
      capturedStdout += str;
      return true;
    });

    await executeMetrics({ json: true });

    cwdSpy.mockRestore();
    stdoutSpy.mockRestore();

    const parsed = JSON.parse(capturedStdout);
    expect(parsed.totalEvents).toBe(1);
    expect(parsed.totalChanges).toBe(1);
  });

  it("executes CLI metrics command in human-readable mode", async () => {
    const spectyDir = path.join(tempDir, ".specty");
    await fs.mkdir(spectyDir, { recursive: true });
    await fs.writeFile(
      path.join(spectyDir, "config.yaml"),
      `schema_version: "1.0"\nlanguage: en\ntools: [antigravity]\nspec_engine: builtin\n`,
      "utf8",
    );

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
    let capturedStdout = "";
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((str) => {
      capturedStdout += str;
      return true;
    });

    await executeMetrics({});

    cwdSpy.mockRestore();
    stdoutSpy.mockRestore();

    expect(capturedStdout).toContain("specty metrics");
    expect(capturedStdout).toContain("No hay eventos ni métricas");
  });
});
