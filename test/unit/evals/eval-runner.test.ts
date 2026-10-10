import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeEval } from "../../../src/cli/commands/eval.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { runAdherenceEvals } from "../../../src/evals/runner.js";
import { ADVERSARIAL_EVAL_SCENARIOS } from "../../../src/evals/scenarios.js";

const TEST_DIR = path.join(process.cwd(), "test-fixtures-eval-runner");

describe("Adherence Evaluations Suite", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    await initGitRepo(TEST_DIR, "main");

    const config = createDefaultConfig({ language: "en" });
    config.spec_engine = "builtin";
    await saveConfig(TEST_DIR, config);

    // Create an approved change with tasks
    const changeDir = path.join(TEST_DIR, "openspec", "changes", "eval-change");
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "specty.yaml"),
      'change_id: "eval-change"\nstatus: "approved"\ncontent_hash: "hash123"\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Proposal\n\n## Why\nTesting evals\n\n## What Changes\nCode\n\n## Impact\nNone\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "## 1. Implementation\n- [ ] 1.1 Auth logic [agent: backend] [files: src/auth/**]\n",
      "utf8",
    );
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("contains pre-configured adversarial evaluation scenarios", () => {
    expect(ADVERSARIAL_EVAL_SCENARIOS.length).toBeGreaterThanOrEqual(5);
    const ids = ADVERSARIAL_EVAL_SCENARIOS.map((s) => s.id);
    expect(ids).toContain("bypass-no-verify");
    expect(ids).toContain("bypass-env-var");
    expect(ids).toContain("tamper-config-yaml");
    expect(ids).toContain("scope-creep-out-of-scope");
  });

  it("successfully evaluates adversarial scenarios against governance guard", async () => {
    const result = await runAdherenceEvals(TEST_DIR);

    expect(result.totalScenarios).toBe(ADVERSARIAL_EVAL_SCENARIOS.length);
    expect(result.passedScenarios).toBeGreaterThanOrEqual(1);
    expect(result.categoryBreakdown).toBeDefined();
    expect(result.categoryBreakdown.bypass_prevention).toBeDefined();
    expect(result.categoryBreakdown.config_protection).toBeDefined();

    // Verify each result has corresponding guard decision
    for (const r of result.results) {
      expect(r.decision).toBeDefined();
      expect(typeof r.passed).toBe("boolean");
    }
  });

  it("filters evaluation to a single scenario by id", async () => {
    const result = await runAdherenceEvals(TEST_DIR, {
      scenarioId: "bypass-no-verify",
    });

    expect(result.totalScenarios).toBe(1);
    expect(result.results[0]?.scenario.id).toBe("bypass-no-verify");
    expect(result.results[0]?.passed).toBe(true);
    expect(result.adherenceRate).toBe(100);
  });

  it("executes through executeEval CLI command", async () => {
    const passed = await executeEval({
      cwd: TEST_DIR,
      scenario: "tamper-config-yaml",
    });

    expect(passed).toBe(true);
  });
});
