import path from "node:path";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { getSpecEngine } from "../../engines/factory.js";
import { validateChangeSpecification } from "../../governance/spec-validator.js";

export interface ValidateCommandOptions {
  cwd?: string;
  strict?: boolean;
  json?: boolean;
}

export interface ChangeValidationSummary {
  id: string;
  valid: boolean;
  errorsCount: number;
  warningsCount: number;
  issues: {
    file: string;
    line?: number;
    rule?: string;
    severity: "error" | "warning";
    message: string;
  }[];
}

export interface ValidateReport {
  valid: boolean;
  totalErrors: number;
  totalWarnings: number;
  changes: ChangeValidationSummary[];
}

export async function executeValidate(
  changeArg?: string,
  options: ValidateCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);
  const engine = getSpecEngine(config.spec_engine);

  const changesToValidate = changeArg
    ? [changeArg.trim()]
    : (await engine.listChanges(repoRoot)).map((c) => c.id);

  if (changesToValidate.length === 0) {
    if (options.json) {
      console.log(
        JSON.stringify({ valid: true, totalErrors: 0, totalWarnings: 0, changes: [] }, null, 2),
      );
    } else {
      logger.info("No active changes found in openspec/changes/ to validate.");
    }
    return true;
  }

  const summaries: ChangeValidationSummary[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const id of changesToValidate) {
    const change = await engine.getChange(repoRoot, id);
    if (!change) {
      logger.error(`Change "${id}" not found in openspec/changes/`);
      return false;
    }

    const res = await validateChangeSpecification(change.path, {
      strict: options.strict,
    });

    const issues = res.issues.map((i) => ({
      file: path.relative(repoRoot, i.file),
      line: i.line,
      rule: i.rule,
      severity: i.severity,
      message: i.message,
    }));

    const errorsCount = res.errorsCount ?? 0;
    const warningsCount = res.warningsCount ?? 0;

    totalErrors += errorsCount;
    totalWarnings += warningsCount;

    summaries.push({
      id,
      valid: res.valid,
      errorsCount,
      warningsCount,
      issues,
    });
  }

  const allValid = options.strict ? totalErrors === 0 && totalWarnings === 0 : totalErrors === 0;

  if (options.json) {
    const report: ValidateReport = {
      valid: allValid,
      totalErrors,
      totalWarnings,
      changes: summaries,
    };
    console.log(JSON.stringify(report, null, 2));
    return allValid;
  }

  logger.info("\nSpecty Specification Semantic Validation:\n");

  for (const s of summaries) {
    if (s.valid && s.warningsCount === 0) {
      logger.success(`✓ Change "${s.id}": Specification is fully conforming.`);
    } else if (s.valid) {
      logger.warn(`⚠ Change "${s.id}": Valid with ${s.warningsCount} warning(s).`);
    } else {
      logger.error(
        `✖ Change "${s.id}": Invalid (${s.errorsCount} error(s), ${s.warningsCount} warning(s)).`,
      );
    }

    for (const issue of s.issues) {
      const loc = issue.line ? `:${issue.line}` : "";
      const rule = issue.rule ? ` [${issue.rule}]` : "";
      if (issue.severity === "error") {
        logger.error(`    ✖ ${issue.file}${loc}${rule}: ${issue.message}`);
      } else {
        logger.warn(`    ⚠ ${issue.file}${loc}${rule}: ${issue.message}`);
      }
    }
  }

  if (allValid) {
    logger.success("\nAll specification changes validated successfully!");
  } else {
    logger.error(`\nValidation failed: ${totalErrors} error(s) found across specification files.`);
  }

  return allValid;
}
