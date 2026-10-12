import fs from "node:fs/promises";
import path from "node:path";
import { loadChangeReviews } from "../ui/reviews.js";
import { checkApprovalStatus } from "./approvals.js";
import { resolveTargetChange } from "./change-resolver.js";

export interface WaitActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  signal?: AbortSignal;
}

export interface WaitActionResult {
  action: "approved" | "updated" | "timeout" | "aborted";
  changeId: string;
  details?: {
    approvedHash?: string;
    approvedBy?: string;
    message?: string;
  };
}

export async function waitForChangeAction(
  repoRoot: string,
  changeIdArg?: string,
  options: WaitActionOptions = {},
): Promise<WaitActionResult> {
  const changeId = await changeArgOrDefault(repoRoot, changeIdArg);
  if (!changeId) {
    throw new Error("No active change specified or found to wait for.");
  }

  const timeoutMs = options.timeoutMs ?? 600000; // 10 minutos por defecto
  const pollIntervalMs = options.pollIntervalMs ?? 300;
  const startTime = Date.now();

  const proposalPath = path.join(repoRoot, "openspec", "changes", changeId, "proposal.md");

  // Estado inicial
  const initialApproval = await checkApprovalStatus(repoRoot, changeId);
  const initialProposalContent = await readFileSafe(proposalPath);
  const initialReviews = await loadChangeReviews(repoRoot, changeId);
  const initialPendingReviews = initialReviews.filter((r) => !r.resolved).length;

  while (Date.now() - startTime < timeoutMs) {
    if (options.signal?.aborted) {
      return {
        action: "aborted",
        changeId,
        details: { message: "Espera cancelada por señal de interrupción." },
      };
    }

    // 1. Verificar si fue aprobado
    const currentApproval = await checkApprovalStatus(repoRoot, changeId);
    const becameApproved =
      currentApproval.approved &&
      (!initialApproval.approved || currentApproval.approvedHash !== initialApproval.approvedHash);

    if (becameApproved) {
      return {
        action: "approved",
        changeId,
        details: {
          approvedHash: currentApproval.approvedHash,
          approvedBy: currentApproval.approvedBy,
          message: `Plan aprobado por ${currentApproval.approvedBy || "usuario"}`,
        },
      };
    }

    // 2. Verificar si se actualizó proposal.md
    const currentProposalContent = await readFileSafe(proposalPath);
    if (currentProposalContent !== initialProposalContent && currentProposalContent.length > 0) {
      return {
        action: "updated",
        changeId,
        details: {
          message: "El archivo de propuesta (proposal.md) fue actualizado en el repositorio.",
        },
      };
    }

    // 3. Verificar si se aplicaron y consolidaron ajustes pendientes
    const currentReviews = await loadChangeReviews(repoRoot, changeId);
    const currentPendingReviews = currentReviews.filter((r) => !r.resolved).length;
    if (initialPendingReviews > 0 && currentPendingReviews === 0) {
      return {
        action: "updated",
        changeId,
        details: {
          message: "Todos los ajustes y comentarios del plan fueron aplicados y resueltos.",
        },
      };
    }

    await sleep(pollIntervalMs);
  }

  return {
    action: "timeout",
    changeId,
    details: {
      message: `Tiempo de espera agotado (${Math.round(timeoutMs / 1000)}s) sin acción registrada en la interfaz.`,
    },
  };
}

async function changeArgOrDefault(repoRoot: string, changeArg?: string): Promise<string> {
  if (changeArg && changeArg.trim().length > 0) {
    return changeArg.trim();
  }
  const resolution = await resolveTargetChange(repoRoot);
  return resolution.resolvedId || "";
}

async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
