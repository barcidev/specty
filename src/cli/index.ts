import { Command } from "commander";
import { BINARY_NAME, PACKAGE_NAME, VERSION } from "../index.js";
import { executeInit } from "./commands/init.js";

const program = new Command();

program
  .name(BINARY_NAME)
  .description("Specification-driven AI assistant governance and scaffolding CLI")
  .version(`${PACKAGE_NAME} v${VERSION}`, "-v, --version", "output the current version");

program
  .command("init")
  .description("interactive onboarding and complete repository scaffolding")
  .option("-y, --yes", "non-interactive mode with defaults")
  .option("--dry-run", "preview changes without writing files")
  .option("--lang <language>", "configuration and spec language (en or es)")
  .option("--tool <tools...>", "comma-separated or listed AI assistant tools")
  .option("--stack <stack>", "explicit project stack override")
  .option("--spec-engine <engine>", "spec engine (openspec or builtin)")
  .option("--no-hooks", "disable git hooks setup")
  .option("--no-ci", "disable CI pipeline setup")
  .option("--no-mcp", "disable MCP server configuration")
  .option("--verbose", "enable verbose logging")
  .action(async (options) => {
    try {
      await executeInit(options);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

const adaptersCmd = program.command("adapters").description("manage AI assistant tool adapters");

adaptersCmd
  .command("list")
  .description("list all supported AI tools and their enablement status")
  .action(async () => {
    try {
      const { executeAdaptersList } = await import("./commands/adapters.js");
      await executeAdaptersList();
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

adaptersCmd
  .command("add <tool>")
  .description("enable and scaffold files for an AI assistant tool")
  .option("--dry-run", "preview changes without writing files")
  .action(async (tool: string, options) => {
    try {
      const { executeAdaptersAdd } = await import("./commands/adapters.js");
      await executeAdaptersAdd(tool, options);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

adaptersCmd
  .command("remove <tool>")
  .description("disable and remove files for an AI assistant tool")
  .option("--dry-run", "preview changes without writing files")
  .action(async (tool: string, options) => {
    try {
      const { executeAdaptersRemove } = await import("./commands/adapters.js");
      await executeAdaptersRemove(tool, options);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("approve [change]")
  .description("review and approve an active specification change with content hashing")
  .option("-y, --yes", "approve without interactive confirmation prompt")
  .option("--dry-run", "preview approval without writing metadata")
  .option("--user <name>", "approver name (defaults to current user)")
  .action(async (change: string | undefined, options) => {
    try {
      const { executeApprove } = await import("./commands/approve.js");
      await executeApprove(change, options);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("status")
  .description("show project status, active scopes, configured tools, and changes")
  .option("--json", "output status as JSON")
  .action(async (options) => {
    try {
      const { executeStatus } = await import("./commands/status.js");
      await executeStatus(options);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("sync")
  .description("synchronize AI tool configs and rules with current project configuration")
  .option("--dry-run", "preview changes without writing files")
  .action(async (options) => {
    try {
      const { executeSync } = await import("./commands/sync.js");
      await executeSync(options);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("doctor")
  .description("verify repository setup, detect drift, and inspect tool health")
  .option("--fix", "attempt automatic repairs for missing tool files and manifest")
  .action(async (options) => {
    try {
      const { executeDoctor } = await import("./commands/doctor.js");
      const report = await executeDoctor(options);
      if (!report.healthy) {
        process.exit(1);
      }
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("check-approval")
  .description("verify that modified source files have an active approved specification change")
  .option("--staged", "check only staged Git changes (for pre-commit hooks)")
  .option("--bypass <reason>", "explicit emergency bypass reason (logged for audit)")
  .action(async (options) => {
    try {
      const { executeCheckApproval } = await import("./commands/check-approval.js");
      const passed = await executeCheckApproval(options);
      if (!passed) {
        process.exit(1);
      }
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

const hooksCmd = program.command("hooks").description("manage Git pre-commit governance hooks");

hooksCmd
  .command("install")
  .description("install pre-commit hook enforcing specification approval")
  .action(async () => {
    try {
      const { executeHooksInstall } = await import("./commands/hooks.js");
      const success = await executeHooksInstall();
      if (!success) {
        process.exit(1);
      }
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

hooksCmd
  .command("uninstall")
  .description("uninstall pre-commit hook")
  .action(async () => {
    try {
      const { executeHooksUninstall } = await import("./commands/hooks.js");
      await executeHooksUninstall();
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

const handoffCmd = program
  .command("handoff")
  .description("manage agent session handoffs across sequential transitions");

handoffCmd
  .command("create <change>")
  .description("record a new sub-agent session handoff document")
  .option("--from <role>", "source sub-agent role (e.g. orchestrator, backend)")
  .option("--to <role>", "destination sub-agent role (e.g. backend, testing)")
  .option("--tasks <list>", "comma-separated list of completed tasks")
  .option("--files <list>", "comma-separated list of modified files")
  .option("--decisions <list>", "comma-separated list of architectural decisions")
  .option("--notes <text>", "contextual notes or blocker diagnostics")
  .action(async (change: string, options) => {
    try {
      const { executeHandoffCreate } = await import("./commands/handoff.js");
      await executeHandoffCreate(change, options);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

handoffCmd
  .command("list <change>")
  .description("list all recorded handoffs for a specification change")
  .action(async (change: string) => {
    try {
      const { executeHandoffList } = await import("./commands/handoff.js");
      await executeHandoffList(change);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

handoffCmd
  .command("show <change> [id]")
  .description("display details of a specific handoff or the latest one")
  .action(async (change: string, id: string | undefined) => {
    try {
      const { executeHandoffShow } = await import("./commands/handoff.js");
      await executeHandoffShow(change, id);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("mcp")
  .description("start the local Model Context Protocol (MCP) server over stdio")
  .action(async () => {
    try {
      const { executeMcp } = await import("./commands/mcp.js");
      await executeMcp();
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse(process.argv);
