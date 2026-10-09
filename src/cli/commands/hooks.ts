import path from "node:path";
import * as p from "@clack/prompts";
import { isInsideGitRepo } from "../../core/git.js";
import { logger } from "../../core/logger.js";
import {
  detectPrimaryHookManager,
  type HookManagerType,
  hasCustomNativeHook,
  installHookWithManager,
  uninstallHookWithManager,
} from "../../governance/git-hooks.js";

export interface HooksCliOptions {
  cwd?: string;
  manager?: HookManagerType;
  yes?: boolean;
  force?: boolean;
}

export async function executeHooksInstall(options: HooksCliOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());

  const isGit = await isInsideGitRepo(repoRoot);
  if (!isGit) {
    logger.error("Failed to install Git hook. Ensure this is a valid Git repository.");
    return false;
  }

  let selectedManager: HookManagerType | undefined = options.manager;

  const isInteractive = Boolean(process.stdout.isTTY && !options.yes && !selectedManager);

  if (isInteractive) {
    const primary = await detectPrimaryHookManager(repoRoot);

    if (primary && primary.type === "husky") {
      const choice = await p.select({
        message:
          "Husky detectado en el repositorio. ¿Dónde deseas configurar el hook de gobernanza de Specty?",
        options: [
          {
            value: "husky",
            label: "Inyectar en .husky/pre-commit",
            hint: "Recomendado para convivir con Husky",
          },
          {
            value: "native",
            label: "Instalar directamente en .git/hooks/pre-commit",
            hint: "Puede ser sobreescrito o ignorado por Husky",
          },
        ],
      });

      if (p.isCancel(choice)) {
        logger.info("Instalación de hooks cancelada.");
        return false;
      }
      selectedManager = choice as HookManagerType;
    } else if (primary && primary.type === "lefthook") {
      const choice = await p.select({
        message:
          "Lefthook detectado en el repositorio. ¿Dónde deseas configurar el hook de gobernanza de Specty?",
        options: [
          {
            value: "lefthook",
            label: `Configurar en ${primary.configPath}`,
            hint: "Recomendado para convivir con Lefthook",
          },
          {
            value: "native",
            label: "Instalar directamente en .git/hooks/pre-commit",
            hint: "Puede ser sobreescrito por lefthook install",
          },
        ],
      });

      if (p.isCancel(choice)) {
        logger.info("Instalación de hooks cancelada.");
        return false;
      }
      selectedManager = choice as HookManagerType;
    } else if (primary && primary.type === "simple-git-hooks") {
      const choice = await p.select({
        message:
          "simple-git-hooks detectado. ¿Dónde deseas configurar el hook de gobernanza de Specty?",
        options: [
          {
            value: "simple-git-hooks",
            label: "Configurar en package.json (simple-git-hooks)",
            hint: "Recomendado",
          },
          {
            value: "native",
            label: "Instalar directamente en .git/hooks/pre-commit",
          },
        ],
      });

      if (p.isCancel(choice)) {
        logger.info("Instalación de hooks cancelada.");
        return false;
      }
      selectedManager = choice as HookManagerType;
    } else {
      const hasCustom = await hasCustomNativeHook(repoRoot);
      if (hasCustom) {
        const proceed = await p.confirm({
          message:
            "Se detectó un pre-commit hook existente en .git/hooks/. ¿Deseas anexar el bloque de Specty preservando tu script actual?",
          initialValue: true,
        });
        if (p.isCancel(proceed) || !proceed) {
          logger.info("Instalación de hooks cancelada.");
          return false;
        }
      }
    }
  }

  const result = await installHookWithManager(repoRoot, {
    manager: selectedManager,
    force: options.force,
  });

  if (result.success) {
    if (result.action === "already-installed") {
      logger.info(result.message);
    } else {
      logger.success(result.message);
    }
    return true;
  }

  logger.error(result.message || "Failed to install Git hook.");
  return false;
}

export async function executeHooksUninstall(options: HooksCliOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const result = await uninstallHookWithManager(repoRoot, {
    manager: options.manager,
  });

  if (result.success) {
    logger.success(result.message);
    return true;
  }

  logger.warn(result.message);
  return false;
}
