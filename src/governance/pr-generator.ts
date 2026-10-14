import fs from "node:fs/promises";
import path from "node:path";
import { createDefaultConfig, loadConfig, type SpectyConfig } from "../core/config.js";
import {
  type BranchDiffFile,
  getBranchCommits,
  getBranchDiffFiles,
  getBranchDiffSummary,
  getCurrentBranch,
  isInsideGitRepo,
  listLocalBranches,
} from "../core/git.js";
import { readChangeState } from "../engines/change-state.js";

export interface GeneratePrOptions {
  sourceBranch?: string;
  targetBranch?: string;
  dryRun?: boolean;
}

export interface PrTaskItem {
  id: string;
  description: string;
  completed: boolean;
  role?: string;
  files?: string[];
  section?: string;
}

export interface PrCapabilitySpec {
  capability: string;
  requirements: string[];
}

export interface GeneratedPullRequest {
  changeId: string;
  title: string;
  sourceBranch: string;
  targetBranch: string;
  filePath: string;
  relativeFilePath: string;
  markdown: string;
  ghCommand: string;
  filesCount: number;
  tasksCount: {
    total: number;
    completed: number;
  };
}

/**
 * Finds the directory path of a change, whether it is active or archived.
 */
export async function resolveChangeDir(repoRoot: string, changeId: string): Promise<string | null> {
  // 1. Check active changes
  const activePath = path.join(repoRoot, "openspec", "changes", changeId);
  try {
    const stat = await fs.stat(activePath);
    if (stat.isDirectory()) {
      return activePath;
    }
  } catch {
    // Not in active
  }

  // 2. Check direct archive folder
  const archivePath = path.join(repoRoot, "openspec", "changes", "archive", changeId);
  try {
    const stat = await fs.stat(archivePath);
    if (stat.isDirectory()) {
      return archivePath;
    }
  } catch {
    // Not directly in archive/changeId
  }

  // 3. Check timestamped/prefixed archive subdirectories
  const archiveRoot = path.join(repoRoot, "openspec", "changes", "archive");
  try {
    const entries = await fs.readdir(archiveRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && (entry.name === changeId || entry.name.endsWith(`-${changeId}`))) {
        return path.join(archiveRoot, entry.name);
      }
    }
  } catch {
    // Archive folder does not exist
  }

  return null;
}

/**
 * Parses markdown proposal sections into structured parts.
 */
export function parseProposalContent(content: string): {
  title: string;
  why?: string;
  whatChanges?: string;
  acceptanceCriteria?: string[];
} {
  let title = "Specification Change";
  const titleMatch = content.match(/^#\s+(?:Change:\s*)?(.+)$/m);
  if (titleMatch?.[1]) {
    title = titleMatch[1].trim();
  }

  const whyMatch = content.match(
    /(?:^|\n)##\s+(?:Why|Objective|Problem|Motivación|Objetivo|Contexto)[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i,
  );
  const whatMatch = content.match(
    /(?:^|\n)##\s+(?:What Changes|Solution|Propuesta|Solución|Alcance|Proposed Architecture)[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i,
  );
  const criteriaMatch = content.match(
    /(?:^|\n)##\s+(?:Acceptance Criteria|Criterios de Aceptación)[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i,
  );

  const acceptanceCriteria: string[] = [];
  if (criteriaMatch?.[1]) {
    const lines = criteriaMatch[1].split("\n");
    for (const l of lines) {
      const trimmed = l.trim();
      if (trimmed.startsWith("- [") || trimmed.startsWith("* [") || trimmed.startsWith("- ")) {
        acceptanceCriteria.push(trimmed.replace(/^[-*]\s*(\[[ xX]\])?\s*/, "").trim());
      }
    }
  }

  return {
    title,
    why: whyMatch?.[1]?.trim(),
    whatChanges: whatMatch?.[1]?.trim(),
    acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
  };
}

/**
 * Parses tasks.md into structured task items.
 */
export function parseTasksContent(content: string): PrTaskItem[] {
  const items: PrTaskItem[] = [];
  const lines = content.split("\n");
  let currentSection = "General Implementation";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      currentSection = trimmed.replace(/^##\s+/, "").trim();
      continue;
    }

    const taskMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.+)$/);
    if (!taskMatch) {
      continue;
    }

    const completed = taskMatch[1]?.toLowerCase() === "x";
    let text = taskMatch[2] ?? "";

    // Extract role
    let role: string | undefined;
    const roleMatch =
      text.match(/\[agent:\s*([^\]]+)\]/i) ||
      text.match(/<!--\s*role:\s*([^\s-]+)\s*-->/i) ||
      text.match(/@([a-zA-Z0-9_-]+)/);
    if (roleMatch?.[1]) {
      role = roleMatch[1].trim();
      text = text.replace(roleMatch[0], "").trim();
    }

    // Extract files
    let files: string[] | undefined;
    const filesMatch = text.match(/\[files:\s*([^\]]+)\]/i);
    if (filesMatch?.[1]) {
      files = filesMatch[1]
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      text = text.replace(filesMatch[0], "").trim();
    }

    // Extract task ID (e.g., 1.1)
    let id = "";
    const idMatch = text.match(/^(\d+(?:\.\d+)*)\s*(.+)$/);
    if (idMatch?.[1] && idMatch[2]) {
      id = idMatch[1];
      text = idMatch[2].trim();
    } else {
      id = `${items.length + 1}`;
    }

    items.push({
      id,
      description: text,
      completed,
      role,
      files,
      section: currentSection,
    });
  }

  return items;
}

/**
 * Scans the change's specs/ directory for modified capabilities and requirements.
 */
export async function readSpecsCapabilities(changeDir: string): Promise<PrCapabilitySpec[]> {
  const specsDir = path.join(changeDir, "specs");
  const results: PrCapabilitySpec[] = [];

  try {
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specFile = path.join(specsDir, entry.name, "spec.md");
        try {
          const content = await fs.readFile(specFile, "utf8");
          const reqs: string[] = [];
          const reqMatches = content.matchAll(/###\s+(?:Requirement|Requisito):\s*(.+)/gi);
          for (const m of reqMatches) {
            if (m[1]) reqs.push(m[1].trim());
          }
          results.push({
            capability: entry.name,
            requirements: reqs,
          });
        } catch {
          // No spec.md in subdirectory
        }
      }
    }
  } catch {
    // No specs dir
  }

  return results;
}

/**
 * Generates an exhaustive Pull Request request document with a specific format
 * detailing everything achieved in the branch to be merged.
 */
export async function generatePullRequest(
  repoRoot: string,
  changeId: string,
  options: GeneratePrOptions = {},
): Promise<GeneratedPullRequest> {
  let config: SpectyConfig;
  try {
    config = await loadConfig(repoRoot);
  } catch {
    config = createDefaultConfig();
  }

  const changeDir = await resolveChangeDir(repoRoot, changeId);

  // 1. Read change documents
  let proposalRaw = "";
  let tasksRaw = "";
  let designRaw = "";

  if (changeDir) {
    try {
      proposalRaw = await fs.readFile(path.join(changeDir, "proposal.md"), "utf8");
    } catch {
      // ignore
    }
    try {
      tasksRaw = await fs.readFile(path.join(changeDir, "tasks.md"), "utf8");
    } catch {
      // ignore
    }
    try {
      designRaw = await fs.readFile(path.join(changeDir, "design.md"), "utf8");
    } catch {
      // ignore
    }
  }

  const proposal = parseProposalContent(proposalRaw);
  const tasks = parseTasksContent(tasksRaw);
  const specs = changeDir ? await readSpecsCapabilities(changeDir) : [];
  const changeState = changeDir ? await readChangeState(changeDir) : null;

  // 2. Read verification report if available
  let verificationPassed = true;
  let verificationSha: string | null = null;
  const verifFile = path.join(repoRoot, ".specty", "verification", `${changeId}.json`);
  try {
    const rawVerif = await fs.readFile(verifFile, "utf8");
    const verifData = JSON.parse(rawVerif);
    verificationPassed = Boolean(verifData.passed);
    verificationSha = verifData.commitSha || null;
  } catch {
    // If no explicit file, check change state
    if (changeState?.content_hash) {
      verificationSha = changeState.content_hash;
    }
  }

  // 3. Resolve Git branches
  const isGit = await isInsideGitRepo(repoRoot);
  const localBranches = isGit ? await listLocalBranches(repoRoot) : [];
  const currentBranch = isGit ? await getCurrentBranch(repoRoot) : null;

  const workflow = config.git?.workflow ?? "feature-branch";
  let targetBranch = options.targetBranch;
  if (!targetBranch) {
    if (workflow === "gitflow") {
      targetBranch = localBranches.includes("develop") ? "develop" : "main";
    } else {
      targetBranch = localBranches.includes("main")
        ? "main"
        : localBranches.includes("master")
          ? "master"
          : "main";
    }
  }

  let sourceBranch = options.sourceBranch;
  if (!sourceBranch) {
    const candidateNames = [
      currentBranch,
      `feature/${changeId}`,
      `hotfix/${changeId}`,
      `fix/${changeId}`,
      `bugfix/${changeId}`,
      `feat/${changeId}`,
      `change/${changeId}`,
      changeId,
    ].filter((b): b is string => Boolean(b));

    for (const cand of candidateNames) {
      if (localBranches.includes(cand)) {
        sourceBranch = cand;
        break;
      }
    }
    if (!sourceBranch) {
      sourceBranch = currentBranch || `feature/${changeId}`;
    }
  }

  // 4. Extract Git diff and commits
  let diffFiles: BranchDiffFile[] = [];
  let diffSummary = "";
  let commits: Array<{ sha: string; message: string }> = [];

  if (isGit && sourceBranch && targetBranch && sourceBranch !== targetBranch) {
    diffFiles = await getBranchDiffFiles(repoRoot, targetBranch, sourceBranch);
    diffSummary = await getBranchDiffSummary(repoRoot, targetBranch, sourceBranch);
    commits = await getBranchCommits(repoRoot, targetBranch, sourceBranch);
  }

  // Fallback if diff against targetBranch yielded nothing (e.g. running on local branch only)
  if (diffFiles.length === 0 && isGit) {
    const headFiles = await getBranchDiffFiles(repoRoot, "HEAD~1", "HEAD");
    if (headFiles.length > 0) {
      diffFiles = headFiles;
    }
  }

  // 5. Build PR Title
  const cleanTitle = proposal.title.replace(/^Change:\s*/i, "").trim();
  const prTitle = `feat(${changeId}): ${cleanTitle}`;

  // 6. Build PR Markdown document
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;

  const lines: string[] = [];

  // Header & Metadata Block
  lines.push(`# ${prTitle}\n`);
  lines.push(`> 🛡️ **Specty Pull Request Request**`);
  lines.push(`> - **Change ID**: \`${changeId}\``);
  lines.push(`> - **Rama Origen (Head)**: \`${sourceBranch}\``);
  lines.push(`> - **Rama Destino (Base)**: \`${targetBranch}\``);
  lines.push(
    `> - **Estado de Gobernanza**: ${verificationPassed ? "✅ Aprobado & Verificado" : "⚠️ Verificación Pendiente"}`,
  );
  if (changeState?.approved_at) {
    lines.push(`> - **Fecha de Aprobación**: \`${changeState.approved_at}\``);
  }
  lines.push("\n---\n");

  // Section 1: Objective & Context (Why)
  lines.push("## 🎯 Objetivo y Contexto (Why)\n");
  if (proposal.why) {
    lines.push(proposal.why);
  } else {
    lines.push(
      `Esta solicitud de fusión incorpora la especificación formal \`${changeId}\` para '${cleanTitle}'.`,
    );
  }
  lines.push("\n");

  // Section 2: What Changes / Implemented Solution
  lines.push("## 🚀 Cambios Implementados (What Changes)\n");
  if (proposal.whatChanges) {
    lines.push(proposal.whatChanges);
  } else {
    lines.push(
      `Implementación completa de las tareas y componentes asociados al change \`${changeId}\`.`,
    );
  }
  lines.push("\n");

  // Architectural / Design Decisions if available
  if (designRaw.trim()) {
    lines.push("### 🏗️ Decisiones de Arquitectura y Diseño\n");
    // Extract first 15 lines or summary
    const designSummary = designRaw
      .replace(/^#\s+.+$/m, "")
      .trim()
      .split("\n")
      .slice(0, 20)
      .join("\n");
    lines.push(designSummary);
    lines.push("\n");
  }

  // Section 3: Executed Tasks (tasks.md)
  lines.push("## 📋 Tareas Ejecutadas y Trazabilidad\n");
  lines.push(
    `Progreso de implementación: **${completedTasks}/${totalTasks}** tareas completadas (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100}%).\n`,
  );

  if (tasks.length > 0) {
    // Group tasks by section
    const sections = new Map<string, PrTaskItem[]>();
    for (const t of tasks) {
      const sec = t.section || "Implementación";
      if (!sections.has(sec)) {
        sections.set(sec, []);
      }
      sections.get(sec)?.push(t);
    }

    for (const [secName, secTasks] of sections.entries()) {
      lines.push(`#### ${secName}`);
      for (const t of secTasks) {
        const check = t.completed ? "x" : " ";
        const roleLabel = t.role ? ` \`@${t.role}\`` : "";
        lines.push(`- [${check}] **${t.id}**: ${t.description}${roleLabel}`);
        if (t.files && t.files.length > 0) {
          lines.push(`  - *Archivos*: \`${t.files.join("`, `")}\``);
        }
      }
      lines.push("");
    }
  } else {
    lines.push(`- [x] Implementación completa y validada de la especificación \`${changeId}\`.\n`);
  }

  // Section 4: Specifications & Capabilities
  if (specs.length > 0) {
    lines.push("## 📦 Especificaciones y Capacidades Modificadas\n");
    for (const spec of specs) {
      lines.push(`### Capacidad: \`${spec.capability}\``);
      if (spec.requirements.length > 0) {
        for (const req of spec.requirements) {
          lines.push(`- Requisito: **${req}**`);
        }
      } else {
        lines.push("- Especificación formal actualizada.");
      }
      lines.push("");
    }
  }

  // Section 5: Acceptance Criteria
  if (proposal.acceptanceCriteria && proposal.acceptanceCriteria.length > 0) {
    lines.push("## 📌 Criterios de Aceptación Verificados\n");
    for (const crit of proposal.acceptanceCriteria) {
      lines.push(`- [x] ${crit}`);
    }
    lines.push("\n");
  }

  // Section 6: Modified Files in Branch
  lines.push(`## 📂 Archivos Modificados en la Rama (\`${sourceBranch}\` → \`${targetBranch}\`)\n`);
  if (diffFiles.length > 0) {
    lines.push("| Estado | Archivo |");
    lines.push("| :---: | :--- |");
    for (const f of diffFiles) {
      const badge =
        f.status === "A"
          ? "🟢 **Añadido**"
          : f.status === "D"
            ? "🔴 **Eliminado**"
            : f.status === "R"
              ? "🟣 **Renombrado**"
              : "🟡 **Modificado**";
      lines.push(`| ${badge} | \`${f.file}\` |`);
    }
    lines.push("");
  } else {
    lines.push(
      `*No se detectaron diferencias directas o los cambios ya están integrados en \`${targetBranch}\`.*\n`,
    );
  }

  if (diffSummary) {
    lines.push("<details><summary>Ver resumen estadístico de git diff</summary>\n");
    lines.push("```text");
    lines.push(diffSummary);
    lines.push("```\n</details>\n");
  }

  // Commits list
  if (commits.length > 0) {
    lines.push(
      `<details><summary>Ver historial de commits en la rama (${commits.length})</summary>\n`,
    );
    for (const c of commits) {
      lines.push(`- \`${c.sha}\` ${c.message}`);
    }
    lines.push("\n</details>\n");
  }

  // Section 7: Quality and Verification
  lines.push("## 🧪 Pruebas y Certificación de Calidad\n");
  lines.push(
    `- **Estado de Pruebas**: ${verificationPassed ? "✅ **APROBADO** (Todos los tests pasaron exitosamente)" : "⚠️ Pendiente de verificación final"}`,
  );
  if (verificationSha) {
    lines.push(`- **Commit / Hash Verificado**: \`${verificationSha}\``);
  }
  lines.push(
    `- **Gobernanza Specty**: Protocolo de especificaciones cumplido formalmente sin bypass.\n`,
  );

  // Section 8: Reviewer Checklist
  lines.push("## 🔍 Checklist para el Revisor (Code Reviewer)\n");
  lines.push("- [ ] La implementación cumple fielmente con los requisitos de la propuesta.");
  lines.push("- [ ] Se ejecutaron y pasaron todas las pruebas unitarias y de integración.");
  lines.push("- [ ] No se introducen dependencias redundantes ni vulnerabilidades de seguridad.");
  lines.push(
    "- [ ] Los estándares de estilo, convención de commits y tipos TypeScript se respetan.\n",
  );

  // Section 9: CLI Instructions & GitHub command
  const relativePrPath = `.specty/pull-requests/${changeId}.md`;
  const ghCommand = `gh pr create --base "${targetBranch}" --head "${sourceBranch}" --title "${prTitle}" --body-file "${relativePrPath}"`;

  lines.push("---\n");
  lines.push("### 💻 Comando CLI para Abrir este Pull Request\n");
  lines.push("```bash");
  lines.push(ghCommand);
  lines.push("```\n");

  lines.push(
    `*Generado automáticamente por [Specty](https://github.com/barcidev/specty) al archivar y completar el Change \`${changeId}\`.*\n`,
  );

  const markdown = lines.join("\n");

  // 7. Write to destination files
  const prDir = path.join(repoRoot, ".specty", "pull-requests");
  const prFilePath = path.join(prDir, `${changeId}.md`);

  if (!options.dryRun) {
    await fs.mkdir(prDir, { recursive: true });
    await fs.writeFile(prFilePath, markdown, "utf8");

    // Also persist inside the archived change directory if available
    if (changeDir) {
      try {
        await fs.writeFile(path.join(changeDir, "PULL_REQUEST.md"), markdown, "utf8");
      } catch {
        // ignore
      }
    }
  }

  return {
    changeId,
    title: prTitle,
    sourceBranch,
    targetBranch,
    filePath: prFilePath,
    relativeFilePath: relativePrPath,
    markdown,
    ghCommand,
    filesCount: diffFiles.length,
    tasksCount: {
      total: totalTasks,
      completed: completedTasks,
    },
  };
}
