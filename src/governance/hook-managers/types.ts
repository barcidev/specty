export type HookManagerType = "husky" | "lefthook" | "simple-git-hooks" | "native";

export interface DetectedHookManager {
  type: HookManagerType;
  name: string;
  configPath: string;
  isInstalled: boolean;
  hasCustomContent: boolean;
}

export interface HookInstallOptions {
  manager?: HookManagerType;
  force?: boolean;
  interactive?: boolean;
}

export interface HookInstallResult {
  success: boolean;
  manager: HookManagerType;
  targetPath: string;
  action: "created" | "appended" | "already-installed" | "skipped";
  message: string;
}

export interface HookUninstallResult {
  success: boolean;
  manager?: HookManagerType;
  targetPath?: string;
  action: "removed-file" | "removed-entry" | "not-found";
  message: string;
}
