import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../core/logger.js";

export interface AgentSessionState {
  active: boolean;
  changeId?: string | null;
  agent?: string;
  role?: string;
  activity?: string;
  startedAt?: string;
  updatedAt?: string;
}

const DEFAULT_SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutos de inactividad máxima

export function getAgentSessionPath(repoRoot: string): string {
  return path.join(repoRoot, ".specty", "agent-session.json");
}

/**
 * Obtiene el estado actual de la sesión del agente.
 * Si la sesión ha superado el tiempo máximo de expiración, se marca como inactiva automáticamente.
 */
export async function getAgentSession(
  repoRoot: string,
  changeId?: string,
): Promise<AgentSessionState | null> {
  const filePath = getAgentSessionPath(repoRoot);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw) as AgentSessionState;

    if (!data || typeof data.active !== "boolean") {
      return null;
    }

    if (!data.active) {
      return data;
    }

    // Verificar expiración por seguridad (para evitar bloqueos indefinidos si el agente crashea)
    const lastActiveTime = new Date(data.updatedAt || data.startedAt || 0).getTime();
    const now = Date.now();
    if (now - lastActiveTime > DEFAULT_SESSION_EXPIRY_MS) {
      const expiredSession: AgentSessionState = {
        ...data,
        active: false,
        updatedAt: new Date().toISOString(),
      };
      await fs.writeFile(filePath, JSON.stringify(expiredSession, null, 2), "utf8").catch(() => {});
      return expiredSession;
    }

    // Si se especifica un changeId, verificar si la sesión corresponde a este cambio
    if (changeId && data.changeId && data.changeId !== changeId) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Inicia una sesión de trabajo activa del agente, bloqueando acciones en la UI.
 */
export async function startAgentSession(
  repoRoot: string,
  params: Partial<AgentSessionState> = {},
): Promise<AgentSessionState> {
  const filePath = getAgentSessionPath(repoRoot);
  const now = new Date().toISOString();

  const sessionState: AgentSessionState = {
    active: true,
    changeId: params.changeId ?? null,
    agent: params.agent || "AI Agent",
    role: params.role || "orchestrator",
    activity: params.activity || "Ajustando plan inicial",
    startedAt: now,
    updatedAt: now,
  };

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(sessionState, null, 2), "utf8");
  } catch (err) {
    logger.error("Failed to write agent session lock:", err);
  }

  return sessionState;
}

/**
 * Finaliza la sesión de trabajo activa del agente, desbloqueando acciones en la UI.
 */
export async function endAgentSession(repoRoot: string, changeId?: string): Promise<boolean> {
  const filePath = getAgentSessionPath(repoRoot);
  try {
    const current = await getAgentSession(repoRoot);
    if (!current?.active) {
      return true;
    }

    // Si se especificó un changeId y no coincide con la sesión activa, no cerrar
    if (changeId && current.changeId && current.changeId !== changeId) {
      return false;
    }

    const closedState: AgentSessionState = {
      ...current,
      active: false,
      updatedAt: new Date().toISOString(),
    };

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(closedState, null, 2), "utf8");
    return true;
  } catch (err) {
    logger.error("Failed to release agent session lock:", err);
    return false;
  }
}

/**
 * Comprueba de forma booleana si hay una sesión activa de agente bloqueando el cambio.
 */
export async function isAgentSessionActive(repoRoot: string, changeId?: string): Promise<boolean> {
  const session = await getAgentSession(repoRoot, changeId);
  return Boolean(session?.active);
}
