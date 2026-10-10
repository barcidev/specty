import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  classifyBypassReason,
  computeGovernanceAnalytics,
  filterEventsByPeriod,
} from "../../../src/metrics/analytics.js";
import { recordMetricEvent } from "../../../src/metrics/recorder.js";
import type { SpectyEvent } from "../../../src/metrics/types.js";

describe("Governance Analytics Engine", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-analytics-test-"));
    const spectyDir = path.join(tempDir, ".specty");
    await fs.mkdir(spectyDir, { recursive: true });
    await fs.writeFile(
      path.join(spectyDir, "config.yaml"),
      'schema_version: "1.0"\nlanguage: en\nspec_engine: builtin\n',
      "utf8",
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("classifies bypass reasons accurately", () => {
    expect(classifyBypassReason("Emergency hotfix for auth crash")).toBe("incident_hotfix");
    expect(classifyBypassReason("Fix broken CI runner timeout")).toBe("ci_pipeline");
    expect(classifyBypassReason("Fix typo in README docs")).toBe("refactor_non_functional");
    expect(classifyBypassReason("Local debug testing wip")).toBe("debug_local");
    expect(classifyBypassReason("Uncategorized random modification")).toBe("other");
  });

  it("filters events by time period", () => {
    const now = Date.now();
    const eventRecent: SpectyEvent = {
      type: "bypass_used",
      reason: "hotfix",
      user: "dev",
      stagedFilesCount: 1,
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    };
    const eventOld: SpectyEvent = {
      type: "bypass_used",
      reason: "old hotfix",
      user: "dev",
      stagedFilesCount: 1,
      timestamp: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
    };

    const events = [eventRecent, eventOld];

    expect(filterEventsByPeriod(events, "7d")).toHaveLength(1);
    expect(filterEventsByPeriod(events, "30d")).toHaveLength(1);
    expect(filterEventsByPeriod(events, "90d")).toHaveLength(2);
    expect(filterEventsByPeriod(events, "all")).toHaveLength(2);
  });

  it("calculates MTTA, Compliance, Bypasses, and Subagents metrics", async () => {
    // 1. Setup sample change in openspec
    const changeDir = path.join(tempDir, "openspec", "changes", "001-auth");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "specty.yaml"),
      `change_id: 001-auth\nstatus: approved\ncreated_at: 2026-01-01T10:00:00.000Z\napproved_at: 2026-01-01T14:00:00.000Z\ntasks_total: 4\ntasks_completed: 4\n`,
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Change: 001-auth\n\nObjective: Add user auth\n",
      "utf8",
    );

    // 2. Setup handoffs in openspec
    const handoffDir = path.join(changeDir, "handoffs");
    await fs.mkdir(handoffDir, { recursive: true });
    await fs.writeFile(
      path.join(handoffDir, "001-orchestrator-to-backend.md"),
      `# Handoff: 001-orchestrator-to-backend\n\n- **From:** orchestrator\n- **To:** backend\n- **Timestamp:** 2026-01-01T12:00:00.000Z\n- **Change:** 001-auth\n\n## Completed Tasks\n- [x] Design token auth\n- [x] Create schema\n\n## Modified Files\n- \`src/auth.ts\`\n\n## Decisions Taken\n- Use JWT\n\n## Blockers & Notes\n- None\n\n## Next Steps for backend\n- [ ] Implement middleware\n`,
      "utf8",
    );

    // 3. Record metric events
    await recordMetricEvent(tempDir, {
      type: "change_created",
      changeId: "001-auth",
      timestamp: "2026-01-01T10:00:00.000Z",
    });

    await recordMetricEvent(tempDir, {
      type: "approval_granted",
      changeId: "001-auth",
      hash: "abc12345",
      approver: "lead-reviewer",
      timestamp: "2026-01-01T14:00:00.000Z",
    });

    await recordMetricEvent(tempDir, {
      type: "verification_run",
      scope: "root",
      commandType: "test",
      command: "npm test",
      exitCode: 0,
      durationMs: 150,
      success: true,
      timestamp: "2026-01-01T14:30:00.000Z",
    });

    await recordMetricEvent(tempDir, {
      type: "bypass_used",
      reason: "Urgent hotfix for server crash",
      user: "alice",
      stagedFilesCount: 2,
      timestamp: "2026-01-01T15:00:00.000Z",
    });

    const report = await computeGovernanceAnalytics(tempDir);

    // MTTA assertions (10:00 to 14:00 is 4 hours)
    expect(report.mtta.approvedCount).toBe(1);
    expect(report.mtta.meanHours).toBe(4);
    expect(report.mtta.medianHours).toBe(4);
    expect(report.mtta.items[0]?.changeId).toBe("001-auth");

    // Compliance & Health Score
    expect(report.compliance.specIntegrityRate).toBe(100);
    expect(report.compliance.verificationSuccessRate).toBe(100);
    expect(report.compliance.healthScore).toBeGreaterThan(60);

    // Bypasses
    expect(report.bypasses.totalCount).toBe(1);
    expect(report.bypasses.byCategory.incident_hotfix).toBe(1);
    expect(report.bypasses.items[0]?.user).toBe("alice");

    // Subagents
    expect(report.subagents.totalHandoffs).toBe(1);
    expect(report.subagents.tasksCompletedTotal).toBe(2);
    expect(report.subagents.taskYield).toBe(2);
    expect(report.subagents.blockerRate).toBe(0);
    expect(report.subagents.transitions).toHaveLength(1);
    expect(report.subagents.transitions[0]).toEqual({
      fromRole: "orchestrator",
      toRole: "backend",
      count: 1,
    });
  });
});
