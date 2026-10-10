import path from "node:path";
import { loadConfig, type McpServerDefinition, saveConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { getMcpPreset, listMcpPresets } from "../../mcp/presets.js";
import { McpServer } from "../../mcp/server.js";
import { executeSync } from "./sync.js";

export interface McpCliOptions {
  cwd?: string;
}

export interface McpAddOptions extends McpCliOptions {
  preset?: string;
  command?: string;
  args?: string | string[];
  env?: string[];
  roles?: string | string[];
  description?: string;
}

export async function executeMcp(options: McpCliOptions = {}): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const server = new McpServer(repoRoot);
  await server.start();
}

export async function executeMcpList(options: McpCliOptions = {}): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);

  logger.info("Specty MCP Configuration & Servers:\n");
  logger.info(`  • Status: ${config.mcp.enabled ? "Enabled" : "Disabled"}`);
  logger.info(`  • Graph Provider: ${config.mcp.graph_provider}`);
  if (config.mcp.graph_provider === "codebase-memory") {
    logger.info(`    Command: ${config.mcp.codebase_memory.command}`);
  }

  const customServers = config.mcp.custom_servers ?? {};
  const serverNames = Object.keys(customServers);

  logger.info(`\nCustom MCP Servers configured (${serverNames.length}):`);
  if (serverNames.length === 0) {
    logger.info(
      "  (No custom MCP servers defined. Add one with 'specty mcp add <name> --preset <preset>')",
    );
  } else {
    for (const name of serverNames) {
      const s = customServers[name];
      if (!s) continue;
      logger.info(`  • [${name}]`);
      logger.info(`    Command: ${s.command} ${(s.args ?? []).join(" ")}`);
      if (s.roles && s.roles.length > 0) {
        logger.info(`    Authorized Roles: ${s.roles.join(", ")}`);
      }
      if (s.env && Object.keys(s.env).length > 0) {
        logger.info(`    Environment: ${Object.keys(s.env).join(", ")}`);
      }
      if (s.description) {
        logger.info(`    Description: ${s.description}`);
      }
    }
  }

  const presets = listMcpPresets();
  logger.info("\nAvailable 3rd-Party Presets:");
  for (const preset of presets) {
    logger.info(`  - ${preset.id.padEnd(14)}: ${preset.description}`);
  }
}

export async function executeMcpAdd(name: string, options: McpAddOptions = {}): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);

  let serverDef: McpServerDefinition;

  if (options.preset) {
    const preset = getMcpPreset(options.preset);
    if (!preset) {
      logger.error(
        `Unknown MCP preset: "${options.preset}". Available: ${listMcpPresets()
          .map((p) => p.id)
          .join(", ")}`,
      );
      return false;
    }
    serverDef = {
      command: options.command ?? preset.server.command,
      args: options.args
        ? Array.isArray(options.args)
          ? options.args
          : options.args.split(" ")
        : preset.server.args,
      env: preset.server.env ? { ...preset.server.env } : undefined,
      transport: "stdio",
      description: options.description ?? preset.description,
      roles: options.roles
        ? Array.isArray(options.roles)
          ? options.roles
          : options.roles.split(",")
        : preset.server.roles,
    };
  } else {
    if (!options.command) {
      logger.error("Must specify either --preset <preset> or --command <cmd>");
      return false;
    }
    const envObj: Record<string, string> = {};
    if (options.env) {
      for (const e of options.env) {
        const [k, v] = e.split("=");
        if (k && v !== undefined) {
          envObj[k.trim()] = v.trim();
        }
      }
    }

    serverDef = {
      command: options.command,
      args: options.args
        ? Array.isArray(options.args)
          ? options.args
          : options.args.split(" ")
        : [],
      env: Object.keys(envObj).length > 0 ? envObj : undefined,
      transport: "stdio",
      description: options.description,
      roles: options.roles
        ? Array.isArray(options.roles)
          ? options.roles
          : options.roles.split(",")
        : undefined,
    };
  }

  config.mcp.custom_servers = config.mcp.custom_servers ?? {};
  config.mcp.custom_servers[name] = serverDef;

  await saveConfig(repoRoot, config);
  logger.success(`✓ Registered custom MCP server "${name}" in .specty/config.yaml`);

  // Propagate to all configured editors immediately
  await executeSync({ cwd: repoRoot });
  logger.success(`✓ Propagated MCP server "${name}" to all active editor configurations.`);

  return true;
}

export async function executeMcpRemove(
  name: string,
  options: McpCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);

  if (!config.mcp.custom_servers?.[name]) {
    logger.warn(`No custom MCP server found with name "${name}".`);
    return false;
  }

  delete config.mcp.custom_servers[name];
  await saveConfig(repoRoot, config);
  logger.success(`✓ Removed custom MCP server "${name}" from .specty/config.yaml`);

  // Sync editor configs to clean up
  await executeSync({ cwd: repoRoot });
  logger.success(`✓ Removed MCP server "${name}" from active editor configurations.`);

  return true;
}
