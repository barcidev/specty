import path from "node:path";
import * as p from "@clack/prompts";
import { loadConfig, type SpectyConfig, saveConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";
import { type WaitActionResult, waitForChangeAction } from "../../governance/wait-action.js";

export interface WaitCommandOptions {
  cwd?: string;
  timeout?: string | number;
  poll?: string | number;
  json?: boolean;
  disable?: boolean;
  enable?: boolean;
  status?: boolean;
  force?: boolean;
}

export async function executeWait(
  changeArg?: string,
  options: WaitCommandOptions = {},
): Promise<WaitActionResult> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  // 1. Manejo de flags de configuración CLI (--disable, --enable, --status)
  if (options.disable || options.enable || options.status) {
    let config: SpectyConfig;
    try {
      config = await loadConfig(repoRoot);
    } catch {
      config = { governance: { wait: true } } as SpectyConfig;
    }

    if (options.status) {
      const isEnabled = config.governance?.wait !== false;
      if (options.json) {
        console.log(JSON.stringify({ action: "status", wait: isEnabled }));
      } else {
        logger.info(
          `Estado de espera reactiva ('specty wait'): ${isEnabled ? "activada (enabled)" : "desactivada (disabled)"}`,
        );
      }
      return {
        action: "skipped",
        changeId: changeArg || "",
        details: { message: `Wait option is ${isEnabled ? "enabled" : "disabled"}` },
      };
    }

    const newWaitValue = Boolean(options.enable);
    config.governance = {
      ...config.governance,
      wait: newWaitValue,
    };

    await saveConfig(repoRoot, config);

    if (options.json) {
      console.log(JSON.stringify({ action: "configured", wait: newWaitValue }));
    } else {
      if (newWaitValue) {
        logger.success("✓ Espera reactiva ('specty wait') activada en .specty/config.yaml");
      } else {
        logger.success("✓ Espera reactiva ('specty wait') desactivada en .specty/config.yaml");
      }
    }

    return {
      action: "skipped",
      changeId: changeArg || "",
      details: { message: `Wait option set to ${newWaitValue}` },
    };
  }

  // 2. Verificar si la opción wait está desactivada en la configuración
  let config: SpectyConfig | null = null;
  try {
    config = await loadConfig(repoRoot);
  } catch {
    // Config no encontrada o por defecto
  }

  const isWaitEnabled = config?.governance?.wait !== false;
  if (!isWaitEnabled && !options.force) {
    const skippedResult: WaitActionResult = {
      action: "skipped",
      changeId: changeArg || "",
      details: {
        message:
          "La espera reactiva ('specty wait') está desactivada en la configuración (.specty/config.yaml).",
      },
    };

    if (options.json) {
      console.log(JSON.stringify(skippedResult));
    } else {
      logger.info(
        "ℹ Espera reactiva ('specty wait') desactivada en .specty/config.yaml.\n  (Usa 'specty wait --force' para esperar puntualmente, o 'specty wait --enable' para reactivarla)",
      );
    }

    return skippedResult;
  }

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
      if (result.details?.feedbackComments && result.details.feedbackComments.length > 0) {
        console.log("\n📝 Ajustes solicitados por el usuario:");
        for (const fb of result.details.feedbackComments) {
          console.log(`- [${fb.sectionTitle || "General"}]: ${fb.comment}`);
        }
        console.log("");
      }
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
      if (result.details?.feedbackComments && result.details.feedbackComments.length > 0) {
        for (const fb of result.details.feedbackComments) {
          logger.info(`  - [${fb.sectionTitle || "General"}]: ${fb.comment}`);
        }
      }
    } else if (result.action === "timeout") {
      logger.warn(`Tiempo de espera agotado: ${result.details?.message || ""}`);
    }
  }

  return result;
}
