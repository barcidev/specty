import path from "node:path";
import { execa } from "execa";
import picocolors from "picocolors";
import { logger } from "../../core/logger.js";
import { startUiServer } from "../../ui/index.js";

export interface UiCommandOptions {
  cwd?: string;
  port?: number | string;
  host?: string;
  change?: string;
  open?: boolean;
  idePlan?: boolean;
}

export async function executeUi(options: UiCommandOptions = {}): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const port = options.port ? Number(options.port) : 4173;
  const host = options.host || "127.0.0.1";
  const shouldOpen = options.open !== false;

  logger.info(picocolors.cyan("Iniciando Specty UI (Dashboard Local)..."));

  const server = await startUiServer({
    repoRoot,
    port,
    host,
    initialChangeId: options.change,
  });

  const targetUrl = options.change
    ? `${server.url}/?change=${encodeURIComponent(options.change)}`
    : server.url;

  console.log(
    `\n${picocolors.bold(picocolors.green("⚡ Specty UI disponible en:"))} ${picocolors.underline(picocolors.cyan(targetUrl))}`,
  );
  console.log(`${picocolors.dim("  - Sincronización en vivo activada (SSE)")}`);
  console.log(`${picocolors.dim("  - Presiona Ctrl+C para detener el servidor")}\n`);

  if (shouldOpen) {
    try {
      if (process.platform === "darwin") {
        await execa("open", [targetUrl]).catch(() => {});
      } else if (process.platform === "win32") {
        await execa("cmd", ["/c", "start", targetUrl]).catch(() => {});
      } else {
        await execa("xdg-open", [targetUrl]).catch(() => {});
      }
    } catch {
      // Non-fatal if browser opening fails
    }
  }

  // Keep process alive until interrupt
  await new Promise<void>((resolve) => {
    const handleSignal = async () => {
      console.log(picocolors.yellow("\nDeteniendo Specty UI..."));
      await server.close();
      resolve();
      process.exit(0);
    };

    process.once("SIGINT", handleSignal);
    process.once("SIGTERM", handleSignal);
  });
}
