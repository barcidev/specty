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
