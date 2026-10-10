import type { GateResult } from "./check-approval.js";

export const PR_GATE_COMMENT_MARKER = "<!-- specty-pr-gate-comment -->";

export interface PrReportOptions {
  lang?: "en" | "es";
  prNumber?: number;
}

export function generatePrGateReport(result: GateResult, options: PrReportOptions = {}): string {
  const isEs = options.lang === "es";

  const lines: string[] = [];
  lines.push(PR_GATE_COMMENT_MARKER);
  lines.push("## 🛡️ Specty PR Governance Gate\n");

  // Status Badge and Header Table
  const statusBadge = getStatusBadge(result, isEs);
  const bypassText = result.bypassed
    ? `⚠️ **${isEs ? "ACTIVO" : "ACTIVE"}**`
    : `🛡️ *${isEs ? "Ninguno" : "None"}*`;

  if (result.changeDetails) {
    const change = result.changeDetails;
    const hashDisplay = change.currentHash
      ? `\`${change.currentHash.slice(0, 10)}...\``
      : isEs
        ? "N/A"
        : "N/A";
    const approverDisplay = change.approvedBy
      ? `@${change.approvedBy}`
      : isEs
        ? "*Pendiente*"
        : "*Pending*";

    lines.push(
      `| ${isEs ? "Estado" : "Status"} | Change ID | ${isEs ? "Aprobado Por" : "Approved By"} | ${isEs ? "Hash Verificación" : "Verification Hash"} | Bypass |`,
    );
    lines.push("| :---: | :---: | :---: | :---: | :---: |");
    lines.push(
      `| ${statusBadge} | \`${change.id}\` | ${approverDisplay} | ${hashDisplay} | ${bypassText} |\n`,
    );
  } else if (result.modifiedSourceFiles.length === 0) {
    lines.push(
      `| ${isEs ? "Estado" : "Status"} | ${isEs ? "Archivos Gobernados" : "Governed Files"} | ${isEs ? "Archivos Exentos" : "Exempt Files"} | Bypass |`,
    );
    lines.push("| :---: | :---: | :---: | :---: |");
    lines.push(
      `| ${statusBadge} | 0 | ${result.modifiedExemptFiles?.length ?? 0} | ${bypassText} |\n`,
    );
  } else {
    lines.push(
      `| ${isEs ? "Estado" : "Status"} | ${isEs ? "Archivos Huérfanos" : "Orphan Source Files"} | ${isEs ? "Acción Requerida" : "Action Required"} | Bypass |`,
    );
    lines.push("| :---: | :---: | :---: | :---: |");
    lines.push(
      `| ${statusBadge} | ${result.modifiedSourceFiles.length} | ${isEs ? "Asociar / Aprobar Change" : "Associate / Approve Change"} | ${bypassText} |\n`,
    );
  }

  lines.push("---\n");

  // Section 1: Change Summary
  if (result.changeDetails) {
    const change = result.changeDetails;
    lines.push(`### 📋 ${isEs ? "Resumen del Change" : "Change Summary"}`);
    if (change.title) {
      lines.push(`- **${isEs ? "Título" : "Title"}**: ${change.title}`);
    }
    lines.push(`- **${isEs ? "Estado" : "Status"}**: \`${change.status}\``);

    const totalTasks = change.tasks.total;
    const completedTasks = change.tasks.completed;
    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    lines.push(
      `- **${isEs ? "Progreso de tareas" : "Task progress"}**: \`${completedTasks}/${totalTasks}\` ${isEs ? "completadas" : "completed"} (${pct}%)`,
    );

    const sourceCount = result.modifiedSourceFiles.length;
    const exemptCount = result.modifiedExemptFiles?.length ?? 0;
    lines.push(
      `- **${isEs ? "Archivos gobernados modificados" : "Governed files modified"}**: ${sourceCount}`,
    );
    if (sourceCount > 0) {
      lines.push(
        "<details><summary>" +
          (isEs ? "Ver archivos gobernados" : "View governed files") +
          "</summary>\n",
      );
      for (const f of result.modifiedSourceFiles) {
        lines.push(`- \`${f}\``);
      }
      lines.push("\n</details>");
    }

    if (exemptCount > 0) {
      lines.push(
        `- **${isEs ? "Archivos exentos modificados" : "Exempt files modified"}**: ${exemptCount}`,
      );
    }
    lines.push("");
  } else if (result.modifiedSourceFiles.length > 0) {
    lines.push(`### 📋 ${isEs ? "Archivos sin Change Aprobado" : "Unapproved Source Files"}`);
    lines.push(
      `> ❌ **${isEs ? "Gate Bloqueado:" : "Gate Blocked:"}** ${isEs ? "Se han modificado archivos protegidos por gobernanza sin un change aprobado activo." : "Governed source paths were modified without an active approved change."}\n`,
    );
    for (const f of result.modifiedSourceFiles) {
      lines.push(`- \`${f}\``);
    }
    lines.push("");
  }

  // Section 2: Approval Status & Verification Hash
  lines.push(
    `### 🔐 ${isEs ? "Estado de Aprobación y Hash de Verificación" : "Approval State & Verification Hash"}`,
  );
  if (result.changeDetails) {
    const change = result.changeDetails;
    if (change.approvalCode === "approved") {
      lines.push(
        `- **${isEs ? "Estado de Aprobación" : "Approval Status"}**: ✅ ${isEs ? "Aprobado formalmente" : "Formally Approved"}`,
      );
      if (change.approvedBy) {
        lines.push(`- **${isEs ? "Aprobado Por" : "Approved By"}**: \`${change.approvedBy}\``);
      }
      if (change.approvedAt) {
        lines.push(
          `- **${isEs ? "Fecha de Aprobación" : "Approved At"}**: \`${change.approvedAt}\``,
        );
      }
      lines.push(
        `- **${isEs ? "Hash Aprobado" : "Approved Hash"}**: \`${change.approvedHash ?? "N/A"}\``,
      );
      lines.push(
        `- **${isEs ? "Hash Actual" : "Current Hash"}**: \`${change.currentHash ?? "N/A"}\``,
      );
      lines.push(
        `\n> ✅ **${isEs ? "Integridad Criptográfica Verificada:" : "Cryptographic Integrity Verified:"}** ${isEs ? "La especificación coincide exactamente con la versión certificada." : "Specification content hash matches approved signature."}\n`,
      );
    } else if (change.approvalCode === "reapproval_required") {
      lines.push(
        `- **${isEs ? "Estado de Aprobación" : "Approval Status"}**: 🔴 **${isEs ? "RE-APROBACIÓN REQUERIDA" : "RE-APPROVAL REQUIRED"}**`,
      );
      lines.push(
        `- **${isEs ? "Hash Aprobado" : "Approved Hash"}**: \`${change.approvedHash ?? "N/A"}\``,
      );
      lines.push(
        `- **${isEs ? "Hash Actual" : "Current Hash"}**: \`${change.currentHash ?? "N/A"}\``,
      );
      lines.push(
        `\n> ⚠️ **${isEs ? "Gate Bloqueado:" : "Gate Blocked:"}** ${isEs ? `La especificación fue alterada después de haber sido aprobada. Ejecuta \`specty approve ${change.id}\` para ratificar los cambios.` : `Specification was modified after approval. Run \`specty approve ${change.id}\` to re-approve.`}\n`,
      );
    } else {
      lines.push(
        `- **${isEs ? "Estado de Aprobación" : "Approval Status"}**: 🟡 **${isEs ? "PENDIENTE / DRAFT" : "PENDING / DRAFT"}**`,
      );
      lines.push(
        `\n> ℹ️ ${isEs ? `El change aún no ha sido aprobado por una persona. Ejecuta \`specty approve ${change.id}\` para autorizar la implementación.` : `Change has not been approved yet. Run \`specty approve ${change.id}\` to authorize implementation.`}\n`,
      );
    }
  } else if (result.modifiedSourceFiles.length === 0) {
    lines.push(
      `> ℹ️ ${isEs ? "No se modificaron archivos de código fuente gobernados. No se requiere hash de verificación." : "No governed source files were touched. No specification verification required."}\n`,
    );
  } else {
    lines.push(
      `> ❌ ${isEs ? "Falta especificación activa. Crea un change con `specty` y apruébalo antes de fusionar." : "Missing active specification. Create a change with `specty` and approve it before merging."}\n`,
    );
  }

  // Section 3: Bypass Audit
  lines.push(
    `### 🚨 ${isEs ? "Auditoría de Salidas de Emergencia (Bypass)" : "Emergency Bypass Audit"}`,
  );
  if (result.bypassed && result.bypassDetails) {
    const bypass = result.bypassDetails;
    lines.push(
      `> ⚠️ **${isEs ? "ADVERTENCIA DE SEGURIDAD:" : "SECURITY WARNING:"}** ${isEs ? "Este PR contiene modificaciones que evadieron el control de especificaciones." : "This PR contains source changes that bypassed specification governance."}\n`,
    );
    lines.push(`- **${isEs ? "Motivo del Bypass" : "Bypass Reason"}**: *${bypass.reason}*`);
    lines.push(`- **${isEs ? "Usuario Responsable" : "Activated By"}**: \`${bypass.user}\``);
    lines.push(`- **${isEs ? "Origen" : "Source"}**: \`${bypass.source}\``);
    lines.push(`- **${isEs ? "Fecha / Hora" : "Timestamp"}**: \`${bypass.timestamp}\``);
    lines.push(
      `- **${isEs ? "Archivos Afectados" : "Impacted Files"}**: ${bypass.files.length} ${isEs ? "archivos" : "files"}`,
    );
    lines.push(
      `\n*${isEs ? "Acción registrada en el log de auditoría permanente `.specty/audit/bypasses.jsonl`." : "Action permanently logged to `.specty/audit/bypasses.jsonl`."}*\n`,
    );
  } else {
    lines.push(`- **${isEs ? "Bypass Utilizado" : "Bypass Used"}**: **${isEs ? "No" : "None"}**`);
    lines.push(
      `*${isEs ? "Todas las modificaciones de código cumplen el protocolo estricto de gobernanza guiada por especificaciones." : "All source changes strictly adhere to spec-driven development governance."}*\n`,
    );
  }

  // Footer
  lines.push(
    `---\n*${isEs ? "Generado automáticamente por" : "Automatically generated by"} [Specty](https://github.com/barcidev/specty) - Spec-driven AI development governance.*`,
  );

  return lines.join("\n");
}

function getStatusBadge(result: GateResult, isEs: boolean): string {
  if (result.bypassed) {
    return isEs ? "⚠️ **BYPASS ACTIVO**" : "⚠️ **BYPASS ACTIVE**";
  }

  if (result.passed) {
    if (result.modifiedSourceFiles.length === 0) {
      return isEs ? "⚪ **SIN CÓDIGO GOBERNADO**" : "⚪ **NO GOVERNED CODE**";
    }
    return isEs ? "🟢 **APROBADO**" : "🟢 **APPROVED**";
  }

  if (result.changeDetails?.approvalCode === "reapproval_required") {
    return isEs ? "🔴 **RE-APROBACIÓN REQUERIDA**" : "🔴 **RE-APPROVAL REQUIRED**";
  }

  if (result.changeDetails?.approvalCode === "pending") {
    return isEs ? "🟡 **APROBACIÓN PENDIENTE**" : "🟡 **APPROVAL PENDING**";
  }

  return isEs ? "🔴 **SIN CHANGE APROBADO**" : "🔴 **NO APPROVED CHANGE**";
}
