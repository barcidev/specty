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
  openedInIde: boolean;
  openedInBrowser: boolean;
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

/**
 * Prioridad 1: Intenta abrir el recurso en el visor interno del IDE
 * (panel de planes del editor o Simple Browser interno).
 * Devuelve true si tuvo éxito abriendo dentro del IDE.
 */
export async function openInIdeInternalViewer(target: {
  url?: string;
  filePath?: string;
}): Promise<boolean> {
  // En entornos de testing automatizado, evitar invocar binarios GUI externos
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return true;
  }

  const ide = detectIdeEnvironment();

  // 1. Si es archivo de plan, abrir directamente en el visor de archivos/planes del IDE
  if (target.filePath) {
    if (ide.isCursor) {
      try {
        await execa("cursor", ["-g", target.filePath]);
        return true;
      } catch {
        // continue
      }
    }

    if (ide.isVsCode || ide.isWindsurf) {
      try {
        await execa("code", ["-g", target.filePath]);
        return true;
      } catch {
        // continue
      }
    }

    // En Antigravity, el plan ya queda proyectado en el workspace para su visualización nativa
    if (ide.isAntigravity) {
      return true;
    }
  }

  // 2. Si es URL web, intentar abrir en el Simple Browser interno del IDE
  if (target.url) {
    // 2.1 Intentar comando CLI del editor con flag --open-url
    if (ide.isCursor) {
      try {
        await execa("cursor", ["--open-url", target.url]);
        return true;
      } catch {
        // continue
      }
    }

    if (ide.isVsCode || ide.isWindsurf) {
      try {
        await execa("code", ["--open-url", target.url]);
        return true;
      } catch {
        // continue
      }
    }

    // 2.2 En macOS, intentar handler directo del Simple Browser del editor
    if (process.platform === "darwin" && (ide.isVsCode || ide.isCursor)) {
      try {
        const handlerUri = ide.isCursor
          ? `cursor://vscode.simple-browser/open?url=${encodeURIComponent(target.url)}`
          : `vscode://vscode.simple-browser/open?url=${encodeURIComponent(target.url)}`;
        await execa("open", [handlerUri]);
        return true;
      } catch {
        // continue
      }
    }
  }

  return false;
}

/**
 * Última opción: Abrir en el navegador externo del sistema (Chrome, Safari, etc.)
 */
export async function openExternalBrowserFallback(url: string): Promise<boolean> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return true;
  }

  try {
    if (process.platform === "darwin") {
      await execa("open", [url]);
    } else if (process.platform === "win32") {
      await execa("cmd", ["/c", "start", url]);
    } else {
      await execa("xdg-open", [url]);
    }
    return true;
  } catch {
    return false;
  }
}

export async function dispatchSpecViewer(
  repoRoot: string,
  changeId: string,
  options: { preferIdePlan?: boolean; openBrowser?: boolean } = {},
): Promise<ViewerDispatchResult> {
  const ideInfo = detectIdeEnvironment();

  // Prioridad 1: Visor nativo de planes de Antigravity / IDE
  if (ideInfo.isAntigravity || options.preferIdePlan) {
    const planFilePath = await projectPlanForIde(repoRoot, changeId);
    const openedInIde = await openInIdeInternalViewer({ filePath: planFilePath });

    return {
      mode: "ide-plan",
      planFilePath,
      openedInIde,
      openedInBrowser: false,
      message: openedInIde
        ? `Plan proyectado y abierto en el visor interno del IDE: ${planFilePath}`
        : `Plan proyectado para el visor de Antigravity en: ${planFilePath}`,
    };
  }

  // Prioridad 2: Servidor Web Local (Specty UI)
  const { url, wasStarted } = await ensureUiServerActive(repoRoot, changeId);

  // Intentar primero en el visor / Simple Browser interno del IDE
  const openedInIde = await openInIdeInternalViewer({ url });
  let openedInBrowser = false;

  // ÚLTIMA OPCIÓN: Solo abrir navegador externo si falló el visor interno del IDE
  if (!openedInIde && options.openBrowser !== false) {
    openedInBrowser = await openExternalBrowserFallback(url);
  }

  let message = wasStarted
    ? `Servidor Specty UI activado automáticamente en segundo plano: ${url}`
    : `Specty UI activo: ${url}`;

  if (openedInIde) {
    message += ` (Abierto en el visor interno del IDE)`;
  } else if (openedInBrowser) {
    message += ` (Abierto en navegador del sistema como última opción)`;
  }

  return {
    mode: "ui-server",
    url,
    openedInIde,
    openedInBrowser,
    message,
  };
}
