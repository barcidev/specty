import fs from "node:fs/promises";
import path from "node:path";
import type { MetricsSummary, SpectyEvent } from "./types.js";

export async function readMetricEvents(repoRoot: string): Promise<SpectyEvent[]> {
  const eventsFile = path.join(repoRoot, ".specty", "metrics", "events.jsonl");

  try {
    const content = await fs.readFile(eventsFile, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const events: SpectyEvent[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as SpectyEvent;
        if (parsed.type && parsed.timestamp) {
          events.push(parsed);
        }
      } catch {
        // Skip corrupted line
      }
    }

    return events;
  } catch {
    return [];
  }
}

export function computeMetricsSummary(events: SpectyEvent[]): MetricsSummary {
  let totalChanges = 0;
  let totalApprovals = 0;
  let totalInvalidations = 0;
  let totalVerifications = 0;
  let passedVerifications = 0;
  let totalHandoffs = 0;
  let totalBypasses = 0;

  const verificationsByType: Record<string, { total: number; passed: number; failed: number }> = {};
  const handoffsByRole: Record<string, { from: number; to: number }> = {};
  const seenChanges = new Set<string>();

  for (const event of events) {
    switch (event.type) {
      case "change_created": {
        seenChanges.add(event.changeId);
        break;
      }

      case "approval_granted": {
        totalApprovals++;
        seenChanges.add(event.changeId);
        break;
      }

      case "approval_invalidated": {
        totalInvalidations++;
        seenChanges.add(event.changeId);
        break;
      }

      case "verification_run": {
        totalVerifications++;
        if (event.success) {
          passedVerifications++;
        }

        const cType = event.commandType || "custom";
        if (!verificationsByType[cType]) {
          verificationsByType[cType] = { total: 0, passed: 0, failed: 0 };
        }
        verificationsByType[cType].total++;
        if (event.success) {
          verificationsByType[cType].passed++;
        } else {
          verificationsByType[cType].failed++;
        }
        break;
      }

      case "handoff_recorded": {
        totalHandoffs++;
        const fromRole = event.fromRole || "unknown";
        const toRole = event.toRole || "unknown";

        const fromStats = handoffsByRole[fromRole] ?? { from: 0, to: 0 };
        fromStats.from++;
        handoffsByRole[fromRole] = fromStats;

        const toStats = handoffsByRole[toRole] ?? { from: 0, to: 0 };
        toStats.to++;
        handoffsByRole[toRole] = toStats;
        break;
      }

      case "bypass_used": {
        totalBypasses++;
        break;
      }
    }
  }

  totalChanges = seenChanges.size;

  const totalApprovalChecks = totalApprovals + totalInvalidations;
  const approvalPassRate =
    totalApprovalChecks > 0 ? Math.round((totalApprovals / totalApprovalChecks) * 100) : 100;

  const verificationSuccessRate =
    totalVerifications > 0 ? Math.round((passedVerifications / totalVerifications) * 100) : 100;

  return {
    totalEvents: events.length,
    totalChanges,
    totalApprovals,
    totalInvalidations,
    approvalPassRate,
    totalVerifications,
    verificationSuccessRate,
    verificationsByType,
    totalHandoffs,
    handoffsByRole,
    totalBypasses,
  };
}
