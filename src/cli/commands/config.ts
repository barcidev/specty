import path from "node:path";
import yaml from "yaml";
import { loadConfig, type SpectyConfig, saveConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";

export interface ConfigCommandOptions {
  cwd?: string;
  json?: boolean;
  enable?: boolean;
  disable?: boolean;
  status?: boolean;
}

export async function executeConfigGet(
  key?: string,
  options: ConfigCommandOptions = {},
): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);

  if (!key) {
    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log(yaml.stringify(config));
    }
    return;
  }

  const value = getNestedProperty(config, key);
  if (options.json) {
    console.log(JSON.stringify({ key, value }));
  } else {
    console.log(typeof value === "object" ? yaml.stringify(value) : String(value));
  }
}

export async function executeConfigSet(
  key: string,
  rawValue: string,
  options: ConfigCommandOptions = {},
): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);

  let parsedValue: unknown = rawValue;
  if (rawValue === "true") {
    parsedValue = true;
  } else if (rawValue === "false") {
    parsedValue = false;
  } else if (!Number.isNaN(Number(rawValue)) && rawValue.trim() !== "") {
    parsedValue = Number(rawValue);
  } else {
    try {
      parsedValue = JSON.parse(rawValue);
    } catch {
      parsedValue = rawValue;
    }
  }

  setNestedProperty(config, key, parsedValue);
  await saveConfig(repoRoot, config);

  if (options.json) {
    console.log(JSON.stringify({ success: true, key, value: parsedValue }));
  } else {
    logger.success(`✓ Configuración '${key}' actualizada a: ${JSON.stringify(parsedValue)}`);
  }
}

export async function executeConfigWait(options: ConfigCommandOptions = {}): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot).catch(
    () => ({ governance: { wait: true } }) as SpectyConfig,
  );

  if (options.status || (!options.enable && !options.disable)) {
    const isEnabled = config.governance?.wait !== false;
    if (options.json) {
      console.log(JSON.stringify({ action: "status", wait: isEnabled }));
    } else {
      logger.info(
        `Estado de espera reactiva ('specty wait'): ${isEnabled ? "activada (enabled)" : "desactivada (disabled)"}`,
      );
    }
    return;
  }

  const newWaitValue = Boolean(options.enable);
  config.governance = {
    ...config.governance,
    wait: newWaitValue,
  };

  await saveConfig(repoRoot, config);

  if (options.json) {
    console.log(JSON.stringify({ success: true, wait: newWaitValue }));
  } else {
    if (newWaitValue) {
      logger.success("✓ Espera reactiva ('specty wait') activada en .specty/config.yaml");
    } else {
      logger.success("✓ Espera reactiva ('specty wait') desactivada en .specty/config.yaml");
    }
  }
}

function getNestedProperty(obj: unknown, pathStr: string): unknown {
  const parts = pathStr.split(".");
  let curr: unknown = obj;
  for (const part of parts) {
    if (curr == null || typeof curr !== "object") return undefined;
    curr = (curr as Record<string, unknown>)[part];
  }
  return curr;
}

function setNestedProperty(obj: unknown, pathStr: string, value: unknown): void {
  const parts = pathStr.split(".");
  let curr: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) continue;
    if (curr == null || typeof curr !== "object") return;
    const record = curr as Record<string, unknown>;
    if (record[part] == null || typeof record[part] !== "object") {
      record[part] = {};
    }
    curr = record[part];
  }
  const lastPart = parts[parts.length - 1];
  if (lastPart && curr != null && typeof curr === "object") {
    (curr as Record<string, unknown>)[lastPart] = value;
  }
}
