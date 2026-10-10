import type { GovernanceExecutiveReport } from "../types.js";

export function generateHtmlReport(report: GovernanceExecutiveReport): string {
  const { generatedAt, repositoryName, period, mtta, compliance, bypasses, subagents } = report;

  const dateFormatted = new Date(generatedAt).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const healthScore = compliance.healthScore;
  const healthColor = healthScore >= 85 ? "#10b981" : healthScore >= 70 ? "#f59e0b" : "#ef4444";

  // MTTA Bar Chart SVG
  const topChanges = mtta.items.slice(0, 8);
  const maxChangeHours = Math.max(...topChanges.map((c) => c.durationHours ?? 0), 1);
  const svgChartWidth = 560;
  const svgChartHeight = topChanges.length * 40 + 30;

  const mttaBarsSvg = topChanges
    .map((c, i) => {
      const y = 30 + i * 40;
      const hours = c.durationHours ?? 0;
      const barWidth = Math.max(8, Math.round((hours / maxChangeHours) * 360));
      const label = c.changeId.length > 18 ? `${c.changeId.slice(0, 16)}…` : c.changeId;
      const barColor = hours <= 24 ? "#10b981" : hours <= 72 ? "#3b82f6" : "#f59e0b";
      return `
      <g class="bar-group">
        <text x="10" y="${y + 16}" fill="var(--text-muted)" font-size="12" font-family="monospace">${label}</text>
        <rect x="150" y="${y}" width="${barWidth}" height="22" rx="4" fill="${barColor}" opacity="0.85" />
        <text x="${160 + barWidth}" y="${y + 16}" fill="var(--text)" font-size="12" font-weight="600">${hours}h</text>
      </g>`;
    })
    .join("");

  // Subagents Transitions SVG Diagram
  const roles = Object.keys(subagents.roleStats);
  const svgFlowHeight = Math.max(220, roles.length * 60);
  const flowNodesSvg = roles
    .map((role, idx) => {
      const y = 40 + idx * 50;
      const stats = subagents.roleStats[role];
      return `
      <g class="role-node" transform="translate(40, ${y})">
        <rect width="180" height="38" rx="8" fill="var(--card-bg)" stroke="var(--border)" stroke-width="1.5" />
        <circle cx="20" cy="19" r="6" fill="#6366f1" />
        <text x="36" y="24" fill="var(--text)" font-size="13" font-weight="600">${role}</text>
        <text x="155" y="24" fill="var(--text-muted)" font-size="11" text-anchor="end">${stats?.originated ?? 0} out / ${stats?.received ?? 0} in</text>
      </g>`;
    })
    .join("");

  // Simple transition arrows / text
  const flowEdgesSvg = subagents.transitions
    .map((t, idx) => {
      const y = 50 + idx * 30;
      return `
      <g class="edge-line" transform="translate(260, ${y})">
        <line x1="0" y1="0" x2="160" y2="0" stroke="var(--border)" stroke-width="2" stroke-dasharray="4" />
        <polygon points="160,-4 168,0 160,4" fill="var(--accent)" />
        <rect x="50" y="-12" width="60" height="20" rx="4" fill="var(--bg-tag)" />
        <text x="80" y="2" fill="var(--text)" font-size="11" font-weight="bold" text-anchor="middle">${t.count}x</text>
      </g>`;
    })
    .join("");

  // Table rows for changes
  const changeTableRows = mtta.items
    .map((item) => {
      const durationText =
        item.durationHours !== undefined
          ? item.durationHours < 24
            ? `${item.durationHours}h`
            : `${item.durationDays}d (${item.durationHours}h)`
          : '<span class="badge badge-warning">Pendiente</span>';
      const badgeClass =
        item.status === "approved" || item.status === "done"
          ? "badge-success"
          : item.status === "in-progress"
            ? "badge-info"
            : "badge-muted";
      return `
      <tr>
        <td><code>${item.changeId}</code></td>
        <td>${item.title || "Sin título"}</td>
        <td><span class="badge ${badgeClass}">${item.status}</span></td>
        <td><strong>${durationText}</strong></td>
        <td>${item.reapprovalsCount > 0 ? `<span class="badge badge-danger">${item.reapprovalsCount}</span>` : "0"}</td>
      </tr>`;
    })
    .join("");

  // Table rows for bypasses
  const bypassTableRows = bypasses.items
    .map((item) => {
      const time = new Date(item.timestamp).toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      });
      return `
      <tr>
        <td><small>${time}</small></td>
        <td><code>${item.user}</code></td>
        <td><span class="badge badge-muted">${item.source}</span></td>
        <td><span class="badge badge-warning">${item.category}</span></td>
        <td>${item.filesCount}</td>
        <td>${item.reason}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Specty Governance Report - ${repositoryName}</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --card-hover: #1f2937;
      --border: #374151;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --accent: #6366f1;
      --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      --bg-tag: #1e1b4b;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.25);
    }

    [data-theme="light"] {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-hover: #f1f5f9;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --accent: #4f46e5;
      --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      --bg-tag: #e0e7ff;
      --success: #059669;
      --warning: #d97706;
      --danger: #dc2626;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 32px 24px;
      transition: background-color 0.2s, color 0.2s;
    }

    .container { max-width: 1200px; margin: 0 auto; }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    .header-title h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-title p {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 4px;
    }

    .header-actions { display: flex; gap: 10px; align-items: center; }

    .btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn:hover { background: var(--card-hover); border-color: var(--accent); }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
    }

    .kpi-card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: var(--accent-gradient);
    }

    .kpi-label { font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 32px; font-weight: 800; margin: 10px 0 4px; letter-spacing: -0.03em; }
    .kpi-sub { font-size: 12px; color: var(--text-muted); }

    /* Section Cards */
    .section-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      box-shadow: var(--shadow);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Gauge */
    .gauge-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 30px;
      padding: 10px 0;
    }

    .gauge-stats { display: flex; flex-direction: column; gap: 8px; }
    .gauge-stat-item { font-size: 13px; display: flex; justify-content: space-between; gap: 20px; }
    .gauge-stat-item span:first-child { color: var(--text-muted); }

    /* Tables */
    .table-container {
      overflow-x: auto;
      margin-top: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    th {
      padding: 10px 14px;
      background: var(--bg);
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
    }

    tr:hover td { background: var(--card-hover); }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: var(--success); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
    .badge-info { background: rgba(99, 102, 241, 0.15); color: var(--accent); }
    .badge-muted { background: rgba(156, 163, 175, 0.15); color: var(--text-muted); }

    /* Code snippets */
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background: var(--bg);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--border);
    }

    /* Print styling */
    @media print {
      body { background: #fff !important; color: #000 !important; padding: 0; }
      .header-actions { display: none; }
      .card { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
      .kpi-card { box-shadow: none; border: 1px solid #ccc; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-title">
        <h1>🛡️ Specty Governance & Analytics</h1>
        <p>Reporte Ejecutivo de Gobernanza | Repositorio: <strong>${repositoryName}</strong> | Período: <strong>${period}</strong> | Generado: ${dateFormatted}</p>
      </div>
      <div class="header-actions">
        <button class="btn" id="themeToggleBtn" onclick="toggleTheme()">🌓 Alternar Tema</button>
        <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      </div>
    </header>

    <!-- Top KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Health Score</div>
        <div class="kpi-value" style="color: ${healthColor};">${healthScore}<span style="font-size: 20px; font-weight: 500;">/100</span></div>
        <div class="kpi-sub">Adherencia y calidad normativa</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">MTTA Promedio</div>
        <div class="kpi-value">${mtta.meanHours}<span style="font-size: 20px; font-weight: 500;">h</span></div>
        <div class="kpi-sub">Mediana P50: ${mtta.medianHours}h | P90: ${mtta.p90Hours}h</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Bypasses de Emergencia</div>
        <div class="kpi-value" style="color: ${bypasses.alertLevel === "low" ? "var(--success)" : bypasses.alertLevel === "medium" ? "var(--warning)" : "var(--danger)"};">
          ${bypasses.totalCount} <span style="font-size: 16px; font-weight: 500;">(${bypasses.ratePerGateCheck}%)</span>
        </div>
        <div class="kpi-sub">Alerta: ${bypasses.alertLevel.toUpperCase()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Subagentes: Task Yield</div>
        <div class="kpi-value">${subagents.taskYield}</div>
        <div class="kpi-sub">Tareas por handoff | Bloqueos: ${subagents.blockerRate}%</div>
      </div>
    </div>

    <!-- Section 1: MTTA & Compliance -->
    <div class="section-grid">
      <!-- Card: MTTA Distribution -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">⏱️ Tiempo hasta Aprobación (MTTA)</div>
          <span class="badge badge-info">${mtta.approvedCount} Aprobadas / ${mtta.pendingCount} Pendientes</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Distribución de horas transcurridas desde la creación de la propuesta hasta la primera aprobación válida.
        </p>
        <div style="overflow-x: auto;">
          <svg width="${svgChartWidth}" height="${svgChartHeight}" viewBox="0 0 ${svgChartWidth} ${svgChartHeight}">
            ${mttaBarsSvg || '<text x="20" y="30" fill="var(--text-muted)">Sin cambios aprobados en este período</text>'}
          </svg>
        </div>
      </div>

      <!-- Card: Governance Compliance Gauge -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🛡️ Cumplimiento y Gobernanza</div>
          <span class="badge ${healthScore >= 80 ? "badge-success" : "badge-warning"}">${healthScore}% Cumple</span>
        </div>
        <div class="gauge-container">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" stroke-width="12" />
            <circle cx="70" cy="70" r="54" fill="none" stroke="${healthColor}" stroke-width="12"
              stroke-dasharray="339.29" stroke-dashoffset="${339.29 - (339.29 * healthScore) / 100}"
              stroke-linecap="round" transform="rotate(-90 70 70)" />
            <text x="70" y="76" font-size="28" font-weight="800" fill="var(--text)" text-anchor="middle">${healthScore}%</text>
          </svg>
          <div class="gauge-stats">
            <div class="gauge-stat-item"><span>Integridad (Spec Drift):</span> <strong>${compliance.specIntegrityRate}%</strong></div>
            <div class="gauge-stat-item"><span>Adherencia de Gate:</span> <strong>${compliance.gateAdherenceRate}%</strong></div>
            <div class="gauge-stat-item"><span>Tasa de Adherencia (Reglas/Evals):</span> <strong>${compliance.adherenceRate ?? compliance.gateAdherenceRate}%</strong></div>
            <div class="gauge-stat-item"><span>Desvíos Bloqueados:</span> <strong>${compliance.blockedDriftAttempts ?? 0}</strong></div>
            <div class="gauge-stat-item"><span>Éxito Verificaciones:</span> <strong>${compliance.verificationSuccessRate}%</strong></div>
            <div class="gauge-stat-item"><span>Completitud de Tareas:</span> <strong>${compliance.taskCompletionRate}%</strong></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Subagents & Emergency Bypasses -->
    <div class="section-grid">
      <!-- Card: Subagent Handoff Matrix -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🤖 Colaboración y Handoffs de Subagentes</div>
          <span class="badge badge-info">${subagents.totalHandoffs} Transferencias</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
          Rendimiento y transiciones entre agentes ejecutores.
        </p>
        <div style="overflow-x: auto;">
          <svg width="500" height="${svgFlowHeight}" viewBox="0 0 500 ${svgFlowHeight}">
            ${flowNodesSvg || '<text x="20" y="30" fill="var(--text-muted)">Sin roles de subagentes registrados</text>'}
            ${flowEdgesSvg}
          </svg>
        </div>
      </div>

      <!-- Card: Emergency Bypasses Summary -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🚨 Auditoría de Bypasses de Emergencia</div>
          <span class="badge ${bypasses.alertLevel === "low" ? "badge-success" : bypasses.alertLevel === "medium" ? "badge-warning" : "badge-danger"}">
            ${bypasses.alertLevel.toUpperCase()}
          </span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
          Excepciones de seguridad registradas para hotfixes o incidentes críticos.
        </p>
        <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
          <span class="badge badge-muted">Env: ${bypasses.bySource.env ?? 0}</span>
          <span class="badge badge-muted">Trailer: ${bypasses.bySource.trailer ?? 0}</span>
          <span class="badge badge-muted">CLI Flag: ${bypasses.bySource.option ?? 0}</span>
          <span class="badge badge-warning">Hotfix: ${bypasses.byCategory.incident_hotfix ?? 0}</span>
        </div>
        <div class="table-container" style="max-height: 220px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Fuente</th>
                <th>Categoría</th>
                <th>Archivos</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              ${bypassTableRows || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Sin bypasses registrados</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Section 3: Full Changes MTTA Table -->
    <div class="card" style="margin-bottom: 32px;">
      <div class="card-header">
        <div class="card-title">📋 Detalle de Cambios y Tiempos de Ciclo</div>
        <input type="text" id="changeFilter" placeholder="Filtrar cambios..." onkeyup="filterChangesTable()"
          style="background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 6px 12px; border-radius: 6px; font-size: 12px;" />
      </div>
      <div class="table-container">
        <table id="changesTable">
          <thead>
            <tr>
              <th>ID Cambio</th>
              <th>Título</th>
              <th>Estado</th>
              <th>MTTA (Creación &rarr; Aprobación)</th>
              <th>Re-aprobaciones</th>
            </tr>
          </thead>
          <tbody>
            ${changeTableRows || '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Sin cambios registrados</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
    }

    function filterChangesTable() {
      const input = document.getElementById('changeFilter');
      const filter = input.value.toLowerCase();
      const rows = document.querySelectorAll('#changesTable tbody tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
}
