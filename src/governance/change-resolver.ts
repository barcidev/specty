import { loadConfig } from "../core/config.js";
import { executeFile } from "../core/exec.js";
import { getCurrentBranch } from "../core/git.js";
import { getSpecEngine } from "../engines/factory.js";
import type { ChangeMetadata } from "../engines/types.js";

export interface ResolveChangeOptions {
  changeId?: string;
  trailerKey?: string;
  headRef?: string;
  baseRef?: string;
}

export type ChangeResolutionSource = "option" | "trailer" | "branch" | "single_active" | "none";

export interface TargetChangeResolution {
  resolvedId: string | null;
  change: ChangeMetadata | null;
  source: ChangeResolutionSource;
  activeChanges: ChangeMetadata[];
  isAmbiguous: boolean;
  reason?: string;
}

/**
 * Extracts a candidate change ID from a Git branch name.
 * Matches conventions like:
 * - feature/my-change -> my-change
 * - change/my-change  -> my-change
 * - fix/my-change     -> my-change
 */
export function extractChangeIdFromBranch(branch: string): string | null {
  if (!branch) return null;
  const clean = branch.trim();
  const prefixMatch = clean.match(/^(?:feature|change|feat|fix|task)\/([a-zA-Z0-9._-]+)$/i);
  if (prefixMatch?.[1]) {
    return prefixMatch[1];
  }
  return null;
}

/**
 * Resolves the active specification change associated with the current working context,
 * checking in order:
 * 1. Explicit CLI/function option (`options.changeId`)
 * 2. Git commit trailer (`Specty-Change: <id>`)
 * 3. Git branch name (`feature/<id>`, `change/<id>`)
 * 4. Single active approved change in repository
 */
export async function resolveTargetChange(
  repoRoot: string,
  options?: ResolveChangeOptions,
): Promise<TargetChangeResolution> {
  const config = await loadConfig(repoRoot);
  const engine = getSpecEngine(config.spec_engine);
  const activeChanges = await engine.listChanges(repoRoot);

  // 1. Explicit change ID
  if (options?.changeId) {
    const match = activeChanges.find((c) => c.id === options.changeId);
    return {
      resolvedId: options.changeId,
      change: match ?? null,
      source: "option",
      activeChanges,
      isAmbiguous: false,
      reason: `Specified explicitly via option '${options.changeId}'.`,
    };
  }

  // 2. Commit Trailer
  const trailerKey = options?.trailerKey ?? "Specty-Change";
  try {
    const logRange = options?.baseRef ? `${options.baseRef}...${options?.headRef ?? "HEAD"}` : "-1";
    const trailerRes = await executeFile(
      "git",
      ["log", logRange, `--format=%(trailers:key=${trailerKey},valueonly)`],
      { cwd: repoRoot, silent: true },
    );
    const trailers = trailerRes.stdout
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    const trailerVal = trailers[0];
    if (trailerVal) {
      const match = activeChanges.find((c) => c.id === trailerVal);
      return {
        resolvedId: trailerVal,
        change: match ?? null,
        source: "trailer",
        activeChanges,
        isAmbiguous: false,
        reason: `Linked via Git commit trailer '${trailerKey}: ${trailerVal}'.`,
      };
    }
  } catch {
    // Git log error non-fatal
  }

  // 3. Current Git branch name
  const currentBranch = await getCurrentBranch(repoRoot);
  if (currentBranch) {
    const candidateId = extractChangeIdFromBranch(currentBranch);
    if (candidateId) {
      const match = activeChanges.find((c) => c.id === candidateId);
      if (match) {
        return {
          resolvedId: candidateId,
          change: match,
          source: "branch",
          activeChanges,
          isAmbiguous: false,
          reason: `Resolved from current Git branch '${currentBranch}'.`,
        };
      }
    }

    // Direct match between branch name and active change ID
    const directMatch = activeChanges.find((c) => c.id === currentBranch);
    if (directMatch) {
      return {
        resolvedId: currentBranch,
        change: directMatch,
        source: "branch",
        activeChanges,
        isAmbiguous: false,
        reason: `Branch name matches active change '${currentBranch}'.`,
      };
    }
  }

  // 4. Fallback: single active change or single approved active change
  if (activeChanges.length === 1 && activeChanges[0]) {
    const single = activeChanges[0];
    return {
      resolvedId: single.id,
      change: single,
      source: "single_active",
      activeChanges,
      isAmbiguous: false,
      reason: `Single active specification change found in repository ('${single.id}').`,
    };
  }

  const approvedChanges = activeChanges.filter(
    (c) => c.status === "approved" || c.status === "in-progress" || c.status === "verifying",
  );

  if (approvedChanges.length === 1 && approvedChanges[0]) {
    const singleApproved = approvedChanges[0];
    return {
      resolvedId: singleApproved.id,
      change: singleApproved,
      source: "single_active",
      activeChanges,
      isAmbiguous: false,
      reason: `Single approved active change found in repository ('${singleApproved.id}').`,
    };
  }

  if (approvedChanges.length > 1) {
    return {
      resolvedId: null,
      change: null,
      source: "none",
      activeChanges,
      isAmbiguous: true,
      reason: `Multiple active changes detected (${approvedChanges.map((c) => c.id).join(", ")}). Specify change via --change <id>, commit trailer 'Specty-Change: <id>', or branch 'feature/<id>'.`,
    };
  }

  return {
    resolvedId: null,
    change: null,
    source: "none",
    activeChanges,
    isAmbiguous: false,
    reason: "No active specification change found for the current branch or commit.",
  };
}
