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

program.parse(process.argv);
