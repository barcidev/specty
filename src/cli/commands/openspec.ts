import path from "node:path";
import { execa } from "execa";
import { loadConfig } from "../../core/config.js";
import { logger } from "../../core/logger.js";
import { getOpenSpecCmd } from "../../engines/openspec.js";

export interface OpenSpecCliOptions {
  cwd?: string;
}

export async function executeOpenSpec(
  args: string[] = [],
  options: OpenSpecCliOptions = {},
): Promise<number> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(repoRoot);

  if (config.spec_engine === "builtin") {
    logger.warn("This project is configured with the 'builtin' spec engine.");
    logger.warn("Native OpenSpec commands may not match your repository structure.");
  }

  const openspecCmd = await getOpenSpecCmd(repoRoot);

  try {
    // If openspecCmd contains arguments like "npx --no-install ...", execute through shell
    const fullCmd = `${openspecCmd} ${args.join(" ")}`.trim();
    const result = await execa(fullCmd, {
      cwd: repoRoot,
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
        OPENSPEC_TELEMETRY: "0",
      },
    });
    return result.exitCode ?? 0;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "exitCode" in err) {
      return (err as { exitCode: number }).exitCode;
    }
    logger.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}
