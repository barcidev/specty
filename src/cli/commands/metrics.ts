import path from "node:path";
import pc from "picocolors";
import { computeMetricsSummary, readMetricEvents } from "../../metrics/index.js";

export interface MetricsCommandOptions {
  cwd?: string;
  json?: boolean;
}

export async function executeMetrics(options: MetricsCommandOptions = {}): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const events = await readMetricEvents(repoRoot);
  const summary = computeMetricsSummary(events);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `\n${pc.bold(pc.cyan("specty metrics"))} - Resumen de Gobernanza y Desarrollo\n\n`,
  );

  if (events.length === 0) {
    process.stdout.write(
      `${pc.yellow("No hay eventos ni métricas registradas en este repositorio aún.")}\n\n`,
    );
    return;
  }

  // General Overview
  process.stdout.write(`${pc.bold("📊 Visión General:")}\n`);
  process.stdout.write(
    `  - Eventos totales registrados: ${pc.bold(String(summary.totalEvents))}\n`,
  );
  process.stdout.write(
    `  - Cambios rastreados:          ${pc.bold(String(summary.totalChanges))}\n`,
  );
  process.stdout.write(
    `  - Bypasses de emergencia:      ${pc.bold(String(summary.totalBypasses))}\n\n`,
  );

  // Approval Governance
  process.stdout.write(`${pc.bold("🛡️  Gobernanza de Aprobaciones:")}\n`);
  process.stdout.write(
    `  - Aprobaciones concedidas:     ${pc.green(String(summary.totalApprovals))}\n`,
  );
  process.stdout.write(
    `  - Invalidaciones por desvío:   ${summary.totalInvalidations > 0 ? pc.red(String(summary.totalInvalidations)) : pc.dim("0")}\n`,
  );
  process.stdout.write(
    `  - Tasa de aprobación válida:   ${summary.approvalPassRate >= 80 ? pc.green(`${summary.approvalPassRate}%`) : pc.yellow(`${summary.approvalPassRate}%`)}\n\n`,
  );

  // Verifications
  process.stdout.write(`${pc.bold("🧪 Verificaciones:")}\n`);
  process.stdout.write(
    `  - Ejecuciones totales:         ${pc.bold(String(summary.totalVerifications))}\n`,
  );
  process.stdout.write(
    `  - Tasa de éxito:               ${summary.verificationSuccessRate >= 80 ? pc.green(`${summary.verificationSuccessRate}%`) : pc.yellow(`${summary.verificationSuccessRate}%`)}\n`,
  );

  const vTypes = Object.entries(summary.verificationsByType);
  if (vTypes.length > 0) {
    for (const [cmd, stats] of vTypes) {
      process.stdout.write(
        `    • ${pc.bold(cmd)}: ${pc.green(`${stats.passed} pass`)} / ${stats.failed > 0 ? pc.red(`${stats.failed} fail`) : pc.dim("0 fail")} (${stats.total} total)\n`,
      );
    }
  }
  process.stdout.write("\n");

  // Handoffs & Subagents
  process.stdout.write(`${pc.bold("🤖 Subagentes & Handoffs:")}\n`);
  process.stdout.write(
    `  - Handoffs transferidos:       ${pc.bold(String(summary.totalHandoffs))}\n`,
  );

  const roles = Object.entries(summary.handoffsByRole);
  if (roles.length > 0) {
    for (const [role, counts] of roles) {
      process.stdout.write(
        `    • ${pc.bold(role)}: ${counts.from} originados -> ${counts.to} recibidos\n`,
      );
    }
  }
  process.stdout.write("\n");
}
