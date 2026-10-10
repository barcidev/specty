import path from "node:path";
import picocolors from "picocolors";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { getSpecEngine } from "../../engines/factory.js";
import { dispatchSpecViewer } from "../../ui/dispatcher.js";

export interface ViewCommandOptions {
  cwd?: string;
  idePlan?: boolean;
  web?: boolean;
  port?: number | string;
  noOpen?: boolean;
}

export async function executeView(
  changeArg?: string,
  options: ViewCommandOptions = {},
): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot).catch(() => ({ spec_engine: "openspec" }));
  const engine = getSpecEngine(config.spec_engine as "openspec" | "builtin");

  let targetChangeId = changeArg?.trim();
  if (!targetChangeId) {
    const changes = await engine.listChanges(repoRoot);
    if (changes.length === 0) {
      logger.warn("No active changes found in openspec/changes/ to view.");
      return;
    }
    targetChangeId = changes[0]?.id;
  }

  if (!targetChangeId) {
    logger.error("No change specified or found.");
    return;
  }

  const result = await dispatchSpecViewer(repoRoot, targetChangeId, {
    preferIdePlan: options.idePlan || (!options.web && undefined),
    openBrowser: !options.noOpen,
  });

  if (result.mode === "ide-plan") {
    console.log(
      `\n${picocolors.bold(picocolors.green("⚡ Visor de Planes de IDE (Antigravity):"))}`,
    );
    console.log(`  ${picocolors.cyan(result.message)}`);
    console.log(
      `${picocolors.dim("  El archivo ha sido sincronizado con formato enriquecido para el visor del editor.")}\n`,
    );
  } else {
    console.log(`\n${picocolors.bold(picocolors.green("⚡ Interfaz Web Local (Specty UI):"))}`);
    console.log(`  ${picocolors.cyan(result.message)}`);
    console.log(`${picocolors.dim("  Sincronización en vivo SSE activa.")}\n`);
  }
}
