import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeBranch } from "../../../src/cli/commands/branch.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import {
  extractChangeIdFromBody,
  extractChangeIdFromBranch,
  extractChangeIdFromLabels,
  resolveTargetChange,
} from "../../../src/governance/change-resolver.js";
import { checkApprovalGate } from "../../../src/governance/check-approval.js";

const TEST_DIR = path.join(process.cwd(), "test-fixtures-branch-resolver");

describe("Branch, PR and Change Linking", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    await initGitRepo(TEST_DIR, "main");

    // Write valid configuration using saveConfig
    const config = createDefaultConfig({ language: "en" });
    config.spec_engine = "builtin";
    config.governance.source_paths = ["src/**"];
    config.governance.exempt_paths = ["docs/**"];
    await saveConfig(TEST_DIR, config);

    // Initial commit
    await execa("git", ["add", "."], { cwd: TEST_DIR });
    await execa("git", ["commit", "-m", "chore: initial commit"], { cwd: TEST_DIR });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("Extractors", () => {
    it("extracts change id from branch name conventions", () => {
      expect(extractChangeIdFromBranch("feature/user-auth")).toBe("user-auth");
      expect(extractChangeIdFromBranch("change/billing-fix")).toBe("billing-fix");
      expect(extractChangeIdFromBranch("feat/oauth-v2")).toBe("oauth-v2");
      expect(extractChangeIdFromBranch("fix/null-pointer")).toBe("null-pointer");
      expect(extractChangeIdFromBranch("task/migrate-db")).toBe("migrate-db");
      expect(extractChangeIdFromBranch("main")).toBeNull();
      expect(extractChangeIdFromBranch("develop")).toBeNull();
    });

    it("extracts change id from PR labels", () => {
      expect(extractChangeIdFromLabels(["specty:change/user-auth"])).toBe("user-auth");
      expect(extractChangeIdFromLabels(["specty:billing-v1", "bug"])).toBe("billing-v1");
      expect(extractChangeIdFromLabels(["change:metrics-export"])).toBe("metrics-export");
      expect(extractChangeIdFromLabels(["enhancement", "ui"])).toBeNull();
      expect(extractChangeIdFromLabels([])).toBeNull();
      expect(extractChangeIdFromLabels(undefined)).toBeNull();
    });

    it("extracts change id from PR body text", () => {
      expect(
        extractChangeIdFromBody("This is a PR.\nSpecty-Change: user-auth\nReview carefully."),
      ).toBe("user-auth");
      expect(extractChangeIdFromBody("Resolves change: payments-api\nFixes #42")).toBe(
        "payments-api",
      );
      expect(extractChangeIdFromBody("Just regular PR description")).toBeNull();
      expect(extractChangeIdFromBody(undefined)).toBeNull();
    });
  });

  describe("resolveTargetChange with PR metadata", () => {
    async function createChange(changeId: string, status = "draft") {
      const changeDir = path.join(TEST_DIR, "openspec", "changes", changeId);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, "specty.yaml"),
        `change_id: "${changeId}"\nstatus: "${status}"\n`,
        "utf8",
      );
      await fs.writeFile(
        path.join(changeDir, "proposal.md"),
        `# Proposal: ${changeId}\n\n## Why\nNeed it\n\n## What Changes\nCode\n\n## Impact\nNone\n`,
        "utf8",
      );
      await fs.writeFile(
        path.join(changeDir, "tasks.md"),
        `# Tasks\n\n## 1. Implementation\n- [ ] 1.1 Do task [agent: backend] [files: src/**]\n`,
        "utf8",
      );
    }

    it("resolves change from PR labels when multiple changes exist", async () => {
      await createChange("feature-a", "approved");
      await createChange("feature-b", "approved");

      const res = await resolveTargetChange(TEST_DIR, {
        prLabels: ["specty:change/feature-b"],
      });

      expect(res.resolvedId).toBe("feature-b");
      expect(res.source).toBe("pr_label");
    });

    it("resolves change from PR body reference", async () => {
      await createChange("feature-a", "approved");
      await createChange("feature-b", "approved");

      const res = await resolveTargetChange(TEST_DIR, {
        prBody: "Implementing changes.\nSpecty-Change: feature-a",
      });

      expect(res.resolvedId).toBe("feature-a");
      expect(res.source).toBe("pr_body");
    });

    it("resolves change from PR headRef branch", async () => {
      await createChange("feature-a", "approved");
      await createChange("feature-b", "approved");

      const res = await resolveTargetChange(TEST_DIR, {
        prHeadRef: "feature/feature-b",
      });

      expect(res.resolvedId).toBe("feature-b");
      expect(res.source).toBe("branch");
    });
  });

  describe("executeBranch CLI command", () => {
    it("creates and switches to feature branch for a change", async () => {
      const changeDir = path.join(TEST_DIR, "openspec", "changes", "my-feature");
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, "specty.yaml"),
        `change_id: "my-feature"\nstatus: "approved"\n`,
        "utf8",
      );

      const success = await executeBranch("my-feature", { cwd: TEST_DIR });
      expect(success).toBe(true);

      const branchRes = await execa("git", ["branch", "--show-current"], { cwd: TEST_DIR });
      expect(branchRes.stdout.trim()).toBe("feature/my-feature");
    });
  });

  describe("Branch and Change Mismatch in Gate", () => {
    it("fails gate when current branch contradicts target change", async () => {
      const changeDirA = path.join(TEST_DIR, "openspec", "changes", "change-a");
      await fs.mkdir(changeDirA, { recursive: true });
      await fs.writeFile(
        path.join(changeDirA, "specty.yaml"),
        `change_id: "change-a"\nstatus: "approved"\ncontent_hash: "hash-a"\n`,
        "utf8",
      );
      await fs.writeFile(path.join(changeDirA, "proposal.md"), "# A", "utf8");
      await fs.writeFile(
        path.join(changeDirA, "tasks.md"),
        "## 1. Implementation\n- [ ] 1.1 Task A [files: src/**]\n",
        "utf8",
      );

      const changeDirB = path.join(TEST_DIR, "openspec", "changes", "change-b");
      await fs.mkdir(changeDirB, { recursive: true });
      await fs.writeFile(
        path.join(changeDirB, "specty.yaml"),
        `change_id: "change-b"\nstatus: "approved"\ncontent_hash: "hash-b"\n`,
        "utf8",
      );
      await fs.writeFile(path.join(changeDirB, "proposal.md"), "# B", "utf8");
      await fs.writeFile(
        path.join(changeDirB, "tasks.md"),
        "## 1. Implementation\n- [ ] 1.1 Task B [files: src/**]\n",
        "utf8",
      );

      // Create branch feature/change-a
      await execa("git", ["checkout", "-b", "feature/change-a"], { cwd: TEST_DIR });

      // Stage a change in src/
      await fs.mkdir(path.join(TEST_DIR, "src"), { recursive: true });
      await fs.writeFile(path.join(TEST_DIR, "src", "index.ts"), "console.log('test');", "utf8");
      await execa("git", ["add", "src/index.ts"], { cwd: TEST_DIR });

      // Attempt gate with explicit change-b while on branch feature/change-a
      const gateRes = await checkApprovalGate(TEST_DIR, {
        stagedOnly: true,
        changeId: "change-b",
      });

      expect(gateRes.passed).toBe(false);
      expect(gateRes.errorCode).toBe("branch_change_mismatch");
      expect(gateRes.reason).toContain('Branch indicates change "change-a"');
    });
  });
});
