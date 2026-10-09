import fs from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";
import { SPECTY_HOOK_CMD } from "./constants.js";
import type { HookInstallResult, HookUninstallResult } from "./types.js";

const LEFTHOOK_CONFIG_FILES = ["lefthook.yml", ".lefthook.yml", "lefthook.yaml", ".lefthook.yaml"];

export async function findLefthookConfigFile(repoRoot: string): Promise<string | null> {
  for (const filename of LEFTHOOK_CONFIG_FILES) {
    const fullPath = path.join(repoRoot, filename);
    const exists = await fs
      .access(fullPath)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      return filename;
    }
  }
  return null;
}

export async function isLefthookConfigured(repoRoot: string): Promise<boolean> {
  const configFile = await findLefthookConfigFile(repoRoot);
  if (configFile) {
    return true;
  }

  try {
    const pkgRaw = await fs.readFile(path.join(repoRoot, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw);
    return Boolean(
      pkg.devDependencies?.lefthook ||
        pkg.devDependencies?.["@evilmartians/lefthook"] ||
        pkg.dependencies?.lefthook ||
        pkg.dependencies?.["@evilmartians/lefthook"],
    );
  } catch {
    return false;
  }
}

export async function isLefthookHookInstalled(repoRoot: string): Promise<boolean> {
  const configFile = await findLefthookConfigFile(repoRoot);
  if (!configFile) return false;

  try {
    const content = await fs.readFile(path.join(repoRoot, configFile), "utf8");
    const doc = yaml.parseDocument(content);
    const runCmd = doc.getIn(["pre-commit", "commands", "specty", "run"]);
    if (runCmd && String(runCmd).includes("specty check-approval")) {
      return true;
    }
    return content.includes("specty check-approval");
  } catch {
    return false;
  }
}

export async function installLefthookHook(repoRoot: string): Promise<HookInstallResult> {
  let configFile = await findLefthookConfigFile(repoRoot);
  if (!configFile) {
    configFile = "lefthook.yml";
  }

  const fullPath = path.join(repoRoot, configFile);
  let rawContent = "";
  let exists = false;

  try {
    rawContent = await fs.readFile(fullPath, "utf8");
    exists = true;
  } catch {
    exists = false;
  }

  if (exists) {
    const doc = yaml.parseDocument(rawContent);
    const existingRun = doc.getIn(["pre-commit", "commands", "specty", "run"]);
    if (existingRun && String(existingRun).includes("specty check-approval")) {
      return {
        success: true,
        manager: "lefthook",
        targetPath: configFile,
        action: "already-installed",
        message: `Specty command is already configured in ${configFile}`,
      };
    }

    if (!doc.has("pre-commit")) {
      doc.set("pre-commit", { commands: {} });
    }
    if (!doc.hasIn(["pre-commit", "commands"])) {
      doc.setIn(["pre-commit", "commands"], {});
    }

    doc.setIn(["pre-commit", "commands", "specty"], {
      run: SPECTY_HOOK_CMD,
    });

    await fs.writeFile(fullPath, doc.toString(), "utf8");
    return {
      success: true,
      manager: "lefthook",
      targetPath: configFile,
      action: "appended",
      message: `Configured Specty pre-commit command in ${configFile}`,
    };
  }

  const newDoc = new yaml.Document({
    "pre-commit": {
      commands: {
        specty: {
          run: SPECTY_HOOK_CMD,
        },
      },
    },
  });

  await fs.writeFile(fullPath, newDoc.toString(), "utf8");
  return {
    success: true,
    manager: "lefthook",
    targetPath: configFile,
    action: "created",
    message: `Created ${configFile} with Specty pre-commit command`,
  };
}

export async function uninstallLefthookHook(repoRoot: string): Promise<HookUninstallResult> {
  const configFile = await findLefthookConfigFile(repoRoot);
  if (!configFile) {
    return {
      success: false,
      manager: "lefthook",
      targetPath: "lefthook.yml",
      action: "not-found",
      message: "No Lefthook configuration file found",
    };
  }

  const fullPath = path.join(repoRoot, configFile);
  try {
    const rawContent = await fs.readFile(fullPath, "utf8");
    const doc = yaml.parseDocument(rawContent);

    if (!doc.hasIn(["pre-commit", "commands", "specty"])) {
      return {
        success: false,
        manager: "lefthook",
        targetPath: configFile,
        action: "not-found",
        message: `Specty command not found in ${configFile}`,
      };
    }

    doc.deleteIn(["pre-commit", "commands", "specty"]);
    await fs.writeFile(fullPath, doc.toString(), "utf8");

    return {
      success: true,
      manager: "lefthook",
      targetPath: configFile,
      action: "removed-entry",
      message: `Removed Specty pre-commit command from ${configFile}`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      manager: "lefthook",
      targetPath: configFile,
      action: "not-found",
      message: `Failed to update ${configFile}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
