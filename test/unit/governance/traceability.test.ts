import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeTrace } from "../../../src/cli/commands/trace.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { generatePrGateReport } from "../../../src/governance/pr-reporter.js";
import { buildTraceabilityMatrix } from "../../../src/governance/traceability.js";

const TEST_DIR = path.join(process.cwd(), "test-fixtures-traceability");

describe("Traceability Matrix Engine", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    await initGitRepo(TEST_DIR, "main");

    const config = createDefaultConfig({ language: "en" });
    config.spec_engine = "builtin";
    await saveConfig(TEST_DIR, config);

    // Create change directory
    const changeDir = path.join(TEST_DIR, "openspec", "changes", "trace-feat");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "specty.yaml"),
      'change_id: "trace-feat"\nstatus: "approved"\ncontent_hash: "hash-trace"\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Proposal: Authentication Overhaul\n\n## Why\nSecurity compliance\n\n## What Changes\nOAuth2 and session management\n\n## Impact\nLow\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      `## 1. Implementation
- [x] 1.1 Implement OAuth provider [agent: backend] [files: src/auth/**]
- [ ] 1.2 Add session tokens [agent: backend] [files: src/session/**]
`,
      "utf8",
    );

    // Initial commit
    await execa("git", ["add", "."], { cwd: TEST_DIR });
    await execa("git", ["commit", "-m", "chore: initial setup"], { cwd: TEST_DIR });

    // Commit 1: matches task 1.1 via trailer and file scope
    await fs.mkdir(path.join(TEST_DIR, "src", "auth"), { recursive: true });
    await fs.writeFile(path.join(TEST_DIR, "src", "auth", "oauth.ts"), "// oauth logic", "utf8");
    await execa("git", ["add", "src/auth/oauth.ts"], { cwd: TEST_DIR });
    await execa("git", ["commit", "-m", "feat(auth): add oauth handler\n\nSpecty-Task: 1.1"], {
      cwd: TEST_DIR,
    });

    // Commit 2: orphan commit touching unmapped source files
    await fs.mkdir(path.join(TEST_DIR, "src", "unmapped"), { recursive: true });
    await fs.writeFile(
      path.join(TEST_DIR, "src", "unmapped", "random.ts"),
      "// random code",
      "utf8",
    );
    await execa("git", ["add", "src/unmapped/random.ts"], { cwd: TEST_DIR });
    await execa("git", ["commit", "-m", "feat: unmapped changes"], { cwd: TEST_DIR });

    // Mock verification.json
    const verificationData = {
      timestamp: "2026-10-10T12:00:00Z",
      commitSha: "sha-test",
      changeId: "trace-feat",
      passed: true,
      totalTasks: 1,
      totalStackCommands: 0,
      tasksResults: [
        {
          taskId: "1.1",
          description: "Implement OAuth provider",
          command: "npm test auth",
          passed: true,
          exitCode: 0,
          durationMs: 120,
          stdout: "OK",
          stderr: "",
        },
      ],
      stackResults: [],
    };
    await fs.writeFile(
      path.join(changeDir, "verification.json"),
      JSON.stringify(verificationData, null, 2),
      "utf8",
    );
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("builds end-to-end traceability matrix linking requirements, tasks, commits and tests", async () => {
    const matrix = await buildTraceabilityMatrix(TEST_DIR, "trace-feat");

    expect(matrix.changeId).toBe("trace-feat");
    expect(matrix.status).toBe("approved");
    expect(matrix.requirements.length).toBeGreaterThan(0);

    const task1 = matrix.requirements[0]?.tasks.find((t) => t.id === "1.1");
    expect(task1).toBeDefined();
    expect(task1?.completed).toBe(true);
    expect(task1?.agentRole).toBe("backend");
    expect(task1?.allowedFiles).toContain("src/auth/**");

    // Verify commit association
    expect(task1?.commits.length).toBeGreaterThanOrEqual(1);
    expect(task1?.commits[0]?.message).toContain("Specty-Task: 1.1");

    // Verify verification evidence linkage
    expect(task1?.verification).toBeDefined();
    expect(task1?.verification?.success).toBe(true);
    expect(task1?.verification?.command).toBe("npm test auth");

    // Verify orphan commits detection
    expect(matrix.orphanCommits.length).toBeGreaterThanOrEqual(1);
    expect(matrix.orphanCommits.some((c) => c.message.includes("unmapped changes"))).toBe(true);

    // Verify compliance calculation
    expect(matrix.overallCompliance).toBeGreaterThan(0);
    expect(matrix.stats.totalTasks).toBe(2);
    expect(matrix.stats.completedTasks).toBe(1);
  });

  it("executes through executeTrace CLI command and writes JSON output", async () => {
    const outputFile = "trace-output.json";
    const success = await executeTrace("trace-feat", {
      cwd: TEST_DIR,
      output: outputFile,
    });

    expect(success).toBe(true);

    const rawOutput = await fs.readFile(path.join(TEST_DIR, outputFile), "utf8");
    const parsed = JSON.parse(rawOutput);
    expect(parsed.changeId).toBe("trace-feat");
    expect(parsed.requirements).toBeDefined();
  });

  it("embeds traceability matrix in PR gate report markdown", async () => {
    const matrix = await buildTraceabilityMatrix(TEST_DIR, "trace-feat");

    const reportMarkdown = generatePrGateReport(
      {
        passed: true,
        bypassed: false,
        modifiedSourceFiles: ["src/auth/oauth.ts"],
        allModifiedFiles: ["src/auth/oauth.ts"],
        activeApprovedChange: "trace-feat",
        changeDetails: {
          id: "trace-feat",
          title: "Authentication Overhaul",
          status: "approved",
          approvalCode: "approved",
          approved: true,
          tasks: { total: 2, completed: 1 },
          isArchived: false,
        },
      },
      {
        traceabilityMatrix: matrix,
        lang: "es",
      },
    );

    expect(reportMarkdown).toContain("Matriz de Trazabilidad");
    expect(reportMarkdown).toContain("1.1");
    expect(reportMarkdown).toContain("@backend");
    expect(reportMarkdown).toContain("PASS");
  });
});
