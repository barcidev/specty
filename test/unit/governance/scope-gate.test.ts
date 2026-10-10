import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { approveChange } from "../../../src/governance/approvals.js";
import { checkApprovalGate } from "../../../src/governance/check-approval.js";

describe("scope gate and change resolution (C3)", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-scope-test-"));
    await initGitRepo(tmpDir, "main");

    const config = createDefaultConfig({
      spec_engine: "builtin",
      governance: {
        hooks: true,
        ci: "github",
        source_paths: ["src/**"],
        exempt_paths: ["**/*.md", "openspec/**", "docs/**"],
        bypass: { env: "SPECTY_BYPASS", trailer: "Specty-Bypass" },
        quality_gates: { lint: true, test: true, static: true, coverage_min: 0 },
      },
    });
    await saveConfig(tmpDir, config);

    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const init = true;\n");
    await fs.writeFile(path.join(tmpDir, "src/auth.ts"), "export const auth = false;\n");
    await fs.writeFile(path.join(tmpDir, "src/billing.ts"), "export const billing = false;\n");

    await execa("git", ["config", "user.name", "Tester"], { cwd: tmpDir });
    await execa("git", ["config", "user.email", "tester@specty.local"], { cwd: tmpDir });
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "initial commit"], { cwd: tmpDir });

    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("passes when modifying files strictly within [files: ...] task scope", async () => {
    const changeDir = await engine.createChange(tmpDir, "auth-only", { title: "Auth Only" });

    // Restrict task scope to src/auth.ts
    const tasks = `# Tasks: Auth Only\n\n## 1. Implementation\n- [ ] 1.1 Auth task [agent: backend] [files: src/auth.ts]\n`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasks, "utf8");

    await approveChange(tmpDir, "auth-only", { approvedBy: "Tech Lead" });

    // Modify only allowed file
    await fs.writeFile(path.join(tmpDir, "src/auth.ts"), "export const auth = true;\n");
    await execa("git", ["add", "src/auth.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(true);
    expect(result.activeApprovedChange).toBe("auth-only");
    expect(result.outOfScopeFiles).toBeUndefined();
  });

  it("fails with out_of_scope when modifying source files outside [files: ...] scope", async () => {
    const changeDir = await engine.createChange(tmpDir, "scoped-change", {
      title: "Scoped Feature",
    });

    const tasks = `# Tasks: Scoped Feature\n\n## 1. Implementation\n- [ ] 1.1 Work on auth [agent: backend] [files: src/auth.ts]\n`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasks, "utf8");

    await approveChange(tmpDir, "scoped-change", { approvedBy: "Lead" });

    // Modify an out-of-scope file (src/billing.ts)
    await fs.writeFile(path.join(tmpDir, "src/billing.ts"), "export const billing = true;\n");
    await execa("git", ["add", "src/billing.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("out_of_scope");
    expect(result.outOfScopeFiles).toContain("src/billing.ts");
    expect(result.reason).toContain("outside the scope of approved change");
  });

  it("resolves change linked to branch feature/<change-id>", async () => {
    const changeDir = await engine.createChange(tmpDir, "payment-gateway", { title: "Payment" });
    const tasks = `# Tasks: Payment\n\n## 1. Implementation\n- [ ] 1.1 Payment task [agent: backend] [files: src/billing.ts]\n`;
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasks, "utf8");
    await approveChange(tmpDir, "payment-gateway", { approvedBy: "Lead" });

    // Switch to branch feature/payment-gateway
    await execa("git", ["checkout", "-b", "feature/payment-gateway"], { cwd: tmpDir });

    await fs.writeFile(
      path.join(tmpDir, "src/billing.ts"),
      "export const billing = 'processed';\n",
    );
    await execa("git", ["add", "src/billing.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(true);
    expect(result.activeApprovedChange).toBe("payment-gateway");
  });

  it("reports ambiguity when multiple active approved changes exist without branch/trailer link", async () => {
    await engine.createChange(tmpDir, "change-a", { title: "Change A" });
    await engine.createChange(tmpDir, "change-b", { title: "Change B" });

    await approveChange(tmpDir, "change-a", { approvedBy: "Lead" });
    await approveChange(tmpDir, "change-b", { approvedBy: "Lead" });

    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const update = true;\n");
    await execa("git", ["add", "src/index.ts"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("ambiguous_active_changes");
  });
});
