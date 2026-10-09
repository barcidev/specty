import { isInsideGitRepo } from "../../core/git.js";
import { isHuskyConfigured, isHuskyHookInstalled } from "./husky.js";
import {
  findLefthookConfigFile,
  isLefthookConfigured,
  isLefthookHookInstalled,
} from "./lefthook.js";
import { hasCustomNativeHook, isNativeHookInstalled } from "./native.js";
import { isSimpleGitHooksConfigured, isSimpleGitHooksInstalled } from "./simple-git-hooks.js";
import type { DetectedHookManager } from "./types.js";

export async function detectHookManagers(repoRoot: string): Promise<DetectedHookManager[]> {
  const managers: DetectedHookManager[] = [];

  // 1. Husky
  if (await isHuskyConfigured(repoRoot)) {
    const isInstalled = await isHuskyHookInstalled(repoRoot);
    managers.push({
      type: "husky",
      name: "Husky",
      configPath: ".husky/pre-commit",
      isInstalled,
      hasCustomContent: true,
    });
  }

  // 2. Lefthook
  if (await isLefthookConfigured(repoRoot)) {
    const configFile = (await findLefthookConfigFile(repoRoot)) || "lefthook.yml";
    const isInstalled = await isLefthookHookInstalled(repoRoot);
    managers.push({
      type: "lefthook",
      name: "Lefthook",
      configPath: configFile,
      isInstalled,
      hasCustomContent: true,
    });
  }

  // 3. simple-git-hooks
  if (await isSimpleGitHooksConfigured(repoRoot)) {
    const isInstalled = await isSimpleGitHooksInstalled(repoRoot);
    managers.push({
      type: "simple-git-hooks",
      name: "simple-git-hooks",
      configPath: "package.json",
      isInstalled,
      hasCustomContent: true,
    });
  }

  // 4. Native Git Hook
  const isGit = await isInsideGitRepo(repoRoot);
  if (isGit) {
    const isInstalled = await isNativeHookInstalled(repoRoot);
    const hasCustom = await hasCustomNativeHook(repoRoot);
    managers.push({
      type: "native",
      name: "Native Git Hook",
      configPath: ".git/hooks/pre-commit",
      isInstalled,
      hasCustomContent: hasCustom,
    });
  }

  return managers;
}

export async function findActiveHookManager(repoRoot: string): Promise<DetectedHookManager | null> {
  const managers = await detectHookManagers(repoRoot);
  return managers.find((m) => m.isInstalled) || null;
}

export async function detectPrimaryHookManager(
  repoRoot: string,
): Promise<DetectedHookManager | null> {
  const managers = await detectHookManagers(repoRoot);
  if (managers.length === 0) {
    return null;
  }

  // Prefer manager where it is already installed
  const installed = managers.find((m) => m.isInstalled);
  if (installed) {
    return installed;
  }

  // Otherwise prefer explicit managers over native
  const nonNative = managers.find((m) => m.type !== "native");
  if (nonNative) {
    return nonNative;
  }

  return managers.find((m) => m.type === "native") || null;
}
