import path from "node:path";
import { loadConfig } from "../core/config.js";
import { executeFile } from "../core/exec.js";
import { logger } from "../core/logger.js";

export interface IndexOptions {
  cwd?: string;
  silent?: boolean;
  timeoutMs?: number;
}

export interface IndexResult {
  indexed: boolean;
  provider: "codebase-memory" | "builtin" | "none";
  nodes?: number;
  edges?: number;
  error?: string;
}

/**
 * Triggers repository indexing if MCP and codebase-memory are configured with auto_index.
 */
export async function triggerCodebaseIndex(
  repoRoot: string,
  options: IndexOptions = {},
): Promise<IndexResult> {
  const root = path.resolve(repoRoot);
  try {
    const config = await loadConfig(root);
    if (!config.mcp?.enabled) {
      return { indexed: false, provider: "none" };
    }

    if (config.mcp.graph_provider !== "codebase-memory") {
      return { indexed: false, provider: config.mcp.graph_provider };
    }

    if (config.mcp.codebase_memory?.auto_index === false) {
      return { indexed: false, provider: "codebase-memory" };
    }

    const command = config.mcp.codebase_memory?.command || "codebase-memory-mcp";

    if (!options.silent) {
      logger.info(`[specty] Indexando repositorio con ${command}...`);
    }

    const execResult = await executeFile(
      command,
      ["cli", "index_repository", "--repo-path", root],
      {
        cwd: root,
        silent: options.silent ?? false,
        timeoutMs: options.timeoutMs ?? 120_000,
      },
    );

    if (!execResult.success) {
      if (!options.silent) {
        logger.warn(
          `[specty] No se pudo completar la indexacion con ${command}: ${execResult.stderr || "error de ejecucion"}`,
        );
      }
      return {
        indexed: false,
        provider: "codebase-memory",
        error: execResult.stderr || "Execution failed",
      };
    }

    let nodes: number | undefined;
    let edges: number | undefined;
    try {
      const lines = execResult.stdout.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed.nodes === "number") nodes = parsed.nodes;
          if (typeof parsed.edges === "number") edges = parsed.edges;
        }
      }
    } catch {
      // Best-effort parse of telemetry output
    }

    if (!options.silent) {
      const stats = nodes !== undefined ? ` (${nodes} nodos, ${edges} aristas)` : "";
      logger.success(
        `[specty] Repositorio indexado en el grafo de conocimiento exitosamente${stats}.`,
      );
    }

    return {
      indexed: true,
      provider: "codebase-memory",
      nodes,
      edges,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!options.silent) {
      logger.warn(`[specty] Error al disparar indexacion de codebase-memory: ${msg}`);
    }
    return {
      indexed: false,
      provider: "codebase-memory",
      error: msg,
    };
  }
}
