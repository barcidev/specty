import { Command } from "commander";
import { BINARY_NAME, PACKAGE_NAME, VERSION } from "../index.js";

const program = new Command();

program
  .name(BINARY_NAME)
  .description("Specification-driven AI assistant governance and scaffolding CLI")
  .version(`${PACKAGE_NAME} v${VERSION}`, "-v, --version", "output the current version");

program
  .command("init")
  .description("initialize specty governance and AI assistant scaffolding in repository")
  .option("-y, --yes", "non-interactive mode with defaults")
  .option("--dry-run", "preview changes without writing files")
  .option("--lang <language>", "configuration and spec language (en or es)")
  .action((_options) => {
    console.log(`Starting ${BINARY_NAME} initialization...`);
  });

program.parse(process.argv);
