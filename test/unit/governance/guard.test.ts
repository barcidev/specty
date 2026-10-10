import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeInit } from "../../../src/cli/commands/init.js";
import { evaluateGuard, parseGuardPayload } from "../../../src/governance/guard.js";

describe("guard engine", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-guard-test-"));
    await executeInit({
      cwd: tmpDir,
      yes: true,
      lang: "en",
      stack: "node",
      specEngine: "builtin",
      hooks: false,
      ci: false,
      mcp: false,
    });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("parseGuardPayload", () => {
    it("parses Claude Code hook stdin payload for Edit", () => {
      const payload = {
        tool_name: "Edit",
        tool_input: {
          file_path: "src/auth/jwt.ts",
        },
      };
      const parsed = parseGuardPayload(payload);
      expect(parsed).toEqual({
        toolName: "Edit",
        filePath: "src/auth/jwt.ts",
        command: undefined,
      });
    });

    it("parses Claude Code hook stdin payload for Bash", () => {
      const payload = {
        tool_name: "Bash",
        tool_input: {
          command: "npm test",
        },
      };
      const parsed = parseGuardPayload(payload);
      expect(parsed).toEqual({
        toolName: "Bash",
        filePath: undefined,
        command: "npm test",
      });
    });
  });

  describe("evaluateGuard - Bash Anti-Tampering", () => {
    it("blocks specty approve attempts by agent", async () => {
      const decision = await evaluateGuard(tmpDir, {
        toolName: "Bash",
        command: "specty approve auth-jwt --yes",
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("BASH_FORBIDDEN_COMMAND");
      expect(decision.reason).toContain("specty approve requires human verification");
    });

    it("blocks bypass environment variable injection", async () => {
      const decision = await evaluateGuard(tmpDir, {
        toolName: "Bash",
        command: "SPECTY_BYPASS=1 git commit -m 'skip'",
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("BASH_FORBIDDEN_COMMAND");
    });

    it("blocks --no-verify git commits", async () => {
      const decision = await evaluateGuard(tmpDir, {
        toolName: "Bash",
        command: "git commit -m 'quick fix' --no-verify",
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("BASH_FORBIDDEN_COMMAND");
    });

    it("allows standard build/test commands", async () => {
      const decision = await evaluateGuard(tmpDir, {
        toolName: "Bash",
        command: "npm run test",
      });
      expect(decision.allowed).toBe(true);
      expect(decision.code).toBe("ALLOWED");
    });
  });

  describe("evaluateGuard - File Edits", () => {
    it("blocks modification of protected governance config", async () => {
      const decision = await evaluateGuard(tmpDir, {
        toolName: "Edit",
        filePath: ".specty/config.yaml",
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("PROTECTED_GOVERNANCE_FILE");
    });

    it("blocks modification of .claude/settings.json", async () => {
      const decision = await evaluateGuard(tmpDir, {
        toolName: "Edit",
        filePath: ".claude/settings.json",
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("PROTECTED_GOVERNANCE_FILE");
    });

    it("allows editing documentation and specs (exempt paths)", async () => {
      const decision = await evaluateGuard(tmpDir, {
        toolName: "Edit",
        filePath: "openspec/changes/my-change/proposal.md",
      });
      expect(decision.allowed).toBe(true);
      expect(decision.code).toBe("ALLOWED");
    });

    it("blocks source edits when there are no active changes", async () => {
      const decision = await evaluateGuard(tmpDir, {
        toolName: "Edit",
        filePath: "src/auth.ts",
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("NO_ACTIVE_CHANGE");
    });

    it("blocks source edits when active change is not approved", async () => {
      // Create a change in draft
      const changeDir = path.join(tmpDir, "openspec", "changes", "test-feature");
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, "proposal.md"), "# Proposal\n\nImplement feature\n");
      await fs.writeFile(
        path.join(changeDir, "tasks.md"),
        "- [ ] 1.1 Task 1 [agent: backend] [files: src/feature/**]\n      verify: npm test\n",
      );

      const decision = await evaluateGuard(tmpDir, {
        toolName: "Edit",
        filePath: "src/feature/index.ts",
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("CHANGE_NOT_APPROVED");
      expect(decision.actionAdvice).toContain("specty approve");
    });

    it("enforces task file scope when change is approved", async () => {
      const changeDir = path.join(tmpDir, "openspec", "changes", "scoped-feature");
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, "proposal.md"), "# Proposal\n\nScoped feature\n");
      await fs.writeFile(
        path.join(changeDir, "tasks.md"),
        `# Tasks\n\n- [ ] 1.1 Backend task [agent: backend] [files: src/backend/**]\n      verify: npm test\n- [ ] 2.1 Frontend task [agent: frontend] [files: src/frontend/**]\n      verify: npm test\n`,
      );

      // Approve the change
      const { executeApprove } = await import("../../../src/cli/commands/approve.js");
      await executeApprove("scoped-feature", { cwd: tmpDir, yes: true, force: true });

      // 1. Edit outside active task scope -> OUT_OF_SCOPE
      const outOfScope = await evaluateGuard(tmpDir, {
        toolName: "Edit",
        filePath: "src/frontend/app.tsx",
      });
      expect(outOfScope.allowed).toBe(false);
      expect(outOfScope.code).toBe("OUT_OF_SCOPE");
      expect(outOfScope.activeTaskId).toBe("1.1");
      expect(outOfScope.allowedFiles).toEqual(["src/backend/**"]);

      // 2. Edit within active task scope -> ALLOWED
      const inScope = await evaluateGuard(tmpDir, {
        toolName: "Edit",
        filePath: "src/backend/server.ts",
      });
      expect(inScope.allowed).toBe(true);
      expect(inScope.code).toBe("ALLOWED");
    });
  });
});
