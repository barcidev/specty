// Specty Settings - Client Controller
(() => {
  let sessionToken = window.__SPECTY_TOKEN__ || null;
  let currentConfig = null;
  let currentMetrics = null;
  let allSpecs = [];
  let infrastructureData = null;
  let currentPeriod = "all";

  // i18n Dictionary
  const I18N_LOCALES = {
    es: {
      liveSync: "Live Sync",
      saveSettings: "Guardar Ajustes",
      tabMetrics: "Métricas & Historial Global",
      tabConfig: "Configuración & Gobernanza",
      tabAiRules: "Herramientas IA & Reglas",
      periodLabel: "Periodo de Análisis:",
      periodAll: "Histórico Completo",
      exportHtml: "Exportar HTML",
      exportMd: "Exportar Markdown",
      kpiTotalSpecs: "Total de Especificaciones",
      kpiSpecsSubtext: "Histórico en repositorio",
      kpiApprovalRate: "Tasa de Aprobación",
      kpiVerificationRate: "Éxito de Verificación",
      kpiBypasses: "Bypasses de Emergencia",
      kpiBypassesSubtext: "Excepciones de gobernanza",
      kpiHandoffs: "Traspasos entre Agentes",
      kpiHandoffsSubtext: "Handoffs registrados",
      specsTableTitle: "Historial Consolidado de Especificaciones",
      specsTableSubtitle: "Registro del ciclo de vida de todas las especificaciones y cambios",
      loadingSpecs: "Cargando historial de especificaciones...",
      thTitle: "Título",
      thStatus: "Estado",
      thApprover: "Aprobador / Responsable",
      thDate: "Fecha de Creación",
      thHash: "Hash Contenido",
      govSectionTitle: "Gobernanza y Plataforma",
      govSectionDesc:
        "Regula cómo se aprueban los cambios y en qué pipeline se ejecutan las compuertas.",
      cfgSpecEngine: "Motor de Especificaciones:",
      cfgCiProvider: "Proveedor de Integración Continua (CI):",
      cfgApprovalMethod: "Método de Aprobación:",
      cfgLanguage: "Idioma de Artefactos:",
      scopeSectionTitle: "Alcance de Archivos Gobernados",
      scopeSectionDesc:
        "Los archivos gobernados requieren obligatoriamente una especificación aprobada para ser modificados.",
      cfgSourcePaths: "Rutas de Código Gobernadas (glob por línea):",
      cfgExemptPaths: "Rutas Exentas de Gobernanza (glob por línea):",
      gatesSectionTitle: "Ganchos Git y Compuertas de Calidad",
      gatesSectionDesc:
        "Configuración de interceptores locales y umbrales para el comando specty gate.",
      toggleGitHooks: "Ganchos Git Locales (specty guard)",
      toggleGitHooksDesc: "Intercepta 'git commit' para evitar commits de código huérfano.",
      toggleLint: "Validación de Linter",
      toggleLintDesc: "Exige paso exitoso de linters configurados en scopes.",
      toggleTest: "Pruebas Unitarias",
      toggleTestDesc: "Exige que la suite de pruebas del proyecto pase en verde.",
      toggleStatic: "Análisis Estático / Tipado",
      toggleStaticDesc: "Verifica tipos y reglas de análisis estático del lenguaje.",
      saveBottom: "Guardar Cambios en .specty/config.yaml",
      aiToolsTitle: "Herramientas de IA y Editores Soportados",
      aiToolsDesc:
        "Selecciona qué editores y asistentes sincronizarán las reglas y contexto de Specty.",
      regenerateAdapters: "Regenerar Adaptadores",
      catalogTitle: "Catálogo de Roles y Reglas del Proyecto",
      catalogDesc: "Artefactos activos generados en el directorio .specty/ del repositorio.",
      toastSaved: "Configuración actualizada en .specty/config.yaml",
      toastSavedShort: "Cambios guardados",
      toastSaveError: "Error al guardar configuración",
      saving: "Guardando...",
      syncing: "Sincronizando...",
    },
    en: {
      liveSync: "Live Sync",
      saveSettings: "Save Settings",
      tabMetrics: "Metrics & Global History",
      tabConfig: "Configuration & Governance",
      tabAiRules: "AI Tools & Rules",
      periodLabel: "Analysis Period:",
      periodAll: "Complete History",
      exportHtml: "Export HTML",
      exportMd: "Export Markdown",
      kpiTotalSpecs: "Total Specifications",
      kpiSpecsSubtext: "Historical in repository",
      kpiApprovalRate: "Approval Rate",
      kpiVerificationRate: "Verification Success",
      kpiBypasses: "Emergency Bypasses",
      kpiBypassesSubtext: "Governance exemptions",
      kpiHandoffs: "Agent Handoffs",
      kpiHandoffsSubtext: "Registered handoffs",
      specsTableTitle: "Consolidated Specification History",
      specsTableSubtitle: "Lifecycle log of all specifications and changes",
      loadingSpecs: "Loading specification history...",
      thTitle: "Title",
      thStatus: "Status",
      thApprover: "Approver / Owner",
      thDate: "Creation Date",
      thHash: "Content Hash",
      govSectionTitle: "Governance & Platform",
      govSectionDesc: "Regulates how changes are approved and where quality gates execute.",
      cfgSpecEngine: "Specification Engine:",
      cfgCiProvider: "Continuous Integration (CI) Provider:",
      cfgApprovalMethod: "Approval Method:",
      cfgLanguage: "Artifacts Language:",
      scopeSectionTitle: "Governed File Scope",
      scopeSectionDesc: "Governed files strictly require an approved specification to be modified.",
      cfgSourcePaths: "Governed Code Paths (glob per line):",
      cfgExemptPaths: "Exempt Paths (glob per line):",
      gatesSectionTitle: "Git Hooks & Quality Gates",
      gatesSectionDesc: "Configuration for local interceptors and specty gate thresholds.",
      toggleGitHooks: "Local Git Hooks (specty guard)",
      toggleGitHooksDesc: "Intercepts 'git commit' to prevent orphan code commits.",
      toggleLint: "Linter Validation",
      toggleLintDesc: "Requires configured linters in scopes to pass cleanly.",
      toggleTest: "Unit Tests",
      toggleTestDesc: "Requires test suite to pass without failures.",
      toggleStatic: "Static Analysis / Typecheck",
      toggleStaticDesc: "Checks types and static analysis rules.",
      saveBottom: "Save Changes to .specty/config.yaml",
      aiToolsTitle: "Supported AI Tools & Editors",
      aiToolsDesc: "Select which editors and assistants will synchronize Specty rules and context.",
      regenerateAdapters: "Regenerate Adapters",
      catalogTitle: "Project Roles & Rules Catalog",
      catalogDesc: "Active artifacts generated in the .specty/ repository directory.",
      toastSaved: "Configuration updated in .specty/config.yaml",
      toastSavedShort: "Changes saved",
      toastSaveError: "Error saving configuration",
      saving: "Saving...",
      syncing: "Syncing...",
    },
  };

  let currentLang = localStorage.getItem("specty_lang") || "es";

  function t(key) {
    const dict = I18N_LOCALES[currentLang] || I18N_LOCALES.es;
    return dict[key] || key;
  }

  function setLanguage(lang) {
    if (!I18N_LOCALES[lang]) return;
    currentLang = lang;
    localStorage.setItem("specty_lang", lang);

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });

    applyTranslations();

    if (currentMetrics) {
      renderMetrics(currentMetrics);
    }
    if (allSpecs.length > 0) {
      renderSpecsTable(allSpecs);
    }
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const text = t(key);
      if (text) {
        el.textContent = text;
      }
    });
  }

  const ALL_SUPPORTED_TOOLS = [
    { id: "cursor", name: "Cursor (.cursorrules)" },
    { id: "copilot", name: "GitHub Copilot (.github/copilot-instructions.md)" },
    { id: "claude", name: "Claude Code (CLAUDE.md)" },
    { id: "windsurf", name: "Windsurf (.windsurfrules)" },
    { id: "cline", name: "Cline (.clinerules)" },
    { id: "antigravity", name: "Google Antigravity (.agents/rules/)" },
    { id: "gemini", name: "Gemini CLI (GEMINI.md)" },
    { id: "codex", name: "OpenAI Codex (CODEX.md)" },
    { id: "cody", name: "Sourcegraph Cody (.sourcegraph/cody.json)" },
    { id: "continue", name: "Continue.dev (.continue/config.json)" },
    { id: "aider", name: "Aider (.aider.conf.yml)" },
    { id: "zed", name: "Zed AI (.zed/prompts/)" },
    { id: "opencode", name: "OpenCode Interpreter" },
    { id: "junie", name: "JetBrains Junie" },
  ];

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    if (sessionToken) {
      headers["X-Specty-Token"] = sessionToken;
    }
    return headers;
  }

  // DOM Elements
  const branchNameEl = document.getElementById("branch-name");
  const headerRepoPathEl = document.getElementById("header-repo-path");
  const activeEngineBadgeEl = document.getElementById("active-engine-badge");
  const toastEl = document.getElementById("toast");

  // Tabs
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Metrics Elements
  const periodButtons = document.querySelectorAll(".btn-period");
  const kpiTotalSpecs = document.getElementById("kpi-total-specs");
  const kpiSpecsSubtext = document.getElementById("kpi-specs-subtext");
  const kpiApprovalRate = document.getElementById("kpi-approval-rate");
  const kpiApprovalsSubtext = document.getElementById("kpi-approvals-subtext");
  const kpiVerificationRate = document.getElementById("kpi-verification-rate");
  const kpiVerificationsSubtext = document.getElementById("kpi-verifications-subtext");
  const kpiTotalBypasses = document.getElementById("kpi-total-bypasses");
  const kpiTotalHandoffs = document.getElementById("kpi-total-handoffs");
  const specsTableBody = document.getElementById("specs-table-body");
  const searchSpecsInput = document.getElementById("search-specs");
  const btnExportHtml = document.getElementById("btn-export-html");
  const btnExportMd = document.getElementById("btn-export-md");

  // Config Elements
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
  const btnSaveTop = document.getElementById("btn-save-top");
  const btnSaveBottom = document.getElementById("btn-save-bottom");
  const saveStatusMsg = document.getElementById("save-status-msg");
  const btnRegenerateTools = document.getElementById("btn-regenerate-tools");

  // Toast Helper
  let toastTimer = null;
  function showToast(msg, isError = false) {
    if (!toastEl) return;
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    toastEl.textContent = msg;
    toastEl.className = `toast ${isError ? "toast-error" : "toast-success"}`;
    toastEl.classList.remove("hidden");
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 3200);
  }

  // Setup Tabs
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => {
        b.classList.remove("active");
      });
      tabPanes.forEach((p) => {
        p.classList.remove("active");
      });

      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Setup Periods
  periodButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      periodButtons.forEach((b) => {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      currentPeriod = btn.dataset.period;
      loadMetrics();
    });
  });

  // API Call: Status
  async function loadStatus() {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const data = await res.json();
      if (data.sessionToken && !sessionToken) {
        sessionToken = data.sessionToken;
      }
      branchNameEl.textContent = data.branch || "unknown";
      headerRepoPathEl.textContent = data.repoRoot || "...";

      if (data.config?.language && !localStorage.getItem("specty_lang")) {
        setLanguage(data.config.language);
      }
    } catch (err) {
      console.warn("Error cargando estado:", err);
    }
  }

  // API Call: Load Config
  async function loadConfigData() {
    try {
      const res = await fetch("/api/config", { headers: authHeaders() });
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      const data = await res.json();
      currentConfig = data.config;

      activeEngineBadgeEl.textContent = `Engine: ${currentConfig.spec_engine || "openspec"}`;
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
      label.className = "toggle-card";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "form-checkbox tool-cb";
      cb.value = tool.id;
      cb.checked = isChecked;

      const span = document.createElement("span");
      span.className = "toggle-title";
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
      saveStatusMsg.textContent = t("saving");

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
        throw new Error(errJson.error || t("toastSaveError"));
      }

      const resData = await res.json();
      currentConfig = resData.config;
      activeEngineBadgeEl.textContent = `Engine: ${currentConfig.spec_engine}`;

      saveStatusMsg.textContent = t("toastSavedShort");
      showToast(t("toastSaved"));
      setTimeout(() => {
        saveStatusMsg.textContent = "";
      }, 3000);
    } catch (err) {
      showToast(err.message, true);
      saveStatusMsg.textContent = t("toastSaveError");
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

      const statusClass = `status-${spec.status || "draft"}`;
      const statusHtml = `<span class="status-badge ${statusClass}">${spec.status || "draft"}</span>`;

      const idHtml = `<code>${escapeHtml(spec.id)}</code>`;
      const titleHtml = escapeHtml(spec.title || spec.id);
      const approverHtml = spec.approved_by
        ? `@${escapeHtml(spec.approved_by)}`
        : '<span class="text-muted">Pendiente</span>';
      const createdHtml = spec.created_at
        ? new Date(spec.created_at).toLocaleDateString()
        : '<span class="text-muted">-</span>';
      const hashHtml = spec.content_hash
        ? `<code>${spec.content_hash.slice(0, 8)}</code>`
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
        showToast(`Reporte generado: ${files.map((f) => f.path).join(", ")}`);
      } else {
        showToast("Reporte exportado exitosamente");
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
      btnRegenerateTools.innerHTML = `<i class="ph ph-spinner"></i> <span>${t("syncing")}</span>`;
      const res = await fetch("/api/infrastructure/regenerate", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
      });
      if (!res.ok) throw new Error("Error regenerando infraestructura");
      const data = await res.json();
      showToast(
        `Adaptadores e infraestructura regenerados (${data.result?.writtenCount || 0} archivos)`,
      );
      await loadInfrastructure();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      btnRegenerateTools.disabled = false;
      btnRegenerateTools.innerHTML = `<i class="ph-bold ph-lightning"></i> <span>${t("regenerateAdapters")}</span>`;
    }
  });

  // Save buttons events
  btnSaveTop.addEventListener("click", saveConfigData);
  btnSaveBottom.addEventListener("click", saveConfigData);

  // Language switcher delegation
  document.addEventListener("click", (e) => {
    const langBtn = e.target.closest(".lang-btn");
    if (langBtn) {
      const lang = langBtn.getAttribute("data-lang");
      if (lang) {
        setLanguage(lang);
      }
    }
  });

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
  setLanguage(currentLang);
  loadStatus();
  loadConfigData();
  loadMetrics();
  loadInfrastructure();
  setupSse();
})();
