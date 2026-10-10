import {
  type DetectedHookManager,
  detectHookManagers,
  detectPrimaryHookManager,
  findActiveHookManager,
  type HookInstallOptions,
  type HookInstallResult,
  type HookManagerType,
  type HookUninstallResult,
  hasCustomNativeHook,
  installHuskyHook,
  installLefthookHook,
  installNativeHook,
  installSimpleGitHooks,
  isHuskyConfigured,
  isHuskyHookInstalled,
  isLefthookConfigured,
  isLefthookHookInstalled,
  isNativeHookInstalled,
  isSimpleGitHooksConfigured,
  isSimpleGitHooksInstalled,
  NATIVE_HOOK_BLOCK,
  PRE_COMMIT_HOOK_NAME,
  SPECTY_HOOK_CMD,
  uninstallHuskyHook,
  uninstallLefthookHook,
  uninstallNativeHook,
  uninstallSimpleGitHooks,
} from "./hook-managers/index.js";

export {
  type DetectedHookManager,
  detectHookManagers,
  detectPrimaryHookManager,
  findActiveHookManager,
  type HookInstallOptions,
  type HookInstallResult,
  type HookManagerType,
  type HookUninstallResult,
  hasCustomNativeHook,
  installHuskyHook,
  installLefthookHook,
  installNativeHook,
  installSimpleGitHooks,
  isHuskyConfigured,
  isHuskyHookInstalled,
  isLefthookConfigured,
  isLefthookHookInstalled,
  isNativeHookInstalled,
  isSimpleGitHooksConfigured,
  isSimpleGitHooksInstalled,
  NATIVE_HOOK_BLOCK,
  PRE_COMMIT_HOOK_NAME,
  SPECTY_HOOK_CMD,
  uninstallHuskyHook,
  uninstallLefthookHook,
  uninstallNativeHook,
  uninstallSimpleGitHooks,
};

export const HOOK_SCRIPT = `#!/usr/bin/env sh
# Managed by specty (AI assistant governance)
if [ "$SPECTY_HOOK_DISABLED" = "1" ] || [ "$SPECTY_BYPASS" = "1" ]; then
  exit 0
fi

${SPECTY_HOOK_CMD}
`;

export async function installHookWithManager(
  repoRoot: string,
  options: HookInstallOptions = {},
): Promise<HookInstallResult> {
  const targetManager = options.manager;

  if (targetManager) {
    switch (targetManager) {
      case "husky":
        return installHuskyHook(repoRoot);
      case "lefthook":
        return installLefthookHook(repoRoot);
      case "simple-git-hooks":
        return installSimpleGitHooks(repoRoot);
      case "native":
        return installNativeHook(repoRoot);
    }
  }

  const primary = await detectPrimaryHookManager(repoRoot);
  if (!primary) {
    return {
      success: false,
      manager: "native",
      targetPath: ".git/hooks/pre-commit",
      action: "skipped",
      message: "Not inside a Git repository",
    };
  }

  switch (primary.type) {
    case "husky":
      return installHuskyHook(repoRoot);
    case "lefthook":
      return installLefthookHook(repoRoot);
    case "simple-git-hooks":
      return installSimpleGitHooks(repoRoot);
    default:
      return installNativeHook(repoRoot);
  }
}

export async function uninstallHookWithManager(
  repoRoot: string,
  options: { manager?: HookManagerType } = {},
): Promise<HookUninstallResult> {
  if (options.manager) {
    switch (options.manager) {
      case "husky":
        return uninstallHuskyHook(repoRoot);
      case "lefthook":
        return uninstallLefthookHook(repoRoot);
      case "simple-git-hooks":
        return uninstallSimpleGitHooks(repoRoot);
      case "native":
        return uninstallNativeHook(repoRoot);
    }
  }

  const active = await findActiveHookManager(repoRoot);
  if (active) {
    switch (active.type) {
      case "husky":
        return uninstallHuskyHook(repoRoot);
      case "lefthook":
        return uninstallLefthookHook(repoRoot);
      case "simple-git-hooks":
        return uninstallSimpleGitHooks(repoRoot);
      case "native":
        return uninstallNativeHook(repoRoot);
    }
  }

  // Fallback: try native
  return uninstallNativeHook(repoRoot);
}

export async function installGitHooks(
  repoRoot: string,
  options: HookInstallOptions = {},
): Promise<boolean> {
  const result = await installHookWithManager(repoRoot, options);
  return result.success;
}

export async function uninstallGitHooks(
  repoRoot: string,
  options: { manager?: HookManagerType } = {},
): Promise<boolean> {
  const result = await uninstallHookWithManager(repoRoot, options);
  return result.success;
}

export async function checkGitHooksStatus(
  repoRoot: string,
): Promise<{ active: boolean; manager?: DetectedHookManager }> {
  const activeManager = await findActiveHookManager(repoRoot);
  if (activeManager) {
    return { active: true, manager: activeManager };
  }
  return { active: false };
}
