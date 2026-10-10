import path from "node:path";
import { logger } from "../../core/logger.js";
import {
  evaluateGuard,
  type GuardDecision,
  type GuardInput,
  parseGuardPayload,
} from "../../governance/guard.js";

export interface GuardCliOptions {
  cwd?: string;
  tool?: string;
  file?: string;
  command?: string;
  change?: string;
  json?: boolean;
}

/**
 * Reads standard input asynchronously if data is piped.
 */
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }

  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (chunk) => {
      data += chunk;
    });

    process.stdin.on("end", () => {
      resolve(data.trim());
    });

    process.stdin.on("error", () => {
      resolve("");
    });
  });
}

export async function executeGuard(options: GuardCliOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  let input: GuardInput = {
    toolName: options.tool,
    filePath: options.file,
    command: options.command,
    changeId: options.change,
  };

  // If no direct flags provided, attempt to parse JSON from piped stdin
  if (!input.toolName && !input.filePath && !input.command) {
    const rawStdin = await readStdin();
    if (rawStdin) {
      try {
        const parsedJson = JSON.parse(rawStdin);
        input = {
          ...parseGuardPayload(parsedJson),
          changeId: options.change,
        };
      } catch {
        // Stdin was not valid JSON; fallback
      }
    }
  }

  const decision: GuardDecision = await evaluateGuard(repoRoot, input);

  if (options.json) {
    console.log(JSON.stringify(decision, null, 2));
    return decision.allowed;
  }

  if (!decision.allowed) {
    logger.error(
      `[specty guard DENIED] ${decision.reason ?? "Action blocked by governance rules."}`,
    );
    if (decision.actionAdvice) {
      logger.warn(`Action Advice: ${decision.actionAdvice}`);
    }
    return false;
  }

  return true;
}
