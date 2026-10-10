import { evaluateGuard, type GuardDecision } from "../governance/guard.js";
import { ADVERSARIAL_EVAL_SCENARIOS, type AdversarialScenario } from "./scenarios.js";

export interface ScenarioEvalResult {
  scenario: AdversarialScenario;
  passed: boolean;
  decision: GuardDecision;
  errorReason?: string;
}

export interface AdherenceEvalSuiteResult {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  adherenceRate: number; // 0 - 100 percentage
  categoryBreakdown: Record<string, { total: number; passed: number; rate: number }>;
  results: ScenarioEvalResult[];
}

export interface RunAdherenceEvalsOptions {
  scenarioId?: string;
  scenarios?: AdversarialScenario[];
}

/**
 * Runs the adversarial adherence evaluation suite against Specty governance gates and guards,
 * verifying that the system successfully halts unauthorized drift attempts.
 */
export async function runAdherenceEvals(
  repoRoot: string,
  options: RunAdherenceEvalsOptions = {},
): Promise<AdherenceEvalSuiteResult> {
  let scenarios = options.scenarios ?? ADVERSARIAL_EVAL_SCENARIOS;

  if (options.scenarioId) {
    scenarios = scenarios.filter((s) => s.id === options.scenarioId);
    if (scenarios.length === 0) {
      throw new Error(`Scenario with id "${options.scenarioId}" not found.`);
    }
  }

  const results: ScenarioEvalResult[] = [];
  const categoryStats: Record<string, { total: number; passed: number }> = {};

  for (const scenario of scenarios) {
    const stats = categoryStats[scenario.category] ?? { total: 0, passed: 0 };
    categoryStats[scenario.category] = stats;
    stats.total++;

    const decision = await evaluateGuard(repoRoot, scenario.testInput);

    const isBlocked = !decision.allowed;
    const expectedBlocked = scenario.expectedResult === "blocked";

    let passed = isBlocked === expectedBlocked;
    let errorReason: string | undefined;

    if (!passed) {
      errorReason = `Expected result "${scenario.expectedResult}", but guard returned "${decision.allowed ? "allowed" : "blocked"}".`;
    } else if (scenario.expectedCode && decision.code !== scenario.expectedCode) {
      passed = false;
      errorReason = `Expected guard code "${scenario.expectedCode}", but received "${decision.code}".`;
    }

    if (passed) {
      stats.passed++;
    }

    results.push({
      scenario,
      passed,
      decision,
      errorReason,
    });
  }

  const totalScenarios = results.length;
  const passedScenarios = results.filter((r) => r.passed).length;
  const failedScenarios = totalScenarios - passedScenarios;
  const adherenceRate =
    totalScenarios > 0 ? Math.round((passedScenarios / totalScenarios) * 100) : 100;

  const categoryBreakdown: Record<string, { total: number; passed: number; rate: number }> = {};
  for (const [cat, stats] of Object.entries(categoryStats)) {
    categoryBreakdown[cat] = {
      total: stats.total,
      passed: stats.passed,
      rate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 100,
    };
  }

  return {
    totalScenarios,
    passedScenarios,
    failedScenarios,
    adherenceRate,
    categoryBreakdown,
    results,
  };
}
