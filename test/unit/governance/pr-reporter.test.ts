import { describe, expect, it } from "vitest";
import type { GateResult } from "../../../src/governance/check-approval.js";
import {
  generatePrGateReport,
  PR_GATE_COMMENT_MARKER,
} from "../../../src/governance/pr-reporter.js";

describe("pr-reporter", () => {
  it("renders approved specification report with task progress and matching hashes", () => {
    const result: GateResult = {
      passed: true,
      bypassed: false,
      modifiedSourceFiles: ["src/auth/jwt.ts", "src/auth/session.ts"],
      modifiedExemptFiles: ["README.md"],
      activeApprovedChange: "auth-refactor",
      changeDetails: {
        id: "auth-refactor",
        title: "JWT Authentication Refactoring",
        status: "approved",
        approvalCode: "approved",
        approved: true,
        approvedBy: "security-lead",
        approvedAt: "2026-10-10T12:00:00Z",
        approvedHash: "abcdef1234567890",
        currentHash: "abcdef1234567890",
        tasks: { total: 4, completed: 3 },
        isArchived: false,
      },
    };

    const markdown = generatePrGateReport(result, { lang: "en" });

    expect(markdown).toContain(PR_GATE_COMMENT_MARKER);
    expect(markdown).toContain("🟢 **APPROVED**");
    expect(markdown).toContain("`auth-refactor`");
    expect(markdown).toContain("@security-lead");
    expect(markdown).toContain("`abcdef1234...`");
    expect(markdown).toContain("JWT Authentication Refactoring");
    expect(markdown).toContain("`3/4` completed (75%)");
    expect(markdown).toContain("Cryptographic Integrity Verified");
    expect(markdown).toContain("Bypass Used**: **None**");
  });

  it("renders re-approval required report when spec was modified after approval", () => {
    const result: GateResult = {
      passed: false,
      bypassed: false,
      modifiedSourceFiles: ["src/api/routes.ts"],
      changeDetails: {
        id: "api-v2",
        title: "API v2 Endpoints",
        status: "approved",
        approvalCode: "reapproval_required",
        approved: false,
        approvedBy: "lead-dev",
        approvedHash: "1111111111111111",
        currentHash: "2222222222222222",
        tasks: { total: 2, completed: 0 },
        isArchived: false,
      },
      reason: "Specification was modified after approval. Re-approval required.",
    };

    const markdown = generatePrGateReport(result, { lang: "es" });

    expect(markdown).toContain("🔴 **RE-APROBACIÓN REQUERIDA**");
    expect(markdown).toContain("`1111111111111111`");
    expect(markdown).toContain("`2222222222222222`");
    expect(markdown).toContain("specty approve api-v2");
  });

  it("renders orphan source modifications when no change exists", () => {
    const result: GateResult = {
      passed: false,
      bypassed: false,
      modifiedSourceFiles: ["src/secret.ts"],
      modifiedExemptFiles: [],
      reason: "Modifications in source files without an active approved change",
    };

    const markdown = generatePrGateReport(result, { lang: "es" });

    expect(markdown).toContain("🔴 **SIN CHANGE APROBADO**");
    expect(markdown).toContain("`src/secret.ts`");
    expect(markdown).toContain("Gate Bloqueado");
  });

  it("renders emergency bypass audit when bypass is active", () => {
    const result: GateResult = {
      passed: true,
      bypassed: true,
      bypassDetails: {
        timestamp: "2026-10-10T14:30:00Z",
        user: "octocat",
        source: "trailer",
        reason: "Hotfix outage incident 99",
        files: ["src/fix.ts"],
      },
      modifiedSourceFiles: ["src/fix.ts"],
    };

    const markdown = generatePrGateReport(result, { lang: "es" });

    expect(markdown).toContain("⚠️ **BYPASS ACTIVO**");
    expect(markdown).toContain("Hotfix outage incident 99");
    expect(markdown).toContain("`octocat`");
    expect(markdown).toContain(".specty/audit/bypasses.jsonl");
  });

  it("renders clean pass when only exempt files are modified", () => {
    const result: GateResult = {
      passed: true,
      bypassed: false,
      modifiedSourceFiles: [],
      modifiedExemptFiles: ["docs/guide.md", "README.md"],
    };

    const markdown = generatePrGateReport(result, { lang: "en" });

    expect(markdown).toContain("⚪ **NO GOVERNED CODE**");
    expect(markdown).toContain("No governed source files were touched");
  });
});
