// settings.js - Specty Global Settings & Metrics Console
(() => {
  const token = window.__SPECTY_TOKEN__ || null;

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  // App State
  let currentConfig = null;
  let currentMetrics = null;
  let allSpecs = [];
  let currentPeriod = "all";
  let infrastructureData = null;

  const ALL_SUPPORTED_TOOLS = [
    { id: "cursor", name: "Cursor (.cursorrules)" },
    { id: "windsurf", name: "Windsurf (.windsurfrules)" },
    { id: "claude", name: "Claude Code (.clauderules)" },
    { id: "copilot", name: "GitHub Copilot (.github/copilot-instructions.md)" },
    { id: "antigravity", name: "Google Antigravity (.agents/)" },
    { id: "cline", name: "Cline (.clinerules)" },
    { id: "roo", name: "Roo Code (.roomodes)" },
    { id: "aider", name: "Aider (.aider.conf.yml)" },
  ];

  // DOM Elements
  const branchNameEl = document.getElementById("branch-name");
  const headerRepoPathEl = document.getElementById("header-repo-path");
  const activeEngineBadgeEl = document.getElementById("active-engine-badge");
  const toastEl = document.getElementById("toast");

  // Tabs
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Period buttons
  const periodButtons = document.querySelectorAll(".btn-period");

  // KPI elements
  const kpiTotalSpecs = document.getElementById("kpi-total-specs");
  const kpiApprovalRate = document.getElementById("kpi-approval-rate");
  const kpiVerificationRate = document.getElementById("kpi-verification-rate");
  const kpiTotalBypasses = document.getElementById("kpi-total-bypasses");
  const kpiTotalHandoffs = document.getElementById("kpi-total-handoffs");
  const kpiSpecsSubtext = document.getElementById("kpi-specs-subtext");
  const kpiApprovalsSubtext = document.getElementById("kpi-approvals-subtext");
  const kpiVerificationsSubtext = document.getElementById("kpi-verifications-subtext");
  const specsTableBody = document.getElementById("specs-table-body");
  const searchSpecsInput = document.getElementById("search-specs");

  // Config Form elements
  const cfgSpecEngine = document.getElementById("cfg-spec-engine");
  const cfgCiProvider = document.getElementById("cfg-ci-provider");
  const cfgApprovalMethod = document.getElementById("cfg-approval-method");
  const cfgLanguage = document.getElementById("cfg-language");
  const cfgSourcePaths = document.getElementById("cfg-source-paths");
  const cfgExemptPaths = document.getElementById("cfg-exempt-paths");
  const cfgGitHooks = document.getElementById("cfg-git-hooks");
  const cfgGateLint = document.getElementById("cfg-gate-lint");
  const cfgGateTest = document.getElementById("cfg-gate-test");
  const cfgGateStatic = document.getElementById("cfg-gate-static");
  const saveStatusMsg = document.getElementById("save-status-msg");

  // Buttons
  const btnSaveTop = document.getElementById("btn-save-top");
  const btnSaveBottom = document.getElementById("btn-save-bottom");
  const btnExportHtml = document.getElementById("btn-export-html");
  const btnExportMd = document.getElementById("btn-export-md");
  const btnRegenerateTools = document.getElementById("btn-regenerate-tools");

  // Toast
  function showToast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.style.borderColor = isError ? "var(--color-danger)" : "var(--brand-purple)";
    toastEl.classList.remove("hidden");
    setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 3500);
  }

  // Tab Navigation
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      tabButtons.forEach((b) => {
        b.classList.remove("active");
      });
      tabPanes.forEach((p) => {
        p.classList.remove("active");
      });

      btn.classList.add("active");
      const targetPane = document.getElementById(targetTab);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });

  // Period Selector
  periodButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      periodButtons.forEach((b) => {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      currentPeriod = btn.getAttribute("data-period");
      loadMetrics();
    });
  });

  // API Call: Status & Repo Info
  async function loadStatus() {
    try {
      const res = await fetch("/api/status", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      branchNameEl.textContent = data.branch || "unknown";
      if (data.repoRoot) {
        const parts = data.repoRoot.split("/");
        headerRepoPathEl.textContent = parts[parts.length - 1] || data.repoRoot;
      }
      if (data.config?.spec_engine) {
        activeEngineBadgeEl.textContent = `Engine: ${data.config.spec_engine}`;
      }
    } catch (_err) {
      // offline / non-fatal
    }
  }

  // API Call: Load Config
  async function loadConfigData() {
    try {
      const res = await fetch("/api/config", { headers: authHeaders() });
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      const data = await res.json();
      currentConfig = data.config;

      // Populate form
      cfgSpecEngine.value = currentConfig.spec_engine || "openspec";
      cfgCiProvider.value = currentConfig.governance?.ci || "github";
      cfgApprovalMethod.value = currentConfig.governance?.approval_method || "hybrid";
      cfgLanguage.value = currentConfig.language || "es";

      cfgSourcePaths.value = (currentConfig.governance?.source_paths || ["src/**"]).join("\n");
      cfgExemptPaths.value = (
        currentConfig.governance?.exempt_paths || ["**/*.md", "openspec/**", "docs/**"]
      ).join("\n");

      cfgGitHooks.checked = Boolean(currentConfig.governance?.hooks !== false);
      cfgGateLint.checked = Boolean(currentConfig.governance?.quality_gates?.lint !== false);
      cfgGateTest.checked = Boolean(currentConfig.governance?.quality_gates?.test !== false);
      cfgGateStatic.checked = Boolean(currentConfig.governance?.quality_gates?.static !== false);

      renderAiToolsList(currentConfig.tools || []);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  // Render AI tools checkboxes
  function renderAiToolsList(selectedTools = []) {
    const container = document.getElementById("ai-tools-grid");
    if (!container) return;
    container.innerHTML = "";

    ALL_SUPPORTED_TOOLS.forEach((tool) => {
      const isChecked = selectedTools.includes(tool.id);
      const label = document.createElement("label");
      label.className = "tool-badge-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "form-checkbox tool-cb";
      cb.value = tool.id;
      cb.checked = isChecked;

      const span = document.createElement("span");
      span.textContent = tool.name;

      label.appendChild(cb);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  // API Call: Save Config
  async function saveConfigData() {
    if (!currentConfig) return;

    try {
      btnSaveTop.disabled = true;
      btnSaveBottom.disabled = true;
      saveStatusMsg.textContent = "Guardando...";

      const selectedTools = Array.from(document.querySelectorAll(".tool-cb:checked")).map(
        (cb) => cb.value,
      );

      const sourcePaths = cfgSourcePaths.value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const exemptPaths = cfgExemptPaths.value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const updated = {
        ...currentConfig,
        spec_engine: cfgSpecEngine.value,
        language: cfgLanguage.value,
        tools: selectedTools.length > 0 ? selectedTools : currentConfig.tools,
        governance: {
          ...currentConfig.governance,
          ci: cfgCiProvider.value,
          approval_method: cfgApprovalMethod.value,
          hooks: cfgGitHooks.checked,
          source_paths: sourcePaths.length > 0 ? sourcePaths : ["src/**"],
          exempt_paths:
            exemptPaths.length > 0 ? exemptPaths : ["**/*.md", "openspec/**", "docs/**"],
          quality_gates: {
            ...currentConfig.governance?.quality_gates,
            lint: cfgGateLint.checked,
            test: cfgGateTest.checked,
            static: cfgGateStatic.checked,
          },
        },
      };

      const res = await fetch("/api/config", {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Error al guardar configuración");
      }

      const resData = await res.json();
      currentConfig = resData.config;
      activeEngineBadgeEl.textContent = `Engine: ${currentConfig.spec_engine}`;

      saveStatusMsg.textContent = "✓ Cambios guardados";
      showToast("✓ Configuración actualizada en .specty/config.yaml");
      setTimeout(() => {
        saveStatusMsg.textContent = "";
      }, 3000);
    } catch (err) {
      showToast(err.message, true);
      saveStatusMsg.textContent = "✖ Error al guardar";
    } finally {
      btnSaveTop.disabled = false;
      btnSaveBottom.disabled = false;
    }
  }

  // API Call: Load Metrics & All Changes
  async function loadMetrics() {
    try {
      const [metricsRes, changesRes] = await Promise.all([
        fetch(`/api/metrics?period=${encodeURIComponent(currentPeriod)}`, {
          headers: authHeaders(),
        }),
        fetch("/api/changes", { headers: authHeaders() }),
      ]);

      if (metricsRes.ok) {
        currentMetrics = await metricsRes.json();
        renderMetrics(currentMetrics);
      }

      if (changesRes.ok) {
        const changesData = await changesRes.json();
        allSpecs = changesData.changes || [];
        renderSpecsTable(allSpecs);
      }
    } catch (err) {
      console.warn("Error cargando métricas:", err);
    }
  }

  function renderMetrics(data) {
    const summary = data.summary || {};
    const exec = data.executiveReport || {};

    const totalSpecs = exec.changes?.length ?? allSpecs.length ?? summary.totalChanges ?? 0;
    kpiTotalSpecs.textContent = String(totalSpecs);
    kpiSpecsSubtext.textContent = `${summary.totalEvents ?? 0} eventos analizados`;

    const approvalRate = Math.round(summary.approvalPassRate ?? 100);
    kpiApprovalRate.textContent = `${approvalRate}%`;
    kpiApprovalsSubtext.textContent = `${summary.totalApprovals ?? 0} aprobadas / ${summary.totalInvalidations ?? 0} invalidadas`;

    const verificationRate = Math.round(summary.verificationSuccessRate ?? 100);
    kpiVerificationRate.textContent = `${verificationRate}%`;
    kpiVerificationsSubtext.textContent = `${summary.totalVerifications ?? 0} pruebas ejecutadas`;

    kpiTotalBypasses.textContent = String(summary.totalBypasses ?? 0);
    kpiTotalHandoffs.textContent = String(summary.totalHandoffs ?? 0);
  }

  function renderSpecsTable(specs) {
    specsTableBody.innerHTML = "";
    const filter = (searchSpecsInput.value || "").toLowerCase().trim();

    const filtered = specs.filter((s) => {
      if (!filter) return true;
      return (
        s.id?.toLowerCase().includes(filter) ||
        s.title?.toLowerCase().includes(filter) ||
        s.status?.toLowerCase().includes(filter)
      );
    });

    if (filtered.length === 0) {
      specsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">No se encontraron especificaciones coincidentes.</td>
        </tr>
      `;
      return;
    }

    filtered.forEach((spec) => {
      const tr = document.createElement("tr");

      const statusClass = `tag-${spec.status || "draft"}`;
      const statusHtml = `<span class="status-tag ${statusClass}">${spec.status || "draft"}</span>`;

      const idHtml = `<span class="code-badge">${escapeHtml(spec.id)}</span>`;
      const titleHtml = escapeHtml(spec.title || spec.id);
      const approverHtml = spec.approved_by
        ? `@${escapeHtml(spec.approved_by)}`
        : '<span class="text-muted">Pendiente</span>';
      const createdHtml = spec.created_at
        ? new Date(spec.created_at).toLocaleDateString()
        : '<span class="text-muted">-</span>';
      const hashHtml = spec.content_hash
        ? `<span class="code-badge">${spec.content_hash.slice(0, 8)}...</span>`
        : '<span class="text-muted">N/A</span>';

      tr.innerHTML = `
        <td>${idHtml}</td>
        <td><strong>${titleHtml}</strong></td>
        <td>${statusHtml}</td>
        <td>${approverHtml}</td>
        <td>${createdHtml}</td>
        <td>${hashHtml}</td>
      `;

      specsTableBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  searchSpecsInput.addEventListener("input", () => {
    renderSpecsTable(allSpecs);
  });

  // API Call: Export Report
  async function handleExport(format) {
    try {
      showToast(`Generando reporte ${format.toUpperCase()}...`);
      const res = await fetch("/api/metrics/export", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ format, period: currentPeriod }),
      });

      if (!res.ok) throw new Error("Error exportando reporte");
      const data = await res.json();
      const files = data.result?.generatedFiles || [];
      if (files.length > 0) {
        showToast(`✓ Reporte generado: ${files.map((f) => f.path).join(", ")}`);
      } else {
        showToast("✓ Reporte exportado exitosamente");
      }
    } catch (err) {
      showToast(err.message, true);
    }
  }

  btnExportHtml.addEventListener("click", () => handleExport("html"));
  btnExportMd.addEventListener("click", () => handleExport("markdown"));

  // API Call: Load Infrastructure & Catalog
  async function loadInfrastructure() {
    try {
      const res = await fetch("/api/infrastructure", { headers: authHeaders() });
      if (!res.ok) return;
      infrastructureData = await res.json();

      renderFileList("agents-file-list", infrastructureData.agents);
      renderFileList("rules-file-list", infrastructureData.rules);
      renderFileList("templates-file-list", infrastructureData.templates);
    } catch (err) {
      console.warn("Error cargando infraestructura:", err);
    }
  }

  function renderFileList(elementId, files = []) {
    const ul = document.getElementById(elementId);
    if (!ul) return;
    ul.innerHTML = "";
    if (files.length === 0) {
      ul.innerHTML = '<li class="text-muted">Ninguno registrado</li>';
      return;
    }
    files.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      ul.appendChild(li);
    });
  }

  // Regenerate Tools / Infrastructure
  btnRegenerateTools.addEventListener("click", async () => {
    try {
      btnRegenerateTools.disabled = true;
      btnRegenerateTools.textContent = "Sincronizando...";
      const res = await fetch("/api/infrastructure/regenerate", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
      });
      if (!res.ok) throw new Error("Error regenerando infraestructura");
      const data = await res.json();
      showToast(
        `✓ Adaptadores e infraestructura regenerados (${data.result?.writtenCount || 0} archivos)`,
      );
      await loadInfrastructure();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      btnRegenerateTools.disabled = false;
      btnRegenerateTools.textContent = "⚡ Regenerar Adaptadores";
    }
  });

  // Save buttons events
  btnSaveTop.addEventListener("click", saveConfigData);
  btnSaveBottom.addEventListener("click", saveConfigData);

  // SSE Hub
  function setupSse() {
    const sse = new EventSource("/api/events");
    sse.addEventListener("config:updated", () => {
      loadConfigData();
    });
    sse.addEventListener("infrastructure:regenerated", () => {
      loadInfrastructure();
    });
    sse.addEventListener("change:approved", () => {
      loadMetrics();
    });
  }

  // Init
  loadStatus();
  loadConfigData();
  loadMetrics();
  loadInfrastructure();
  setupSse();
})();
