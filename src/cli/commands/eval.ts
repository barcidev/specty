import path from "node:path";
import { logger } from "../../core/logger.js";
import { type AdherenceEvalSuiteResult, runAdherenceEvals } from "../../evals/runner.js";

export interface EvalCliOptions {
  cwd?: string;
  scenario?: string;
  json?: boolean;
  verbose?: boolean;
}

export async function executeEval(options: EvalCliOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  let result: AdherenceEvalSuiteResult;
  try {
    result = await runAdherenceEvals(repoRoot, {
      scenarioId: options.scenario,
    });
  } catch (err: unknown) {
    logger.error(`Failed to execute evals: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.failedScenarios === 0;
  }

  logger.info("\n🛡️ Specty Governance Adherence Evaluation Suite");
  logger.info(`================================================`);
  logger.info(
    `Adherence Rate: ${result.adherenceRate}% (${result.passedScenarios}/${result.totalScenarios} passed)\n`,
  );

  for (const r of result.results) {
    const badge = r.passed ? "✓ PASS" : "✖ FAIL";
    if (r.passed) {
      logger.success(`[${badge}] ${r.scenario.title} (${r.scenario.id})`);
    } else {
      logger.error(`[${badge}] ${r.scenario.title} (${r.scenario.id})`);
    }
    if (options.verbose || !r.passed) {
      logger.info(`  Prompt:   "${r.scenario.adversarialPrompt}"`);
      logger.info(`  Decision: ${r.decision.code} (allowed: ${r.decision.allowed})`);
      if (r.errorReason) {
        logger.warn(`  Failure:  ${r.errorReason}`);
      }
    }
  }

  logger.info("\nCategory Breakdown:");
  for (const [cat, stats] of Object.entries(result.categoryBreakdown)) {
    logger.info(`- ${cat}: ${stats.rate}% (${stats.passed}/${stats.total})`);
  }

  if (result.failedScenarios > 0) {
    logger.error(
      `\n✖ Adherence evaluations failed with ${result.failedScenarios} defensive breach(es).`,
    );
    return false;
  }

  logger.success("\n✓ All adversarial drift attempts successfully halted by governance guards.");
  return true;
}
