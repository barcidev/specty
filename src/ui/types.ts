import type { ValidationResult } from "../engines/types.js";
import type { ApprovalStatusResult } from "../governance/approvals.js";

export type ReviewCommentType = "comment" | "change_request";

export interface ReviewComment {
  id: string;
  changeId: string;
  sectionId: string;
  sectionTitle?: string;
  selection?: string;
  comment: string;
  type: ReviewCommentType;
  suggestion?: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface ChangeReviewsData {
  changeId: string;
  updatedAt: string;
  comments: ReviewComment[];
}

export interface ParsedSpecSection {
  id: string;
  title: string;
  level: number;
  content: string;
  rawMarkdown: string;
}

export interface ParsedTaskItem {
  id: string;
  lineIndex: number;
  text: string;
  completed: boolean;
  role?: string;
}

export interface ParsedTasksData {
  total: number;
  completed: number;
  items: ParsedTaskItem[];
  roles: string[];
}

export interface FileDiffItem {
  file: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  patch: string;
}

export interface ChangeDiffSummary {
  changeId: string;
  files: FileDiffItem[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface ChangeDetailPayload {
  id: string;
  title?: string;
  status: string;
  path: string;
  isArchived: boolean;
  proposalRaw: string;
  proposalSections: ParsedSpecSection[];
  tasksRaw: string;
  tasksData: ParsedTasksData;
  approval: ApprovalStatusResult;
  validation: ValidationResult;
  reviews: ReviewComment[];
  specFiles: string[];
}

export interface UiServerOptions {
  repoRoot?: string;
  port?: number;
  host?: string;
  openBrowser?: boolean;
  initialChangeId?: string;
  sessionToken?: string;
}

export interface UiServerInstance {
  url: string;
  port: number;
  host: string;
  sessionToken: string;
  close: () => Promise<void>;
}
