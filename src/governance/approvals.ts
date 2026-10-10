import fs from "node:fs/promises";
import path from "node:path";
import { readChangeState, writeChangeState } from "../engines/change-state.js";
import { fetchPrReviews, type GitHubReview, getGitHubContext } from "./github-client.js";
import { computeChangeContentHash } from "./hashing.js";

export interface ApprovalRecord {
  changeId: string;
  approvedAt: string;
  approvedBy: string;
  contentHash: string;
  notes?: string;
}

export type ApprovalStateCode = "approved" | "pending" | "reapproval_required" | "missing";

export interface ApprovalStatusResult {
  code: ApprovalStateCode;
  changeId: string;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  currentHash?: string;
  approvedHash?: string;
  reason?: string;
}

export interface ApproveChangeOptions {
  approvedBy?: string;
  dryRun?: boolean;
}

export const AUDIT_DIR = ".specty/audit";
export const AUDIT_FILENAME = "approvals.jsonl";

export async function appendApprovalAuditLog(
  repoRoot: string,
  record: ApprovalRecord,
): Promise<void> {
  const auditDirPath = path.join(repoRoot, AUDIT_DIR);
  await fs.mkdir(auditDirPath, { recursive: true });
  const line = `${JSON.stringify(record)}\n`;
  await fs.appendFile(path.join(auditDirPath, AUDIT_FILENAME), line, "utf8");
}

export async function checkApprovalStatus(
  repoRoot: string,
  changeId: string,
): Promise<ApprovalStatusResult> {
  const changeDir = path.join(repoRoot, "openspec", "changes", changeId);

  try {
    await fs.stat(changeDir);
  } catch {
    return {
      code: "missing",
      changeId,
      approved: false,
      reason: `Change directory does not exist: "${changeDir}"`,
    };
  }

  const state = await readChangeState(changeDir);
  if (!state || state.status === "draft") {
    return {
      code: "pending",
      changeId,
      approved: false,
      reason: "Change is currently in draft state and has not been approved.",
    };
  }

  if (state.status === "archived") {
    const normalizedDir = changeDir.replace(/\\/g, "/");
    const isPhysicallyArchived =
      normalizedDir.includes("/changes/archive/") || normalizedDir.includes("/archive/");

    if (!isPhysicallyArchived) {
      return {
        code: "pending",
        changeId,
        approved: false,
        reason: `Change "${changeId}" declares status "archived" but resides in the active changes directory. Active changes cannot claim archived status to bypass governance.`,
      };
    }

    if (!state.content_hash) {
      return {
        code: "pending",
        changeId,
        approved: false,
        reason: `Archived change "${changeId}" does not contain a verified historical approval hash.`,
      };
    }

    return {
      code: "approved",
      changeId,
      approved: true,
      approvedAt: state.approved_at,
      approvedBy: state.approved_by,
      approvedHash: state.content_hash,
    };
  }

  // Active change in approved, in-progress or review: verify content hash
  let currentHash: string;
  try {
    currentHash = await computeChangeContentHash(changeDir);
  } catch (err: unknown) {
    return {
      code: "pending",
      changeId,
      approved: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  if (!state.content_hash) {
    return {
      code: "pending",
      changeId,
      approved: false,
      reason: "Missing content_hash in change metadata.",
    };
  }

  if (currentHash !== state.content_hash) {
    return {
      code: "reapproval_required",
      changeId,
      approved: false,
      currentHash,
      approvedHash: state.content_hash,
      approvedAt: state.approved_at,
      approvedBy: state.approved_by,
      reason: "Specification was modified after approval. Re-approval required.",
    };
  }

  return {
    code: "approved",
    changeId,
    approved: true,
    currentHash,
    approvedHash: state.content_hash,
    approvedAt: state.approved_at,
    approvedBy: state.approved_by,
  };
}

export const DISALLOWED_APPROVER_ROLES = [
  "orchestrator",
  "frontend",
  "backend",
  "data",
  "testing",
  "security-review",
  "agent",
  "assistant",
  "bot",
  "ai",
  "model",
  "llm",
];

export function validateApproverIdentity(approver: string): void {
  const normalized = approver.trim().toLowerCase();
  if (DISALLOWED_APPROVER_ROLES.includes(normalized)) {
    throw new Error(
      `Approver identity "${approver}" is a recognized automated agent role. Specification approvals must be granted by a human developer.`,
    );
  }
}

export async function approveChange(
  repoRoot: string,
  changeId: string,
  options: ApproveChangeOptions = {},
): Promise<ApprovalRecord> {
  const changeDir = path.join(repoRoot, "openspec", "changes", changeId);
  const contentHash = await computeChangeContentHash(changeDir);
  const approvedBy = options.approvedBy || process.env.USER || "human";
  validateApproverIdentity(approvedBy);
  const approvedAt = new Date().toISOString();

  const record: ApprovalRecord = {
    changeId,
    approvedAt,
    approvedBy,
    contentHash,
  };

  if (!options.dryRun) {
    const existingState = (await readChangeState(changeDir)) ?? {
      change_id: changeId,
      status: "draft",
    };

    await writeChangeState(changeDir, {
      ...existingState,
      status: "approved",
      approved_at: approvedAt,
      approved_by: approvedBy,
      content_hash: contentHash,
    });

    await appendApprovalAuditLog(repoRoot, record);
  }

  return record;
}

export interface VerifyPrReviewOptions {
  repo?: string;
  prNumber?: number;
  token?: string;
  apiUrl?: string;
  requiredReviewers?: string[];
  requireCodeowner?: boolean;
  dryRun?: boolean;
}

export interface PrReviewApprovalResult {
  approved: boolean;
  review?: GitHubReview;
  record?: ApprovalRecord;
  reason?: string;
}

/**
 * Verifies if a specification change has a formal APPROVED review on GitHub Pull Request,
 * ensuring tamper-proof approval by human developers/CODEOWNERS.
 */
export async function verifyPrReviewApproval(
  repoRoot: string,
  changeId: string,
  options: VerifyPrReviewOptions = {},
): Promise<PrReviewApprovalResult> {
  const ghCtx = getGitHubContext();
  const repo = options.repo || ghCtx.repo;
  const token = options.token || ghCtx.token;
  const prNumber = options.prNumber || ghCtx.prNumber;
  const apiUrl = options.apiUrl || ghCtx.apiUrl;

  if (!repo || !token || !prNumber) {
    return {
      approved: false,
      reason:
        "Missing required GitHub context (repository, token, or PR number) to verify PR reviews.",
    };
  }

  const changeDir = path.join(repoRoot, "openspec", "changes", changeId);
  try {
    await fs.stat(changeDir);
  } catch {
    return {
      approved: false,
      reason: `Change directory does not exist: "${changeDir}"`,
    };
  }

  let reviews: GitHubReview[];
  try {
    reviews = await fetchPrReviews({ repo, prNumber, token, apiUrl });
  } catch (err: unknown) {
    return {
      approved: false,
      reason: `Failed to fetch GitHub PR reviews: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Filter approved reviews from human users
  const validApprovedReviews = reviews.filter((r) => {
    if (r.state !== "APPROVED") return false;
    const login = r.user.login.toLowerCase();
    if (r.user.type === "Bot" || login.endsWith("[bot]")) return false;
    if (DISALLOWED_APPROVER_ROLES.includes(login)) return false;

    if (options.requiredReviewers && options.requiredReviewers.length > 0) {
      const allowed = options.requiredReviewers.map((u) => u.toLowerCase());
      if (!allowed.includes(login)) return false;
    }

    if (options.requireCodeowner && r.author_association) {
      const allowedAssociations = ["COLLABORATOR", "MEMBER", "OWNER"];
      if (!allowedAssociations.includes(r.author_association)) return false;
    }

    return true;
  });

  if (validApprovedReviews.length === 0) {
    return {
      approved: false,
      reason: `No valid human APPROVED review found on PR #${prNumber} for change "${changeId}".`,
    };
  }

  // Pick latest approved review
  const latestReview = validApprovedReviews[validApprovedReviews.length - 1];
  if (!latestReview) {
    return {
      approved: false,
      reason: `No valid human APPROVED review found on PR #${prNumber} for change "${changeId}".`,
    };
  }
  const contentHash = await computeChangeContentHash(changeDir);
  const approvedBy = latestReview.user.login;
  const approvedAt = latestReview.submitted_at;

  const record: ApprovalRecord = {
    changeId,
    approvedAt,
    approvedBy,
    contentHash,
    notes: `Approved via GitHub PR #${prNumber} review`,
  };

  if (!options.dryRun) {
    const existingState = (await readChangeState(changeDir)) ?? {
      change_id: changeId,
      status: "draft",
    };

    await writeChangeState(changeDir, {
      ...existingState,
      status: "approved",
      approved_at: approvedAt,
      approved_by: approvedBy,
      content_hash: contentHash,
    });

    await appendApprovalAuditLog(repoRoot, record);
  }

  return {
    approved: true,
    review: latestReview,
    record,
    reason: `Change "${changeId}" approved by @${approvedBy} on PR #${prNumber}.`,
  };
}
