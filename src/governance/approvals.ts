import fs from "node:fs/promises";
import path from "node:path";
import { readChangeState, writeChangeState } from "../engines/change-state.js";
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

export async function approveChange(
  repoRoot: string,
  changeId: string,
  options: ApproveChangeOptions = {},
): Promise<ApprovalRecord> {
  const changeDir = path.join(repoRoot, "openspec", "changes", changeId);
  const contentHash = await computeChangeContentHash(changeDir);
  const approvedBy = options.approvedBy || process.env.USER || "human";
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
