import type { GovernanceExecutiveReport } from "../types.js";

export function generateMarkdownReport(report: GovernanceExecutiveReport): string {
  const { generatedAt, repositoryName, period, mtta, compliance, bypasses, subagents } = report;

  // Format date
  const dateFormatted = new Date(generatedAt).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const getHealthBadge = (score: number): string => {
    if (score >= 90) return `🟢 **Excelente (${score}/100)**`;
    if (score >= 75) return `🟡 **Aceptable (${score}/100)**`;
    return `🔴 **Atención Requerida (${score}/100)**`;
  };

  const getAlertBadge = (level: "low" | "medium" | "high"): string => {
    switch (level) {
      case "low":
        return "🟢 Bajo Riesgo";
      case "medium":
        return "🟡 Riesgo Moderado";
      case "high":
        return "🔴 Alto Riesgo";
    }
  };

  // Generate Mermaid diagram for subagent flow
  let mermaidSection = "";
  if (subagents.transitions.length > 0) {
    const lines = subagents.transitions.map(
      (t) => `    ${t.fromRole} -->|"${t.count} handoffs"| ${t.toRole}`,
    );
    mermaidSection = `
\`\`\`mermaid
graph LR
${lines.join("\n")}
\`\`\`
`;
  } else {
    mermaidSection = "\n*No se registraron transiciones entre roles en este período.*\n";
  }

  // MTTA changes table
  const mttaRows =
    mtta.items.length > 0
      ? mtta.items
          .map((item) => {
            const timeStr =
              item.durationHours !== undefined
                ? item.durationHours < 24
                  ? `${item.durationHours}h`
                  : `${item.durationDays}d (${item.durationHours}h)`
                : "Pendiente";
            const reapprovalsStr = item.reapprovalsCount > 0 ? `⚠️ ${item.reapprovalsCount}` : "0";
            return `| \`${item.changeId}\` | ${item.title || "Sin título"} | \`${item.status}\` | ${timeStr} | ${reapprovalsStr} |`;
          })
          .join("\n")
      : "| - | Sin cambios registrados | - | - | - |";

  // Bypass occurrences table
  const bypassRows =
    bypasses.items.length > 0
      ? bypasses.items
          .map((item) => {
            const time = new Date(item.timestamp).toLocaleString("es-ES", {
              dateStyle: "short",
              timeStyle: "short",
            });
            return `| ${time} | \`${item.user}\` | \`${item.source}\` | \`${item.category}\` | ${item.filesCount} | ${item.reason} |`;
          })
          .join("\n")
      : "| - | - | - | - | - | Ningún bypass de emergencia registrado |";

  // Subagents role stats table
  const rolesList = Object.values(subagents.roleStats);
  const roleRows =
    rolesList.length > 0
      ? rolesList
          .map((r) => {
            return `| \`${r.role}\` | ${r.originated} | ${r.received} | ${r.tasksCompleted} | ${r.blockersEncountered > 0 ? `⚠️ ${r.blockersEncountered}` : "0"} |`;
          })
          .join("\n")
      : "| - | - | - | - | - |";

  // Actionable recommendations
  const recommendations: string[] = [];
  if (compliance.healthScore < 80) {
    recommendations.push(
      "- **Reforzar Gates de Validación**: El Health Score general está por debajo del 80%. Considera activar hooks pre-commit estrictos.",
    );
  }
  if (bypasses.alertLevel !== "low") {
    recommendations.push(
      "- **Auditoría de Bypasses**: Se detectó una frecuencia elevada de saltos de emergencia. Se sugiere programar revisiones post-mortem de los incidentes que motivaron el bypass.",
    );
  }
  if (mtta.meanHours > 48) {
    recommendations.push(
      "- **Optimizar Tiempo de Aprobación**: El MTTA promedio excede las 48 horas. Revisa la asignación de revisores y simplifica el alcance de las propuestas.",
    );
  }
  if (subagents.blockerRate > 20) {
    recommendations.push(
      `- **Fricción en Handoffs de Subagentes**: Un ${subagents.blockerRate}% de las transferencias reportó bloqueos. Revisa las instrucciones previas y los contratos de contexto entre roles.`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "- **Estado Óptimo**: Todos los indicadores de gobernanza, agilidad y colaboración operan dentro de los umbrales recomendados.",
    );
  }

  return `# Reporte Ejecutivo de Gobernanza y Analítica

**Repositorio:** \`${repositoryName}\`  
**Período Evaluado:** \`${period}\`  
**Fecha de Generación:** ${dateFormatted}  
**Specty Governance Health Score:** ${getHealthBadge(compliance.healthScore)}  

---

## 1. Resumen Ejecutivo (KPIs Clave)

| Métrica | Valor Actual | Referencia / Meta | Estado |
| :--- | :--- | :--- | :--- |
| **MTTA Promedio** | **${mtta.meanHours}h** (${mtta.meanDays}d) | < 24h | ${mtta.meanHours <= 24 ? "🟢 En meta" : "🟡 Revisar"} |
| **MTTA Mediana (P50)** | **${mtta.medianHours}h** | < 12h | ${mtta.medianHours <= 12 ? "🟢 En meta" : "🟡 Revisar"} |
| **Tasa de Cumplimiento General** | **${compliance.healthScore}%** | > 85% | ${compliance.healthScore >= 85 ? "🟢 Cumple" : "🔴 Desvío"} |
| **Integridad de Especificación** | **${compliance.specIntegrityRate}%** | 100% | ${compliance.specIntegrityRate >= 90 ? "🟢 Alta" : "🟡 Desvío"} |
| **Frecuencia de Bypass de Emergencia** | **${bypasses.ratePerGateCheck}%** (${bypasses.totalCount} eventos) | < 5% | ${getAlertBadge(bypasses.alertLevel)} |
| **Rendimiento de Tareas por Handoff** | **${subagents.taskYield} tareas/envío** | > 1.0 | ${subagents.taskYield >= 1.0 ? "🟢 Eficaz" : "🟡 Bajo"} |
| **Tasa de Bloqueos en Handoffs** | **${subagents.blockerRate}%** | < 10% | ${subagents.blockerRate <= 10 ? "🟢 Fluido" : "🟡 Fricción"} |

---

## 2. Tiempo Medio desde Propuesta hasta Aprobación (MTTA)

Mide el lapso entre la creación formal de la propuesta (\`proposal.md\`) y su primera aprobación válida (\`specty approve\`).

- **Propuestas Evaluadas:** ${mtta.approvedCount} aprobadas / ${mtta.pendingCount} pendientes
- **Promedio:** ${mtta.meanHours} horas (${mtta.meanDays} días)
- **Mediana (P50):** ${mtta.medianHours} horas
- **Percentil 90 (P90):** ${mtta.p90Hours} horas (${mtta.p90Days} días)
- **Rango:** Mínimo ${mtta.minHours}h / Máximo ${mtta.maxHours}h

### Desglose por Cambio de Especificación

| Cambio ID | Título | Estado | MTTA | Re-aprobaciones |
| :--- | :--- | :--- | :--- | :--- |
${mttaRows}

---

## 3. Tasa de Cumplimiento y Adherencia de Gobernanza

- **Índice de Salud de Gobernanza:** **${compliance.healthScore} / 100**
- **Integridad de Especificación (Spec Drift):** **${compliance.specIntegrityRate}%** (${compliance.totalApprovals} aprobaciones / ${compliance.totalInvalidations} invalidaciones por hash)
- **Adherencia de Gate:** **${compliance.gateAdherenceRate}%**
- **Tasa de Éxito en Verificaciones:** **${compliance.verificationSuccessRate}%** (${compliance.totalVerifications} ejecuciones)
- **Completitud de Tareas:** **${compliance.taskCompletionRate}%** (${compliance.completedTasks}/${compliance.totalTasks} tareas cerradas)

---

## 4. Frecuencia y Auditoría de Bypasses de Emergencia

- **Total de Bypasses Utilizados:** ${bypasses.totalCount}
- **Frecuencia relativa por Gate Check:** ${bypasses.ratePerGateCheck}%
- **Nivel de Alerta:** ${getAlertBadge(bypasses.alertLevel)}
- **Desglose por Origen:** \`${bypasses.bySource.env ?? 0} env\` | \`${bypasses.bySource.trailer ?? 0} trailer\` | \`${bypasses.bySource.option ?? 0} cli flag\`
- **Desglose por Motivo:**
  - Incidente / Hotfix: ${bypasses.byCategory.incident_hotfix ?? 0}
  - CI / Pipeline: ${bypasses.byCategory.ci_pipeline ?? 0}
  - Refactor no funcional: ${bypasses.byCategory.refactor_non_functional ?? 0}
  - Debug / Local: ${bypasses.byCategory.debug_local ?? 0}
  - Otros: ${bypasses.byCategory.other ?? 0}

### Registro de Auditoría

| Timestamp | Usuario | Origen | Categoría | Archivos | Justificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
${bypassRows}

---

## 5. Eficacia y Handoffs entre Subagentes

### Flujo de Colaboración entre Roles
${mermaidSection}

### Rendimiento de Transferencias
- **Handoffs Totales:** ${subagents.totalHandoffs}
- **Tareas Completadas en Tránsito:** ${subagents.tasksCompletedTotal}
- **Rendimiento de Tareas (Task Yield):** ${subagents.taskYield} tareas/handoff
- **Tasa de Bloqueos:** ${subagents.blockerRate}%
- **Archivos Modificados Promedio:** ${subagents.averageFilesModified} archivos/handoff

### Métricas por Rol de Subagente

| Rol | Originados | Recibidos | Tareas Completadas | Bloqueos Encontrados |
| :--- | :--- | :--- | :--- | :--- |
${roleRows}

---

## 6. Recomendaciones y Próximos Pasos

${recommendations.join("\n")}

---
*Generado automáticamente por Specty Governance Analytics.*
`;
}
