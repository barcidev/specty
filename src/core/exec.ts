import { execa } from "execa";
import { logger } from "./logger.js";

export enum ExitCode {
  SUCCESS = 0,
  VERIFICATION_FAILED = 1,
  CONFIG_ERROR = 2,
  APPROVAL_REQUIRED = 3,
  ENVIRONMENT_ERROR = 4,
}

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  silent?: boolean;
}

export interface ExecResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  success: boolean;
}

/**
 * Executes a shell command line string safely while logging the exact command.
 */
export async function executeCommand(
  commandLine: string,
  options: ExecOptions = {},
): Promise<ExecResult> {
  const cwd = options.cwd ?? process.cwd();
  const startTime = Date.now();

  if (!options.silent) {
    logger.info(`$ ${commandLine} (cwd: ${cwd})`);
  }

  try {
    const result = await execa(commandLine, {
      shell: true,
      cwd,
      timeout: options.timeoutMs,
      env: options.env,
      reject: false,
    });

    const durationMs = Date.now() - startTime;
    const exitCode = typeof result.exitCode === "number" ? result.exitCode : 1;

    return {
      command: commandLine,
      exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs,
      success: exitCode === 0,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    return {
      command: commandLine,
      exitCode: 1,
      stdout: "",
      stderr: errorMessage,
      durationMs,
      success: false,
    };
  }
}
