export type MetricEventType =
  | "change_created"
  | "approval_granted"
  | "approval_invalidated"
  | "verification_run"
  | "handoff_recorded"
  | "bypass_used";

export interface BaseMetricEvent {
  type: MetricEventType;
  timestamp: string;
}

export interface ChangeCreatedEvent extends BaseMetricEvent {
  type: "change_created";
  changeId: string;
  author?: string;
  tool?: string;
}

export interface ApprovalGrantedEvent extends BaseMetricEvent {
  type: "approval_granted";
  changeId: string;
  hash: string;
  approver: string;
}

export interface ApprovalInvalidatedEvent extends BaseMetricEvent {
  type: "approval_invalidated";
  changeId: string;
  expectedHash: string;
  actualHash: string;
}

export interface VerificationRunEvent extends BaseMetricEvent {
  type: "verification_run";
  scope: string;
  commandType: string;
  command: string;
  exitCode: number;
  durationMs: number;
  success: boolean;
}

export interface HandoffRecordedEvent extends BaseMetricEvent {
  type: "handoff_recorded";
  changeId: string;
  handoffId: string;
  fromRole: string;
  toRole: string;
}

export interface BypassUsedEvent extends BaseMetricEvent {
  type: "bypass_used";
  reason: string;
  user: string;
  stagedFilesCount: number;
}

export type SpectyEvent =
  | ChangeCreatedEvent
  | ApprovalGrantedEvent
  | ApprovalInvalidatedEvent
  | VerificationRunEvent
  | HandoffRecordedEvent
  | BypassUsedEvent;

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type RecordableMetricEvent = DistributiveOmit<SpectyEvent, "timestamp"> & {
  timestamp?: string;
};

export interface MetricsSummary {
  totalEvents: number;
  totalChanges: number;
  totalApprovals: number;
  totalInvalidations: number;
  approvalPassRate: number; // percentage (0 - 100)
  totalVerifications: number;
  verificationSuccessRate: number; // percentage (0 - 100)
  verificationsByType: Record<string, { total: number; passed: number; failed: number }>;
  totalHandoffs: number;
  handoffsByRole: Record<string, { from: number; to: number }>;
  totalBypasses: number;
}

export type ReportPeriod = "7d" | "30d" | "90d" | "all";
export type ReportFormat = "html" | "markdown" | "all";

export interface MTTAChangeItem {
  changeId: string;
  title?: string;
  status: string;
  createdAt: string;
  firstApprovedAt?: string;
  durationHours?: number;
  durationDays?: number;
  reapprovalsCount: number;
}

export interface MTTAMetrics {
  approvedCount: number;
  pendingCount: number;
  meanHours: number;
  meanDays: number;
  medianHours: number;
  medianDays: number;
  p90Hours: number;
  p90Days: number;
  minHours: number;
  maxHours: number;
  items: MTTAChangeItem[];
}

export interface ComplianceMetrics {
  healthScore: number; // 0 - 100 composite index
  specIntegrityRate: number; // percentage of approvals without invalidation
  gateAdherenceRate: number; // percentage of normal gates vs bypasses
  verificationSuccessRate: number; // percentage
  taskCompletionRate: number; // percentage
  totalApprovals: number;
  totalInvalidations: number;
  totalGateChecks: number;
  totalBypasses: number;
  totalVerifications: number;
  totalTasks: number;
  completedTasks: number;
}

export type BypassReasonCategory =
  | "incident_hotfix"
  | "ci_pipeline"
  | "refactor_non_functional"
  | "debug_local"
  | "other";

export interface BypassItem {
  timestamp: string;
  user: string;
  source: "env" | "trailer" | "option";
  reason: string;
  category: BypassReasonCategory;
  filesCount: number;
}

export interface BypassMetrics {
  totalCount: number;
  ratePerGateCheck: number; // percentage
  bySource: Record<string, number>;
  byCategory: Record<BypassReasonCategory, number>;
  alertLevel: "low" | "medium" | "high";
  items: BypassItem[];
}

export interface SubagentRoleStats {
  role: string;
  originated: number;
  received: number;
  tasksCompleted: number;
  blockersEncountered: number;
}

export interface SubagentHandoffEdge {
  fromRole: string;
  toRole: string;
  count: number;
}

export interface SubagentMetrics {
  totalHandoffs: number;
  tasksCompletedTotal: number;
  taskYield: number; // average tasks per handoff
  blockerRate: number; // percentage of handoffs with blockers
  averageFilesModified: number;
  transitions: SubagentHandoffEdge[];
  roleStats: Record<string, SubagentRoleStats>;
}

export interface GovernanceExecutiveReport {
  generatedAt: string;
  repositoryName: string;
  period: ReportPeriod;
  summary: MetricsSummary;
  mtta: MTTAMetrics;
  compliance: ComplianceMetrics;
  bypasses: BypassMetrics;
  subagents: SubagentMetrics;
}

export interface ExportReportOptions {
  cwd?: string;
  outputPath?: string;
  format?: ReportFormat;
  period?: ReportPeriod;
  open?: boolean;
  title?: string;
}

export interface ExportResult {
  report: GovernanceExecutiveReport;
  generatedFiles: { format: "html" | "markdown"; path: string }[];
}
