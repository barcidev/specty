import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeSyncApproval } from "../../../src/cli/commands/sync-approval.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { readChangeState } from "../../../src/engines/change-state.js";
import { checkApprovalStatus, verifyPrReviewApproval } from "../../../src/governance/approvals.js";
import { fetchPrReviews } from "../../../src/governance/github-client.js";

const TEST_DIR = path.join(process.cwd(), "test-fixtures-pr-review-approval");

describe("PR Review Approval Governance", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    await initGitRepo(TEST_DIR, "main");

    const config = createDefaultConfig({ language: "en" });
    config.spec_engine = "builtin";
    config.governance.approval_method = "pr_review";
    await saveConfig(TEST_DIR, config);

    // Create a draft change
    const changeDir = path.join(TEST_DIR, "openspec", "changes", "pr-reviewed-feat");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "specty.yaml"),
      'change_id: "pr-reviewed-feat"\nstatus: "draft"\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Proposal\n\n## Why\nTesting PR review approval\n\n## What Changes\nNew logic\n\n## Impact\nNone\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "## 1. Implementation\n- [ ] 1.1 Do task [agent: backend] [files: src/**]\n",
      "utf8",
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("fetchPrReviews", () => {
    it("fetches and parses reviews from GitHub REST API", async () => {
      const mockReviews = [
        {
          id: 101,
          user: { login: "alice", type: "User" },
          state: "APPROVED",
          submitted_at: "2026-10-10T12:00:00Z",
          commit_id: "sha123",
          author_association: "MEMBER",
        },
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviews,
      } as unknown as Response);

      const reviews = await fetchPrReviews({
        repo: "owner/repo",
        prNumber: 42,
        token: "fake-gh-token",
      });

      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.user.login).toBe("alice");
      expect(reviews[0]?.state).toBe("APPROVED");
    });
  });

  describe("verifyPrReviewApproval", () => {
    it("approves specification change when human reviewer approves PR", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 201,
            user: { login: "techlead", type: "User" },
            state: "APPROVED",
            submitted_at: "2026-10-10T12:30:00Z",
            commit_id: "sha456",
            author_association: "OWNER",
          },
        ],
      } as unknown as Response);

      const result = await verifyPrReviewApproval(TEST_DIR, "pr-reviewed-feat", {
        repo: "org/project",
        prNumber: 15,
        token: "gh-token-secret",
      });

      expect(result.approved).toBe(true);
      expect(result.review?.user.login).toBe("techlead");
      expect(result.record?.approvedBy).toBe("techlead");

      // Verify state was persisted to specty.yaml
      const changeDir = path.join(TEST_DIR, "openspec", "changes", "pr-reviewed-feat");
      const state = await readChangeState(changeDir);
      expect(state?.status).toBe("approved");
      expect(state?.approved_by).toBe("techlead");
      expect(state?.content_hash).toBeDefined();

      // Check approval status in engine
      const statusRes = await checkApprovalStatus(TEST_DIR, "pr-reviewed-feat");
      expect(statusRes.approved).toBe(true);
      expect(statusRes.code).toBe("approved");
    });

    it("rejects approval from automated bot accounts", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 202,
            user: { login: "github-actions[bot]", type: "Bot" },
            state: "APPROVED",
            submitted_at: "2026-10-10T12:30:00Z",
            commit_id: "sha456",
            author_association: "NONE",
          },
        ],
      } as unknown as Response);

      const result = await verifyPrReviewApproval(TEST_DIR, "pr-reviewed-feat", {
        repo: "org/project",
        prNumber: 15,
        token: "gh-token-secret",
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toContain("No valid human APPROVED review found");
    });

    it("rejects approval from AI agent roles", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 203,
            user: { login: "orchestrator", type: "User" },
            state: "APPROVED",
            submitted_at: "2026-10-10T12:30:00Z",
            commit_id: "sha456",
            author_association: "COLLABORATOR",
          },
        ],
      } as unknown as Response);

      const result = await verifyPrReviewApproval(TEST_DIR, "pr-reviewed-feat", {
        repo: "org/project",
        prNumber: 15,
        token: "gh-token-secret",
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toContain("No valid human APPROVED review found");
    });

    it("enforces requiredReviewers filter", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 204,
            user: { login: "junior-dev", type: "User" },
            state: "APPROVED",
            submitted_at: "2026-10-10T12:30:00Z",
            commit_id: "sha456",
            author_association: "COLLABORATOR",
          },
        ],
      } as unknown as Response);

      const result = await verifyPrReviewApproval(TEST_DIR, "pr-reviewed-feat", {
        repo: "org/project",
        prNumber: 15,
        token: "gh-token-secret",
        requiredReviewers: ["senior-architect", "lead-security"],
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toContain("No valid human APPROVED review found");
    });
  });

  describe("executeSyncApproval CLI", () => {
    it("synchronizes approval state from PR review via CLI execution", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 205,
            user: { login: "senior-reviewer", type: "User" },
            state: "APPROVED",
            submitted_at: "2026-10-10T13:00:00Z",
            commit_id: "sha789",
            author_association: "MEMBER",
          },
        ],
      } as unknown as Response);

      const success = await executeSyncApproval("pr-reviewed-feat", {
        cwd: TEST_DIR,
        repo: "my-org/my-repo",
        pr: 88,
        token: "gh-token-mock",
      });

      expect(success).toBe(true);

      const statusRes = await checkApprovalStatus(TEST_DIR, "pr-reviewed-feat");
      expect(statusRes.approved).toBe(true);
      expect(statusRes.approvedBy).toBe("senior-reviewer");
    });
  });
});
