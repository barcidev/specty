import path from "node:path";
import { logger } from "../../core/logger.js";
import {
  endAgentSession,
  getAgentSession,
  startAgentSession,
} from "../../governance/agent-session.js";
import { resolveTargetChange } from "../../governance/change-resolver.js";

export interface SessionCommandOptions {
  cwd?: string;
  activity?: string;
  agent?: string;
  role?: string;
  json?: boolean;
}

export async function executeSessionStart(
  changeArg?: string,
  options: SessionCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const resolution = await resolveTargetChange(repoRoot, { changeId: changeArg });
  const changeId = resolution.resolvedId ?? changeArg;

  const activity = options.activity || "Ajustando plan inicial";
  const session = await startAgentSession(repoRoot, {
    changeId,
    activity,
    agent: options.agent || "AI Agent",
    role: options.role || "orchestrator",
  });

  if (options.json) {
    console.log(JSON.stringify({ success: true, session }));
  } else {
    logger.success(
      `✓ Sesión de agente iniciada para "${changeId || "repositorio"}": "${activity}".`,
    );
    logger.info("  El botón de acción principal en la UI ha sido bloqueado preventivamente.");
  }

  return true;
}

export async function executeSessionEnd(
  changeArg?: string,
  options: SessionCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const resolution = await resolveTargetChange(repoRoot, { changeId: changeArg });
  const changeId = resolution.resolvedId ?? changeArg;

  const success = await endAgentSession(repoRoot, changeId);

  if (options.json) {
    console.log(JSON.stringify({ success, active: false }));
  } else {
    logger.success(`✓ Sesión de agente finalizada para "${changeId || "repositorio"}".`);
    logger.info("  El botón de acción principal en la UI ha sido rehabilitado.");
  }

  return success;
}

export async function executeSessionStatus(
  changeArg?: string,
  options: SessionCommandOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const resolution = await resolveTargetChange(repoRoot, { changeId: changeArg });
  const changeId = resolution.resolvedId ?? changeArg;

  const session = await getAgentSession(repoRoot, changeId);

  if (options.json) {
    console.log(JSON.stringify({ session }));
  } else {
    if (session?.active) {
      logger.info(`Estado de sesión: ACTIVA`);
      logger.info(`  Actividad: ${session.activity || "En progreso"}`);
      logger.info(`  Agente: ${session.agent || "AI Agent"} (${session.role || "orchestrator"})`);
      logger.info(`  Iniciada: ${session.startedAt}`);
      logger.info(`  Cambio: ${session.changeId || "N/A"}`);
    } else {
      logger.info(`Estado de sesión: INACTIVA (acciones en UI habilitadas)`);
    }
  }

  return Boolean(session?.active);
}
