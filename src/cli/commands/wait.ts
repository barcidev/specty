import path from "node:path";
import * as p from "@clack/prompts";
import { logger } from "../../core/logger.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import { type WaitActionResult, waitForChangeAction } from "../../governance/wait-action.js";

export interface WaitCommandOptions {
  cwd?: string;
  timeout?: string | number;
  poll?: string | number;
  json?: boolean;
}

export async function executeWait(
  changeArg?: string,
  options: WaitCommandOptions = {},
): Promise<WaitActionResult> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  let targetChange = changeArg?.trim();
  if (!targetChange) {
    const resolution = await resolveTargetChange(repoRoot);
    targetChange = resolution.resolvedId?.trim();
  }

  if (!targetChange) {
    if (options.json) {
      console.log(
        JSON.stringify({
          action: "error",
          error: "No active specification change found to wait for.",
        }),
      );
    } else {
      logger.error("No se encontró ningún change activo para esperar.");
    }
    process.exit(1);
  }

  const timeoutSeconds = options.timeout !== undefined ? Number(options.timeout) : 0;
  const timeoutMs = Number.isNaN(timeoutSeconds) || timeoutSeconds <= 0 ? 0 : timeoutSeconds * 1000;
  const pollIntervalMs = options.poll ? Number(options.poll) : 300;

  const isInteractive = Boolean(process.stdout.isTTY && !options.json);
  let spinner: ReturnType<typeof p.spinner> | null = null;

  if (isInteractive) {
    p.intro(`specty wait - Esperando acción humana para el plan '${targetChange}'`);
    spinner = p.spinner();
    spinner.start(
      timeoutMs > 0
        ? `Esperando aprobación o ajustes en Specty UI (timeout: ${Math.round(timeoutMs / 1000)}s)...`
        : "Esperando aprobación o ajustes en Specty UI (espera indefinida)...",
    );
  } else if (!options.json) {
    logger.info(
      timeoutMs > 0
        ? `Esperando acción en Specty UI para el plan '${targetChange}' (timeout: ${Math.round(timeoutMs / 1000)}s)...`
        : `Esperando acción en Specty UI para el plan '${targetChange}' (espera indefinida)...`,
    );
  }

  const result = await waitForChangeAction(repoRoot, targetChange, {
    timeoutMs,
    pollIntervalMs,
  });

  if (isInteractive && spinner) {
    if (result.action === "approved") {
      spinner.stop(
        `✓ Plan aprobado con éxito (por: ${result.details?.approvedBy || "usuario"}, hash: #${result.details?.approvedHash?.slice(0, 8) || "OK"})`,
      );
      p.outro("Puedes proceder con la implementación de la primera tarea.");
    } else if (result.action === "updated") {
      spinner.stop("✓ Plan actualizado con nuevos comentarios y ajustes.");
      p.outro("El plan ha sido actualizado. Revisa las modificaciones y ajusta según corresponda.");
    } else if (result.action === "timeout") {
      spinner.stop("⏱ Tiempo de espera agotado sin acción en la interfaz.");
      p.outro(
        "La espera finalizó. Puedes reanudar cuando el plan haya sido aprobado o modificado.",
      );
    }
  } else if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    if (result.action === "approved") {
      logger.success(`Plan aprobado con éxito: ${result.details?.message || ""}`);
    } else if (result.action === "updated") {
      logger.info(`Plan actualizado en el repositorio: ${result.details?.message || ""}`);
    } else if (result.action === "timeout") {
      logger.warn(`Tiempo de espera agotado: ${result.details?.message || ""}`);
    }
  }

  return result;
}
