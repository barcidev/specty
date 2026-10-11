import type { SpectyConfig } from "./config.js";
import { type ExecOptions, type ExecResult, executeCommand } from "./exec.js";
import { logger } from "./logger.js";

export interface GlobalDependencyOptions {
  skipGlobalInstall?: boolean;
  commandRunner?: (commandLine: string, options?: ExecOptions) => Promise<ExecResult>;
  silent?: boolean;
}

export interface DependencyStatus {
  package: string;
  binary: string;
  required: boolean;
  installed: boolean;
  action: "already_installed" | "installed" | "failed" | "skipped";
}

export interface GlobalDependenciesResult {
  openspec: DependencyStatus;
  codebaseMemory: DependencyStatus;
}

export async function isBinaryAvailable(
  binary: string,
  runner: (cmd: string, opts?: ExecOptions) => Promise<ExecResult> = executeCommand,
): Promise<boolean> {
  const checkCmd = process.platform === "win32" ? `where ${binary}` : `which ${binary}`;
  try {
    const res = await runner(checkCmd, { silent: true });
    return res.success;
  } catch {
    return false;
  }
}

export async function ensureGlobalDependencies(
  config: SpectyConfig,
  options: GlobalDependencyOptions = {},
): Promise<GlobalDependenciesResult> {
  const runner = options.commandRunner ?? executeCommand;
  const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
  const skipInstall = options.skipGlobalInstall ?? (isTest && !options.commandRunner);

  const isLangEs = config.language === "es";

  // 1. OpenSpec Check & Install
  const openspecRequired = config.spec_engine === "openspec";
  const openspecBinary = "openspec";
  const openspecPackage = "@fission-ai/openspec";

  const openspecStatus: DependencyStatus = {
    package: openspecPackage,
    binary: openspecBinary,
    required: openspecRequired,
    installed: false,
    action: "skipped",
  };

  if (openspecRequired) {
    const isInstalled = await isBinaryAvailable(openspecBinary, runner);
    if (isInstalled) {
      openspecStatus.installed = true;
      openspecStatus.action = "already_installed";
    } else if (skipInstall) {
      openspecStatus.installed = false;
      openspecStatus.action = "skipped";
    } else {
      if (!options.silent) {
        logger.info(
          isLangEs
            ? `Instalando dependencia global requerida '${openspecPackage}' vía npm...`
            : `Installing required global dependency '${openspecPackage}' via npm...`,
        );
      }
      const installRes = await runner(`npm install -g ${openspecPackage}`);
      if (installRes.success) {
        openspecStatus.installed = true;
        openspecStatus.action = "installed";
        if (!options.silent) {
          logger.success(
            isLangEs
              ? `Dependencia global '${openspecPackage}' instalada exitosamente.`
              : `Global dependency '${openspecPackage}' installed successfully.`,
          );
        }
      } else {
        openspecStatus.installed = false;
        openspecStatus.action = "failed";
        if (!options.silent) {
          logger.warn(
            isLangEs
              ? `No se pudo instalar automáticamente '${openspecPackage}'. Puedes instalarlo manualmente con: npm install -g ${openspecPackage}`
              : `Could not automatically install '${openspecPackage}'. You can install it manually with: npm install -g ${openspecPackage}`,
          );
        }
      }
    }
  }

  // 2. Codebase Memory Check & Install
  const cbmRequired = Boolean(
    config.mcp?.enabled && config.mcp?.graph_provider === "codebase-memory",
  );
  const cbmBinary = config.mcp?.codebase_memory?.command || "codebase-memory-mcp";
  const cbmPackage = "codebase-memory-mcp";

  const cbmStatus: DependencyStatus = {
    package: cbmPackage,
    binary: cbmBinary,
    required: cbmRequired,
    installed: false,
    action: "skipped",
  };

  if (cbmRequired) {
    const isInstalled = await isBinaryAvailable(cbmBinary, runner);
    if (isInstalled) {
      cbmStatus.installed = true;
      cbmStatus.action = "already_installed";
    } else if (skipInstall) {
      cbmStatus.installed = false;
      cbmStatus.action = "skipped";
    } else {
      if (!options.silent) {
        logger.info(
          isLangEs
            ? `Instalando dependencia global requerida '${cbmPackage}' vía npm...`
            : `Installing required global dependency '${cbmPackage}' via npm...`,
        );
      }
      const installRes = await runner(`npm install -g ${cbmPackage}`);
      if (installRes.success) {
        cbmStatus.installed = true;
        cbmStatus.action = "installed";
        if (!options.silent) {
          logger.success(
            isLangEs
              ? `Dependencia global '${cbmPackage}' instalada exitosamente.`
              : `Global dependency '${cbmPackage}' installed successfully.`,
          );
        }
      } else {
        cbmStatus.installed = false;
        cbmStatus.action = "failed";
        if (!options.silent) {
          logger.warn(
            isLangEs
              ? `No se pudo instalar automáticamente '${cbmPackage}'. Puedes instalarlo manualmente con: npm install -g ${cbmPackage}`
              : `Could not automatically install '${cbmPackage}'. You can install it manually with: npm install -g ${cbmPackage}`,
          );
        }
      }
    }
  }

  return {
    openspec: openspecStatus,
    codebaseMemory: cbmStatus,
  };
}
