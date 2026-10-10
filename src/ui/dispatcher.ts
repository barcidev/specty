import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { getChangeDetail } from "./change-service.js";

export interface IdeEnvironmentInfo {
  isAntigravity: boolean;
  isVsCode: boolean;
  isCursor: boolean;
  isWindsurf: boolean;
  name: "antigravity" | "cursor" | "windsurf" | "vscode" | "browser";
}

export interface ViewerDispatchResult {
  mode: "ide-plan" | "ui-server";
  url?: string;
  planFilePath?: string;
  message: string;
}

export function detectIdeEnvironment(): IdeEnvironmentInfo {
  const env = process.env;

  const isAntigravity = Boolean(
    env.ANTIGRAVITY_IDE ||
      env.GEMINI_CLI ||
      env.ANTIGRAVITY_AGENT ||
      (env.HOME && env.GEMINI_CLI_CONFIG_DIR),
  );

  const isCursor = Boolean(env.CURSOR_VERSION || env.CURSOR_AGENT);
  const isWindsurf = Boolean(env.WINDSURF_VERSION || env.CODEIUM_VERSION);
  const isVsCode = Boolean(env.VSCODE_PID || env.TERM_PROGRAM === "vscode");

  let name: IdeEnvironmentInfo["name"] = "browser";
  if (isAntigravity) name = "antigravity";
  else if (isCursor) name = "cursor";
  else if (isWindsurf) name = "windsurf";
  else if (isVsCode) name = "vscode";

  return {
    isAntigravity,
    isVsCode,
    isCursor,
    isWindsurf,
    name,
  };
}

export async function isUiServerActive(host = "127.0.0.1", port = 4173): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 400);

  try {
    const res = await fetch(`http://${host}:${port}/api/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

export async function ensureUiServerActive(
  repoRoot: string,
  changeId?: string,
  port = 4173,
): Promise<{ url: string; wasStarted: boolean }> {
  const isActive = await isUiServerActive("127.0.0.1", port);
  const targetUrl = changeId
    ? `http://localhost:${port}/?change=${encodeURIComponent(changeId)}`
    : `http://localhost:${port}`;

  if (isActive) {
    return { url: targetUrl, wasStarted: false };
  }

  // Find specty CLI entrypoint
  const cliPath = path.resolve(import.meta.dirname, "../cli/index.js");

  const child = spawn(
    process.execPath,
    [
      cliPath,
      "ui",
      "--port",
      String(port),
      ...(changeId ? ["--change", changeId] : []),
      "--no-open",
    ],
    {
      cwd: repoRoot,
      detached: true,
      stdio: "ignore",
      env: { ...process.env },
    },
  );

  child.unref();

  // Wait for server to become responsive
  const start = Date.now();
  while (Date.now() - start < 3000) {
    await new Promise((r) => setTimeout(r, 150));
    const nowActive = await isUiServerActive("127.0.0.1", port);
    if (nowActive) {
      return { url: targetUrl, wasStarted: true };
    }
  }

  return { url: targetUrl, wasStarted: true };
}

export async function projectPlanForIde(repoRoot: string, changeId: string): Promise<string> {
  const detail = await getChangeDetail(repoRoot, changeId);
  const reportsDir = path.join(repoRoot, ".specty", "reports");
  await fs.mkdir(reportsDir, { recursive: true });

  const planPath = path.join(reportsDir, `${changeId}-plan.md`);
  const statusBadge = detail?.approval.approved
    ? "APPROVED"
    : detail?.status.toUpperCase() || "DRAFT";

  let content = `# Plan de Implementación: ${detail?.title || changeId}\n\n`;
  content += `> [!NOTE]\n`;
  content += `> **Change ID**: \`${changeId}\` | **Estado**: \`${statusBadge}\`\n`;
  if (detail?.approval.approved) {
    content += `> **Hash Aprobado**: \`${detail.approval.approvedHash}\` por \`${detail.approval.approvedBy}\`\n`;
  }
  content += `> **Progreso de Tareas**: ${detail?.tasksData.completed || 0} de ${detail?.tasksData.total || 0} completadas\n\n`;

  // Render proposal sections
  if (detail?.proposalSections && detail.proposalSections.length > 0) {
    content += `## Especificación y Propuesta\n\n`;
    for (const sec of detail.proposalSections) {
      content += `### ${sec.title}\n\n${sec.content}\n\n`;
    }
  }

  // Render tasks with checkboxes
  if (detail?.tasksData.items && detail.tasksData.items.length > 0) {
    content += `## Lista de Tareas y Roles\n\n`;
    for (const item of detail.tasksData.items) {
      const check = item.completed ? "[x]" : "[ ]";
      const roleTag = item.role ? ` \`[rol: ${item.role}]\`` : "";
      content += `- ${check} ${item.text}${roleTag}\n`;
    }
    content += "\n";
  }

  content += `> [!TIP]\n`;
  content += `> Para revisar diffs interactivos o aprobar con un solo clic, abre la interfaz local ejecutando: \`specty ui -c ${changeId}\`\n`;

  await fs.writeFile(planPath, content, "utf8");
  return planPath;
}

export async function dispatchSpecViewer(
  repoRoot: string,
  changeId: string,
  options: { preferIdePlan?: boolean; openBrowser?: boolean } = {},
): Promise<ViewerDispatchResult> {
  const ideInfo = detectIdeEnvironment();

  // Prioridad 1: Visor nativo de planes de Antigravity o si se pide explícitamente preferIdePlan
  if (ideInfo.isAntigravity || options.preferIdePlan) {
    const planFilePath = await projectPlanForIde(repoRoot, changeId);
    return {
      mode: "ide-plan",
      planFilePath,
      message: `Plan proyectado para el visor de Antigravity en: ${planFilePath}`,
    };
  }

  // Prioridad 2: Servidor Web Local (Specty UI)
  const { url, wasStarted } = await ensureUiServerActive(repoRoot, changeId);

  if (options.openBrowser !== false) {
    try {
      if (process.platform === "darwin") {
        await execa("open", [url]).catch(() => {});
      } else if (process.platform === "win32") {
        await execa("cmd", ["/c", "start", url]).catch(() => {});
      } else {
        await execa("xdg-open", [url]).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  return {
    mode: "ui-server",
    url,
    message: wasStarted
      ? `Servidor Specty UI activado automáticamente en segundo plano: ${url}`
      : `Specty UI activo. Visualizando spec en: ${url}`,
  };
}
