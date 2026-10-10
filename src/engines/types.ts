export type ChangeStatus = "draft" | "approved" | "in-progress" | "review" | "done" | "archived";

export interface ChangeTaskSummary {
  total: number;
  completed: number;
}

export interface ChangeMetadata {
  id: string;
  title?: string;
  status: ChangeStatus;
  path: string;
  isArchived: boolean;
  approvedAt?: string;
  approvedHash?: string;
  tasks: ChangeTaskSummary;
}

export interface ValidationIssue {
  file: string;
  message: string;
  severity: "error" | "warning";
  line?: number;
  rule?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errorsCount?: number;
  warningsCount?: number;
}

export interface CreateChangeOptions {
  title?: string;
  dryRun?: boolean;
}

export interface SpecEngine {
  readonly id: "openspec" | "builtin";
  init(repoRoot: string, options?: { dryRun?: boolean }): Promise<void>;
  listChanges(repoRoot: string): Promise<ChangeMetadata[]>;
  getChange(repoRoot: string, changeId: string): Promise<ChangeMetadata | null>;
  createChange(repoRoot: string, changeId: string, options?: CreateChangeOptions): Promise<string>;
  validate(repoRoot: string, changeId?: string): Promise<ValidationResult>;
  archive(repoRoot: string, changeId: string, options?: { dryRun?: boolean }): Promise<boolean>;
}
