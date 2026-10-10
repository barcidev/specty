import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { readChangeState } from "../engines/change-state.js";
import { getSpecEngine } from "../engines/factory.js";
import type { GateBypassRecord } from "../governance/check-approval.js";
import { listHandoffs } from "../handoff/manager.js";
import type { HandoffRecord } from "../handoff/types.js";
import { computeMetricsSummary, readMetricEvents } from "./reader.js";
import type {
  BypassItem,
  BypassMetrics,
  BypassReasonCategory,
  ComplianceMetrics,
  GovernanceExecutiveReport,
  MTTAChangeItem,
  MTTAMetrics,
  ReportPeriod,
  SpectyEvent,
  SubagentHandoffEdge,
  SubagentMetrics,
  SubagentRoleStats,
} from "./types.js";

export interface AnalyticsOptions {
  period?: ReportPeriod;
  title?: string;
}

export function filterEventsByPeriod(events: SpectyEvent[], period?: ReportPeriod): SpectyEvent[] {
  if (!period || period === "all") {
    return events;
  }

  const now = Date.now();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  return events.filter((e) => {
    const time = new Date(e.timestamp).getTime();
    return !Number.isNaN(time) && time >= cutoff;
  });
}

export function classifyBypassReason(reason: string): BypassReasonCategory {
  const lower = reason.toLowerCase();
  if (
    lower.includes("hotfix") ||
    lower.includes("incident") ||
    lower.includes("p0") ||
    lower.includes("p1") ||
    lower.includes("outage") ||
    lower.includes("emergencia") ||
    lower.includes("urgente") ||
    lower.includes("urgent")
  ) {
    return "incident_hotfix";
  }

  if (
    lower.includes("ci") ||
    lower.includes("pipeline") ||
    lower.includes("action") ||
    lower.includes("runner") ||
    lower.includes("timeout")
  ) {
    return "ci_pipeline";
  }

  if (
    lower.includes("doc") ||
    lower.includes("readme") ||
    lower.includes("typo") ||
    lower.includes("comment") ||
    lower.includes("refactor") ||
    lower.includes("chore")
  ) {
    return "refactor_non_functional";
  }

  if (
    lower.includes("debug") ||
    lower.includes("test") ||
    lower.includes("local") ||
    lower.includes("wip") ||
    lower.includes("temp")
  ) {
    return "debug_local";
  }

  return "other";
}

export async function readBypassAuditRecords(repoRoot: string): Promise<GateBypassRecord[]> {
  const auditPath = path.join(repoRoot, ".specty", "audit", "bypasses.jsonl");
  try {
    const content = await fs.readFile(auditPath, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const records: GateBypassRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line));
      } catch {
        // Skip corrupted line
      }
    }
    return records;
  } catch {
    return [];
  }
}

export async function computeGovernanceAnalytics(
  repoRoot: string,
  options: AnalyticsOptions = {},
): Promise<GovernanceExecutiveReport> {
  const period = options.period ?? "all";
  const allEvents = await readMetricEvents(repoRoot);
  const events = filterEventsByPeriod(allEvents, period);
  const summary = computeMetricsSummary(events);

  const config = await loadConfig(repoRoot).catch(() => ({ spec_engine: "builtin" as const }));
  const engine = getSpecEngine(config.spec_engine);
  const changes = await engine.listChanges(repoRoot).catch(() => []);

  // 1. Compute MTTA
  const changeCreationTimes = new Map<string, string>();
  const changeFirstApprovalTimes = new Map<string, string>();
  const changeReapprovalsCount = new Map<string, number>();

  // Extract from events first
  for (const event of events) {
    if (event.type === "change_created") {
      if (!changeCreationTimes.has(event.changeId)) {
        changeCreationTimes.set(event.changeId, event.timestamp);
      }
    } else if (event.type === "approval_granted") {
      if (!changeFirstApprovalTimes.has(event.changeId)) {
        changeFirstApprovalTimes.set(event.changeId, event.timestamp);
      } else {
        const count = changeReapprovalsCount.get(event.changeId) ?? 0;
        changeReapprovalsCount.set(event.changeId, count + 1);
      }
    }
  }

  // Fallback to disk inspect for changes
  const mttaItems: MTTAChangeItem[] = [];
  const durationsHours: number[] = [];

  for (const ch of changes) {
    const changeDir = ch.path || path.join(repoRoot, "openspec", "changes", ch.id);
    const state = await readChangeState(changeDir).catch(() => null);

    let createdAt = changeCreationTimes.get(ch.id);
    if (!createdAt) {
      if (state?.created_at) {
        createdAt = state.created_at;
      } else {
        try {
          const stat = await fs.stat(path.join(changeDir, "proposal.md"));
          createdAt = (stat.birthtime || stat.mtime).toISOString();
        } catch {
          createdAt = new Date().toISOString();
        }
      }
      changeCreationTimes.set(ch.id, createdAt);
    }

    let approvedAt = changeFirstApprovalTimes.get(ch.id);
    if (!approvedAt && ch.approvedAt) {
      approvedAt = ch.approvedAt;
      changeFirstApprovalTimes.set(ch.id, approvedAt);
    }

    let durationHours: number | undefined;
    let durationDays: number | undefined;

    if (approvedAt) {
      const createdMs = new Date(createdAt).getTime();
      const approvedMs = new Date(approvedAt).getTime();
      if (!Number.isNaN(createdMs) && !Number.isNaN(approvedMs) && approvedMs >= createdMs) {
        const diffMs = approvedMs - createdMs;
        durationHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
        durationDays = Number((durationHours / 24).toFixed(2));
        durationsHours.push(durationHours);
      }
    }

    mttaItems.push({
      changeId: ch.id,
      title: ch.title,
      status: ch.status,
      createdAt,
      firstApprovedAt: approvedAt,
      durationHours,
      durationDays,
      reapprovalsCount: changeReapprovalsCount.get(ch.id) ?? 0,
    });
  }

  durationsHours.sort((a, b) => a - b);
  const approvedCount = durationsHours.length;
  const pendingCount = mttaItems.filter((i) => !i.firstApprovedAt).length;

  const sumHours = durationsHours.reduce((acc, h) => acc + h, 0);
  const meanHours = approvedCount > 0 ? Number((sumHours / approvedCount).toFixed(2)) : 0;
  const meanDays = Number((meanHours / 24).toFixed(2));

  const medianHours = approvedCount > 0 ? (durationsHours[Math.floor(approvedCount / 2)] ?? 0) : 0;
  const medianDays = Number((medianHours / 24).toFixed(2));

  const p90Index = Math.floor(approvedCount * 0.9);
  const p90Hours =
    approvedCount > 0 ? (durationsHours[Math.min(p90Index, approvedCount - 1)] ?? 0) : 0;
  const p90Days = Number((p90Hours / 24).toFixed(2));

  const minHours = approvedCount > 0 ? (durationsHours[0] ?? 0) : 0;
  const maxHours = approvedCount > 0 ? (durationsHours[approvedCount - 1] ?? 0) : 0;

  const mtta: MTTAMetrics = {
    approvedCount,
    pendingCount,
    meanHours,
    meanDays,
    medianHours,
    medianDays,
    p90Hours,
    p90Days,
    minHours,
    maxHours,
    items: mttaItems,
  };

  // 2. Compute Emergency Bypasses
  const bypassRecords = await readBypassAuditRecords(repoRoot);
  const bypassItems: BypassItem[] = [];
  const bySource: Record<string, number> = { env: 0, trailer: 0, option: 0 };
  const byCategory: Record<BypassReasonCategory, number> = {
    incident_hotfix: 0,
    ci_pipeline: 0,
    refactor_non_functional: 0,
    debug_local: 0,
    other: 0,
  };

  // From audit log
  for (const record of bypassRecords) {
    const category = classifyBypassReason(record.reason);
    byCategory[category] = (byCategory[category] ?? 0) + 1;
    bySource[record.source] = (bySource[record.source] ?? 0) + 1;
    bypassItems.push({
      timestamp: record.timestamp,
      user: record.user,
      source: record.source,
      reason: record.reason,
      category,
      filesCount: record.files?.length ?? 0,
    });
  }

  // If there are events that were not in audit file (fallback)
  const auditTimestamps = new Set(bypassRecords.map((r) => r.timestamp));
  for (const event of events) {
    if (event.type === "bypass_used" && !auditTimestamps.has(event.timestamp)) {
      const category = classifyBypassReason(event.reason);
      byCategory[category] = (byCategory[category] ?? 0) + 1;
      bySource.option = (bySource.option ?? 0) + 1;
      bypassItems.push({
        timestamp: event.timestamp,
        user: event.user,
        source: "option",
        reason: event.reason,
        category,
        filesCount: event.stagedFilesCount,
      });
    }
  }

  const totalBypasses = bypassItems.length;
  const totalGateChecks = summary.totalApprovals + summary.totalInvalidations + totalBypasses;
  const ratePerGateCheck =
    totalGateChecks > 0 ? Math.round((totalBypasses / totalGateChecks) * 100) : 0;

  let alertLevel: "low" | "medium" | "high" = "low";
  if (totalBypasses > 0) {
    if (ratePerGateCheck > 15 || totalBypasses >= 5) {
      alertLevel = "high";
    } else if (ratePerGateCheck > 5 || totalBypasses >= 2) {
      alertLevel = "medium";
    }
  }

  const bypasses: BypassMetrics = {
    totalCount: totalBypasses,
    ratePerGateCheck,
    bySource,
    byCategory,
    alertLevel,
    items: bypassItems,
  };

  // 3. Compute Compliance & Governance Health Score
  let totalTasks = 0;
  let completedTasks = 0;
  for (const ch of changes) {
    totalTasks += ch.tasks.total;
    completedTasks += ch.tasks.completed;
  }

  const specIntegrityRate = summary.approvalPassRate;
  const gateAdherenceRate = Math.max(0, 100 - ratePerGateCheck);
  const verificationSuccessRate = summary.verificationSuccessRate;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  const healthScore = Math.round(
    0.35 * gateAdherenceRate +
      0.3 * specIntegrityRate +
      0.2 * verificationSuccessRate +
      0.15 * taskCompletionRate,
  );

  const compliance: ComplianceMetrics = {
    healthScore,
    specIntegrityRate,
    gateAdherenceRate,
    verificationSuccessRate,
    taskCompletionRate,
    totalApprovals: summary.totalApprovals,
    totalInvalidations: summary.totalInvalidations,
    totalGateChecks,
    totalBypasses,
    totalVerifications: summary.totalVerifications,
    totalTasks,
    completedTasks,
  };

  // 4. Compute Subagent Efficacy and Handoffs
  const transitionsMap = new Map<string, number>();
  const roleStatsMap = new Map<string, SubagentRoleStats>();
  let tasksCompletedTotal = 0;
  let handoffsWithBlockers = 0;
  let totalFilesModifiedCount = 0;

  const getOrCreateRole = (role: string): SubagentRoleStats => {
    let r = roleStatsMap.get(role);
    if (!r) {
      r = {
        role,
        originated: 0,
        received: 0,
        tasksCompleted: 0,
        blockersEncountered: 0,
      };
      roleStatsMap.set(role, r);
    }
    return r;
  };

  const allHandoffRecords: HandoffRecord[] = [];
  for (const ch of changes) {
    const list = await listHandoffs(repoRoot, ch.id).catch(() => []);
    allHandoffRecords.push(...list);
  }

  for (const h of allHandoffRecords) {
    const edgeKey = `${h.fromRole} -> ${h.toRole}`;
    transitionsMap.set(edgeKey, (transitionsMap.get(edgeKey) ?? 0) + 1);

    const fromStats = getOrCreateRole(h.fromRole);
    const toStats = getOrCreateRole(h.toRole);

    fromStats.originated++;
    toStats.received++;

    const closedTasks = h.tasksCompleted.length;
    fromStats.tasksCompleted += closedTasks;
    tasksCompletedTotal += closedTasks;

    totalFilesModifiedCount += h.filesModified.length;

    if (h.blockers && h.blockers.length > 0) {
      fromStats.blockersEncountered += h.blockers.length;
      handoffsWithBlockers++;
    }
  }

  // Also include handoffs from events if missing from markdown files
  if (allHandoffRecords.length === 0 && summary.totalHandoffs > 0) {
    for (const [role, counts] of Object.entries(summary.handoffsByRole)) {
      const r = getOrCreateRole(role);
      r.originated = counts.from;
      r.received = counts.to;
    }
  }

  const transitions: SubagentHandoffEdge[] = [];
  for (const [edge, count] of transitionsMap.entries()) {
    const [fromRole, toRole] = edge.split(" -> ");
    if (fromRole && toRole) {
      transitions.push({ fromRole, toRole, count });
    }
  }

  const totalHandoffCount = allHandoffRecords.length || summary.totalHandoffs;
  const taskYield =
    totalHandoffCount > 0 ? Number((tasksCompletedTotal / totalHandoffCount).toFixed(2)) : 0;
  const blockerRate =
    totalHandoffCount > 0 ? Math.round((handoffsWithBlockers / totalHandoffCount) * 100) : 0;
  const averageFilesModified =
    totalHandoffCount > 0 ? Number((totalFilesModifiedCount / totalHandoffCount).toFixed(1)) : 0;

  const roleStats: Record<string, SubagentRoleStats> = {};
  for (const [role, stats] of roleStatsMap.entries()) {
    roleStats[role] = stats;
  }

  const subagents: SubagentMetrics = {
    totalHandoffs: totalHandoffCount,
    tasksCompletedTotal,
    taskYield,
    blockerRate,
    averageFilesModified,
    transitions,
    roleStats,
  };

  const repositoryName = path.basename(repoRoot);

  return {
    generatedAt: new Date().toISOString(),
    repositoryName: options.title || repositoryName,
    period,
    summary,
    mtta,
    compliance,
    bypasses,
    subagents,
  };
}
