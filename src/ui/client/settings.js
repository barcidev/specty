// Specty Settings - Client Controller
(() => {
  let sessionToken = window.__SPECTY_TOKEN__ || null;
  let currentConfig = null;
  let currentMetrics = null;
  let allSpecs = [];
  let infrastructureData = null;
  let currentPeriod = "all";

  // MCP Presets Catalog
  const MCP_PRESETS = [
    {
      id: "postgres",
      name: "PostgreSQL Database",
      desc: "Inspección de esquema y consultas SQL de solo lectura",
      server: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/app_db"],
        transport: "stdio",
        description: "PostgreSQL database schema and queries",
        roles: ["data", "backend"],
      },
    },
    {
      id: "jira",
      name: "Atlassian Jira",
      desc: "Gestión de tareas, sprints e incidencias de Jira",
      server: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-jira"],
        env: {
          JIRA_URL: "https://your-domain.atlassian.net",
          JIRA_EMAIL: "dev@example.com",
          JIRA_API_TOKEN: "${JIRA_API_TOKEN}",
        },
        transport: "stdio",
        description: "Atlassian Jira project & issue tracking",
        roles: ["orchestrator"],
      },
    },
    {
      id: "azure-devops",
      name: "Azure DevOps",
      desc: "Tableros, work items y pull requests de Azure DevOps",
      server: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-azure-devops"],
        env: {
          AZURE_DEVOPS_ORG_URL: "https://dev.azure.com/your-org",
          AZURE_DEVOPS_PAT: "${AZURE_DEVOPS_PAT}",
        },
        transport: "stdio",
        description: "Azure DevOps work items & pipelines",
        roles: ["orchestrator", "security-review"],
      },
    },
    {
      id: "figma",
      name: "Figma Design",
      desc: "Extracción de tokens, colores y componentes de Figma",
      server: {
        command: "npx",
        args: ["-y", "figma-mcp-server"],
        env: {
          FIGMA_ACCESS_TOKEN: "${FIGMA_ACCESS_TOKEN}",
        },
        transport: "stdio",
        description: "Figma design system tokens and component specs",
        roles: ["frontend"],
      },
    },
    {
      id: "github",
      name: "GitHub",
      desc: "Repositorios, issues, releases y PRs de GitHub",
      server: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
          GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}",
        },
        transport: "stdio",
        description: "GitHub issues and repository automation",
        roles: ["orchestrator", "testing"],
      },
    },
  ];

  // Git Workflows Catalog
  const GIT_WORKFLOWS_DEF = [
    {
      id: "feature-branch",
      name: "Feature Branch",
      descEs: "Ramas cortas por tarea integradas vía PR a main.",
      descEn: "Short-lived task branches merged into main via PR.",
      diagram: "feature/* -> PR -> main",
    },
    {
      id: "gitflow",
      name: "GitFlow",
      descEs: "Ramas paralelas main y develop con feature/*, release/* y hotfix/*.",
      descEn: "Parallel main and develop with feature/*, release/*, and hotfix/*.",
      diagram: "feature/* -> develop -> release/* -> main",
    },
    {
      id: "trunk-based",
      name: "Trunk-Based",
      descEs: "Integración continua en main con ramas efímeras (< 1 día).",
      descEn: "Continuous trunk integration with short-lived branches (< 1 day).",
      diagram: "short-fix -> merge diario a main",
    },
    {
      id: "centralized",
      name: "Centralizado",
      descEs: "Commits directos en rama main sin ramas secundarias.",
      descEn: "Direct commits to main branch without separate feature branches.",
      diagram: "commit directo en main",
    },
    {
      id: "forking",
      name: "Forking",
      descEs: "Bifurcaciones independientes con Pull Requests hacia upstream.",
      descEn: "Developer forks submitting Pull Requests to upstream repository.",
      diagram: "fork:feature/* -> PR a upstream:main",
    },
  ];

  // Commit Conventions Map & Previews
  const COMMIT_CONVENTIONS_PREVIEW = {
    conventional: "feat(auth): implement oauth2 authentication flow",
    classic: "Implement oauth2 authentication flow",
    gitmoji: "✨ feat: implement oauth2 authentication flow",
    ticket: "[PROJ-123] implement oauth2 authentication flow",
    "gitmoji-conventional": "✨ feat(auth): implement oauth2 authentication flow",
    "conventional-ticket": "feat(auth): [PROJ-123] implement oauth2 authentication flow",
    "gitmoji-ticket": "✨ [PROJ-123] implement oauth2 authentication flow",
    "gitmoji-conventional-ticket": "✨ feat(auth): [PROJ-123] implement oauth2 authentication flow",
  };

  // i18n Dictionary
  const I18N_LOCALES = {
    es: {
      backToDashboard: "Volver al Tablero",
      liveSync: "Live Sync",
      saveSettings: "Guardar Ajustes",
      tabMetrics: "Métricas & Historial",
      tabConfig: "Gobernanza & Compuertas",
      tabGit: "Flujo Git & Commits",
      tabProject: "Proyecto & Scopes",
      tabMcp: "Protocolo MCP & Grafo",
      tabUiStyle: "Diseño & UI Style",
      tabAiRules: "Herramientas IA & Reglas",
      periodLabel: "Periodo de Análisis:",
      periodAll: "Histórico Completo",
      exportHtml: "Exportar HTML",
      exportMd: "Exportar Markdown",
      toggleMetrics: "Auditoría y Telemetría de Eventos Activa",
      toggleMetricsDesc:
        "Registra métricas del ciclo de vida y analítica ejecutiva en el repositorio (.specty/metrics/).",
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
      toggleWait: "Espera Reactiva de Aprobación (specty wait)",
      toggleWaitDesc:
        "Pausa al asistente de IA esperando aprobación o ajustes del plan en la interfaz.",
      cfgCoverageMin: "Cobertura Mínima de Pruebas Requerida (%):",
      bypassSectionTitle: "Bypasses de Emergencia y Revisión Humana",
      bypassSectionDesc:
        "Reglas de excepción para commits urgentes y firmas de aprobación requeridas.",
      cfgBypassEnv: "Variable de Entorno de Bypass:",
      cfgBypassTrailer: "Git Commit Trailer:",
      cfgRequiredReviewers: "Revisores Obligatorios (uno por línea o separados por coma):",
      toggleCodeowners: "Exigir Revisión de CODEOWNERS",
      toggleCodeownersDesc:
        "Requiere que al menos un propietario del archivo en el archivo CODEOWNERS apruebe la especificación.",
      gitWorkflowTitle: "Estrategia de Ramas Git (Workflow)",
      gitWorkflowDesc:
        "Determina cómo la IA y el equipo estructuran, integran y ramifican las funcionalidades.",
      commitConventionTitle: "Convención de Mensajes de Commit",
      commitConventionDesc:
        "Estandariza el formato semántico de los commits generados por agentes IA y desarrolladores.",
      cfgCommitConvention: "Convención Seleccionada:",
      commitPreviewLabel: "Simulador en Vivo de Commit:",
      projectStructureTitle: "Estructura y Arquitectura del Proyecto",
      projectStructureDesc:
        "Configura la topología del repositorio y los patrones arquitecturales para los agentes de IA.",
      cfgProjectLayout: "Topología del Repositorio (Layout):",
      cfgProjectKind: "Estado del Proyecto:",
      cfgProjectArchitecture: "Patrón Arquitectónico del Repositorio:",
      scopesSectionTitle: "Alcances y Stacks Tecnológicos (Scopes)",
      scopesSectionDesc:
        "Define paquetes, lenguajes, frameworks y comandos de verificación asociados.",
      btnAddScope: "Añadir Scope",
      mcpSectionTitle: "Model Context Protocol (MCP) & Memoria de Código",
      mcpSectionDesc:
        "Gestiona la integración de servidores de contexto y el grafo semántico del repositorio.",
      toggleMcpEnabled: "Activar Protocolo MCP de Specty",
      toggleMcpEnabledDesc:
        "Expone herramientas y recursos del proyecto a editores como Cursor, Antigravity y Claude.",
      toggleMcpAutoIndex: "Indexación Automática de Código",
      toggleMcpAutoIndexDesc:
        "Re-indexa el grafo semántico automáticamente al guardar cambios en especificaciones.",
      cfgMcpProvider: "Proveedor de Grafo Semántico:",
      cfgMcpMaxKb: "Límite Máximo de Archivo en Grafo (KB):",
      cfgMcpExclude: "Rutas Excluidas del Grafo (glob por línea):",
      customMcpServersTitle: "Servidores MCP Personalizados del Proyecto",
      customMcpServersDesc:
        "Conecta fuentes de datos externas (Jira, Postgres, GitHub, Figma) con tus agentes.",
      btnAddCustomMcp: "Añadir Servidor",
      mcpPresetsLabel: "Presets Rápidos Oficiales:",
      uiStyleTitle: "Sistema de Diseño & Reglas de Frontend",
      uiStyleDesc:
        "Define la personalidad visual y convenciones de UI para que los agentes construyan componentes coherentes.",
      toggleUiHasGui: "El Proyecto Posee Interfaz Gráfica (GUI)",
      toggleUiHasGuiDesc:
        "Activa la generación de pautas de diseño y tokens para los agentes de frontend.",
      toggleUiCustomized: "Reglas de Diseño Personalizadas",
      toggleUiCustomizedDesc:
        "Instruye a los agentes a priorizar tokens y patrones a medida sobre estilos neutros genéricos.",
      cfgUiPurpose: "Propósito Principal de la Interfaz:",
      cfgUiAudience: "Público Objetivo (Audiencia):",
      cfgUiRadius: "Estilo de Bordes (Border Radius):",
      cfgUiEffects: "Efectos Visuales:",
      cfgUiColorMode: "Modo de Color Soportado:",
      uiTokensTitle: "Tokens de Diseño Personalizados",
      uiTokensDesc: "Variables CSS de paleta o tipografía comunicadas a los agentes en sus reglas.",
      btnAddToken: "Añadir Token",
      aiToolsTitle: "Herramientas de IA y Editores Soportados",
      aiToolsDesc:
        "Selecciona qué editores y asistentes sincronizarán las reglas y contexto de Specty.",
      selectAll: "Marcar Todos",
      deselectAll: "Desmarcar",
      regenerateAdapters: "Regenerar Adaptadores",
      catalogTitle: "Catálogo de Roles y Reglas del Proyecto",
      catalogDesc: "Artefactos activos generados en el directorio .specty/ del repositorio.",
      saveBottom: "Guardar Cambios en .specty/config.yaml",
      toastSaved: "Configuración actualizada en .specty/config.yaml",
      toastSavedShort: "Cambios guardados",
      toastSaveError: "Error al guardar configuración",
      saving: "Guardando...",
      syncing: "Sincronizando...",
    },
    en: {
      backToDashboard: "Back to Dashboard",
      liveSync: "Live Sync",
      saveSettings: "Save Settings",
      tabMetrics: "Metrics & History",
      tabConfig: "Governance & Gates",
      tabGit: "Git Workflow & Commits",
      tabProject: "Project & Scopes",
      tabMcp: "MCP Protocol & Graph",
      tabUiStyle: "UI Design & Style",
      tabAiRules: "AI Tools & Rules",
      periodLabel: "Analysis Period:",
      periodAll: "Complete History",
      exportHtml: "Export HTML",
      exportMd: "Export Markdown",
      toggleMetrics: "Event Telemetry & Audit Active",
      toggleMetricsDesc:
        "Records lifecycle metrics and executive analytics in repository (.specty/metrics/).",
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
      toggleWait: "Reactive Approval Wait (specty wait)",
      toggleWaitDesc:
        "Pauses AI assistant execution until the user approves or adjusts the plan in the UI.",
      cfgCoverageMin: "Minimum Test Coverage Required (%):",
      bypassSectionTitle: "Emergency Bypasses & Human Review",
      bypassSectionDesc: "Exception rules for urgent commits and required reviewer signatures.",
      cfgBypassEnv: "Bypass Environment Variable:",
      cfgBypassTrailer: "Git Commit Trailer:",
      cfgRequiredReviewers: "Required Reviewers (one per line or comma-separated):",
      toggleCodeowners: "Require CODEOWNERS Review",
      toggleCodeownersDesc:
        "Requires at least one matched CODEOWNERS owner to sign off on the specification.",
      gitWorkflowTitle: "Git Branching Workflow",
      gitWorkflowDesc: "Determines how AI agents and developers structure and branch work.",
      commitConventionTitle: "Commit Message Convention",
      commitConventionDesc:
        "Standardizes semantic formatting of commits made by AI assistants and developers.",
      cfgCommitConvention: "Selected Convention:",
      commitPreviewLabel: "Live Commit Simulator:",
      projectStructureTitle: "Project Structure & Architecture",
      projectStructureDesc:
        "Configures repository topology and architectural patterns for AI agents.",
      cfgProjectLayout: "Repository Topology (Layout):",
      cfgProjectKind: "Project State:",
      cfgProjectArchitecture: "Repository Architectural Pattern:",
      scopesSectionTitle: "Scopes & Tech Stacks",
      scopesSectionDesc: "Define code packages, languages, frameworks, and verification scripts.",
      btnAddScope: "Add Scope",
      mcpSectionTitle: "Model Context Protocol (MCP) & Code Memory",
      mcpSectionDesc: "Manages context servers and semantic graph indexing for your repository.",
      toggleMcpEnabled: "Enable Specty MCP Protocol",
      toggleMcpEnabledDesc:
        "Exposes project resources and tools to AI editors like Cursor, Antigravity, and Claude.",
      toggleMcpAutoIndex: "Automatic Code Indexing",
      toggleMcpAutoIndexDesc:
        "Re-indexes code semantic graph automatically when specifications change.",
      cfgMcpProvider: "Semantic Graph Provider:",
      cfgMcpMaxKb: "Max File Size in Graph (KB):",
      cfgMcpExclude: "Graph Exclude Paths (glob per line):",
      customMcpServersTitle: "Custom Project MCP Servers",
      customMcpServersDesc:
        "Connect external data sources (Jira, Postgres, GitHub, Figma) directly to your agents.",
      btnAddCustomMcp: "Add Server",
      mcpPresetsLabel: "Official Quick Presets:",
      uiStyleTitle: "Frontend & UI Design System",
      uiStyleDesc:
        "Defines visual personality and frontend conventions so agents build coherent components.",
      toggleUiHasGui: "Project Has Graphical UI (GUI)",
      toggleUiHasGuiDesc:
        "Activates generation of design guidelines and tokens for frontend assistants.",
      toggleUiCustomized: "Customized Design Rules",
      toggleUiCustomizedDesc:
        "Instructs AI agents to prioritize bespoke tokens over neutral styles.",
      cfgUiPurpose: "Main Interface Purpose:",
      cfgUiAudience: "Target Audience:",
      cfgUiRadius: "Border Radius Style:",
      cfgUiEffects: "Visual Effects:",
      cfgUiColorMode: "Color Mode Supported:",
      uiTokensTitle: "Custom Design Tokens",
      uiTokensDesc:
        "CSS variables for palettes or typography communicated to agents in their rules.",
      btnAddToken: "Add Token",
      aiToolsTitle: "Supported AI Tools & Editors",
      aiToolsDesc: "Select which editors and assistants will synchronize Specty rules and context.",
      selectAll: "Select All",
      deselectAll: "Deselect All",
      regenerateAdapters: "Regenerate Adapters",
      catalogTitle: "Project Roles & Rules Catalog",
      catalogDesc: "Active artifacts generated in the .specty/ repository directory.",
      saveBottom: "Save Changes to .specty/config.yaml",
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

    if (currentConfig) {
      renderGitWorkflows(currentConfig.git?.workflow || "feature-branch");
    }
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

  // All 17 Supported Tools matching backend registry and schema
  const ALL_SUPPORTED_TOOLS = [
    { id: "antigravity", name: "Google Antigravity (.agents/rules/)" },
    { id: "claude", name: "Claude Code (CLAUDE.md)" },
    { id: "cursor", name: "Cursor (.cursorrules)" },
    { id: "github-copilot", name: "GitHub Copilot (.github/copilot-instructions.md)" },
    { id: "windsurf", name: "Windsurf (.windsurfrules)" },
    { id: "codex", name: "OpenAI Codex (CODEX.md)" },
    { id: "gemini", name: "Gemini CLI (GEMINI.md)" },
    { id: "cline", name: "Cline (.clinerules)" },
    { id: "roocode", name: "Roo Code (.roomodes, .clinerules)" },
    { id: "continue", name: "Continue.dev (.continue/config.json)" },
    { id: "junie", name: "JetBrains Junie" },
    { id: "amazon-q", name: "Amazon Q Developer (.aws/q/)" },
    { id: "aider", name: "Aider (.aider.conf.yml)" },
    { id: "opencode", name: "OpenCode Interpreter" },
    { id: "zed", name: "Zed AI (.zed/prompts/)" },
    { id: "cody", name: "Sourcegraph Cody (.sourcegraph/cody.json)" },
    { id: "chatgpt", name: "ChatGPT Custom Instructions" },
  ];

  async function refreshSessionToken() {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        if (data.sessionToken) {
          sessionToken = data.sessionToken;
        }
      }
    } catch {
      // ignore
    }
    return sessionToken;
  }

  function authHeaders(extra = {}) {
    const headers = extra instanceof Headers ? new Headers(extra) : { ...extra };
    if (sessionToken) {
      if (headers instanceof Headers) {
        headers.set("X-Specty-Token", sessionToken);
      } else {
        headers["X-Specty-Token"] = sessionToken;
      }
    }
    return headers;
  }

  async function authFetch(url, options = {}) {
    if (!sessionToken) {
      await refreshSessionToken();
    }
    const reqHeaders = authHeaders(options.headers || {});
    let res = await fetch(url, { ...options, headers: reqHeaders });
    if (res.status === 403) {
      sessionToken = null;
      await refreshSessionToken();
      const retryHeaders = authHeaders(options.headers || {});
      res = await fetch(url, { ...options, headers: retryHeaders });
    }
    return res;
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
  const cfgMetricsEnabled = document.getElementById("cfg-metrics-enabled");
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

  // Governance Elements
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
  const cfgGovernanceWait = document.getElementById("cfg-governance-wait");
  const cfgGateCoverage = document.getElementById("cfg-gate-coverage");
  const cfgGateCoverageSlider = document.getElementById("cfg-gate-coverage-slider");
  const coverageValDisplay = document.getElementById("coverage-val-display");
  const cfgBypassEnv = document.getElementById("cfg-bypass-env");
  const cfgBypassTrailer = document.getElementById("cfg-bypass-trailer");
  const cfgRequiredReviewers = document.getElementById("cfg-required-reviewers");
  const cfgRequireCodeowners = document.getElementById("cfg-require-codeowners");

  // Git Elements
  const gitWorkflowGrid = document.getElementById("git-workflow-grid");
  const cfgCommitConvention = document.getElementById("cfg-commit-convention");
  const commitPreviewText = document.getElementById("commit-preview-text");

  // Project & Scopes Elements
  const cfgProjectLayout = document.getElementById("cfg-project-layout");
  const cfgProjectKind = document.getElementById("cfg-project-kind");
  const cfgProjectArchitecture = document.getElementById("cfg-project-architecture");
  const scopesContainer = document.getElementById("scopes-container");
  const btnAddScope = document.getElementById("btn-add-scope");

  // MCP Elements
  const cfgMcpEnabled = document.getElementById("cfg-mcp-enabled");
  const cfgMcpAutoIndex = document.getElementById("cfg-mcp-auto-index");
  const cfgMcpProvider = document.getElementById("cfg-mcp-provider");
  const cfgMcpMaxKb = document.getElementById("cfg-mcp-max-kb");
  const cfgMcpExclude = document.getElementById("cfg-mcp-exclude");
  const mcpPresetsContainer = document.getElementById("mcp-presets-container");
  const customServersGrid = document.getElementById("custom-servers-grid");
  const btnAddCustomMcp = document.getElementById("btn-add-custom-mcp");

  // UI Style Elements
  const cfgUiHasGui = document.getElementById("cfg-ui-has-gui");
  const cfgUiCustomized = document.getElementById("cfg-ui-customized");
  const cfgUiPurpose = document.getElementById("cfg-ui-purpose");
  const cfgUiAudience = document.getElementById("cfg-ui-audience");
  const cfgUiRadius = document.getElementById("cfg-ui-radius");
  const cfgUiEffects = document.getElementById("cfg-ui-effects");
  const cfgUiColorMode = document.getElementById("cfg-ui-color-mode");
  const tokensTableWrapper = document.getElementById("tokens-table-wrapper");
  const btnAddToken = document.getElementById("btn-add-token");

  // AI Tools & Save Elements
  const btnSaveTop = document.getElementById("btn-save-top");
  const btnSaveBottom = document.getElementById("btn-save-bottom");
  const saveStatusMsg = document.getElementById("save-status-msg");
  const btnToolsSelectAll = document.getElementById("btn-tools-select-all");
  const btnToolsDeselectAll = document.getElementById("btn-tools-deselect-all");
  const btnRegenerateTools = document.getElementById("btn-regenerate-tools");

  // Local state for complex editors
  let localScopes = [];
  let localCustomServers = {};
  let localUiTokens = [];
  let selectedWorkflow = "feature-branch";

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
    }, 3500);
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
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });

  // Coverage Slider Sync
  if (cfgGateCoverage && cfgGateCoverageSlider && coverageValDisplay) {
    const updateCoverageDisplay = (val) => {
      const num = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
      cfgGateCoverage.value = num;
      cfgGateCoverageSlider.value = num;
      coverageValDisplay.textContent = `${num}%`;
    };

    cfgGateCoverage.addEventListener("input", (e) => updateCoverageDisplay(e.target.value));
    cfgGateCoverageSlider.addEventListener("input", (e) => updateCoverageDisplay(e.target.value));
  }

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
      if (data.sessionToken) {
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

      // Header
      activeEngineBadgeEl.textContent = `Engine: ${currentConfig.spec_engine || "openspec"}`;

      // Tab 1: Metrics
      if (cfgMetricsEnabled) {
        cfgMetricsEnabled.checked = currentConfig.metrics?.enabled !== false;
      }

      // Tab 2: Governance & Quality Gates
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

      const covMin = currentConfig.governance?.quality_gates?.coverage_min ?? 0;
      if (cfgGateCoverage && cfgGateCoverageSlider && coverageValDisplay) {
        cfgGateCoverage.value = covMin;
        cfgGateCoverageSlider.value = covMin;
        coverageValDisplay.textContent = `${covMin}%`;
      }

      if (cfgGovernanceWait) {
        cfgGovernanceWait.checked = Boolean(currentConfig.governance?.wait !== false);
      }

      cfgBypassEnv.value = currentConfig.governance?.bypass?.env || "SPECTY_BYPASS";
      cfgBypassTrailer.value = currentConfig.governance?.bypass?.trailer || "Specty-Bypass";
      cfgRequiredReviewers.value = (currentConfig.governance?.required_reviewers || []).join("\n");
      cfgRequireCodeowners.checked = Boolean(currentConfig.governance?.require_codeowner_review);

      // Tab 3: Git Workflow & Commits
      selectedWorkflow = currentConfig.git?.workflow || "feature-branch";
      renderGitWorkflows(selectedWorkflow);

      cfgCommitConvention.value = currentConfig.git?.commit_convention || "conventional";
      updateCommitPreview(cfgCommitConvention.value);

      // Tab 4: Project & Scopes
      cfgProjectLayout.value = currentConfig.project?.layout || "single";
      cfgProjectKind.value = currentConfig.project?.kind || "existing";
      cfgProjectArchitecture.value = currentConfig.project?.architecture || "";
      localScopes = JSON.parse(JSON.stringify(currentConfig.scopes || []));
      renderScopesBuilder();

      // Tab 5: MCP & Graph
      cfgMcpEnabled.checked = currentConfig.mcp?.enabled !== false;
      cfgMcpAutoIndex.checked = currentConfig.mcp?.codebase_memory?.auto_index !== false;
      cfgMcpProvider.value = currentConfig.mcp?.graph_provider || "codebase-memory";
      cfgMcpMaxKb.value = currentConfig.mcp?.graph?.max_file_kb || 512;
      cfgMcpExclude.value = (currentConfig.mcp?.graph?.exclude || []).join("\n");

      localCustomServers = JSON.parse(JSON.stringify(currentConfig.mcp?.custom_servers || {}));
      renderMcpPresets();
      renderCustomMcpServers();

      // Tab 6: UI Style
      const uiConf = currentConfig.ui || {};
      cfgUiHasGui.checked = Boolean(uiConf.has_gui);
      cfgUiCustomized.checked = Boolean(uiConf.is_customized);
      cfgUiPurpose.value = uiConf.purpose || "general-purpose";
      cfgUiAudience.value = uiConf.target_audience || "general-public";
      cfgUiRadius.value = uiConf.border_radius || "semi-rounded";
      cfgUiEffects.value = uiConf.visual_effects || "subtle-elevation";
      cfgUiColorMode.value = uiConf.color_mode || "both";
      localUiTokens = JSON.parse(JSON.stringify(uiConf.tokens || []));
      renderUiTokensTable();

      // Tab 7: AI Tools
      renderAiToolsList(currentConfig.tools || []);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  // Render Git Workflow Cards
  function renderGitWorkflows(activeId) {
    if (!gitWorkflowGrid) return;
    gitWorkflowGrid.innerHTML = "";

    GIT_WORKFLOWS_DEF.forEach((wf) => {
      const isSelected = wf.id === activeId;
      const card = document.createElement("div");
      card.className = `workflow-card ${isSelected ? "selected" : ""}`;
      card.dataset.workflow = wf.id;

      const desc = currentLang === "en" ? wf.descEn : wf.descEs;

      card.innerHTML = `
        <div class="workflow-card-header">
          <div class="workflow-radio"></div>
          <span class="workflow-title">${wf.name}</span>
        </div>
        <p class="workflow-desc">${desc}</p>
        <code class="workflow-diagram">${wf.diagram}</code>
      `;

      card.addEventListener("click", () => {
        selectedWorkflow = wf.id;
        document.querySelectorAll(".workflow-card").forEach((c) => {
          c.classList.remove("selected");
        });
        card.classList.add("selected");
      });

      gitWorkflowGrid.appendChild(card);
    });
  }

  // Update Commit Preview
  function updateCommitPreview(convention) {
    if (!commitPreviewText) return;
    commitPreviewText.textContent =
      COMMIT_CONVENTIONS_PREVIEW[convention] || COMMIT_CONVENTIONS_PREVIEW.conventional;
  }

  cfgCommitConvention?.addEventListener("change", (e) => {
    updateCommitPreview(e.target.value);
  });

  // Render Scopes Builder
  function renderScopesBuilder() {
    if (!scopesContainer) return;
    scopesContainer.innerHTML = "";

    if (localScopes.length === 0) {
      scopesContainer.innerHTML = `
        <div class="empty-state-box">
          <p class="text-muted">No hay scopes configurados. Se usará el directorio raíz como scope por defecto.</p>
        </div>
      `;
      return;
    }

    localScopes.forEach((scope, index) => {
      const card = document.createElement("div");
      card.className = "scope-card";

      const frameworksStr = (scope.stack?.frameworks || []).join(", ");
      const verifyEntries = Object.entries(scope.verify || {});

      card.innerHTML = `
        <div class="scope-card-header">
          <span class="scope-index-badge"><i class="ph ph-folder"></i> Scope #${index + 1}</span>
          <button type="button" class="btn-danger btn-sm btn-delete-scope" data-index="${index}" title="Eliminar este scope">
            <i class="ph ph-trash"></i>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Ruta Relativa (path):</label>
            <input type="text" class="form-input scope-path-input" data-index="${index}" value="${escapeHtml(scope.path || ".")}">
          </div>
          <div class="form-group">
            <label>Lenguaje Primario:</label>
            <input type="text" class="form-input scope-lang-input" data-index="${index}" value="${escapeHtml(scope.stack?.language || "typescript")}">
          </div>
          <div class="form-group form-group-full">
            <label>Frameworks y Librerías (separados por coma):</label>
            <input type="text" class="form-input scope-frameworks-input" data-index="${index}" value="${escapeHtml(frameworksStr)}" placeholder="ej. react, nestjs, tailwindcss">
          </div>
          <div class="form-group form-group-full">
            <label>Comandos de Verificación (clave: comando por línea):</label>
            <textarea class="form-textarea scope-verify-input" data-index="${index}" rows="2" placeholder="test: npm test&#10;lint: npm run lint">${verifyEntries.map(([k, v]) => `${k}: ${v}`).join("\n")}</textarea>
          </div>
        </div>
      `;

      scopesContainer.appendChild(card);
    });

    // Delete scope events
    document.querySelectorAll(".btn-delete-scope").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        localScopes.splice(idx, 1);
        renderScopesBuilder();
      });
    });
  }

  btnAddScope?.addEventListener("click", () => {
    localScopes.push({
      path: localScopes.length === 0 ? "." : `apps/module-${localScopes.length + 1}`,
      stack: { language: "typescript", frameworks: [] },
      verify: { test: "npm test" },
    });
    renderScopesBuilder();
  });

  // Render MCP Presets
  function renderMcpPresets() {
    if (!mcpPresetsContainer) return;
    mcpPresetsContainer.innerHTML = "";

    MCP_PRESETS.forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-secondary btn-sm preset-btn";
      btn.innerHTML = `<i class="ph ph-plus-circle"></i> <span>${preset.name}</span>`;
      btn.title = preset.desc;

      btn.addEventListener("click", () => {
        localCustomServers[preset.id] = JSON.parse(JSON.stringify(preset.server));
        renderCustomMcpServers();
        showToast(`Preset "${preset.name}" añadido a servidores personalizados`);
      });

      mcpPresetsContainer.appendChild(btn);
    });
  }

  // Render Custom MCP Servers
  function renderCustomMcpServers() {
    if (!customServersGrid) return;
    customServersGrid.innerHTML = "";

    const serverKeys = Object.keys(localCustomServers);
    if (serverKeys.length === 0) {
      customServersGrid.innerHTML = `
        <div class="empty-state-box">
          <p class="text-muted">No hay servidores MCP personalizados definidos. Añade uno con los presets superiores o crea uno nuevo.</p>
        </div>
      `;
      return;
    }

    serverKeys.forEach((key) => {
      const s = localCustomServers[key];
      const card = document.createElement("div");
      card.className = "server-card";

      const rolesStr = (s.roles || []).join(", ") || "General";
      const argsStr = (s.args || []).join(" ");

      card.innerHTML = `
        <div class="server-card-header">
          <div class="server-title-group">
            <span class="server-name"><i class="ph ph-plugs"></i> ${escapeHtml(key)}</span>
            <span class="server-badge">${escapeHtml(s.transport || "stdio")}</span>
          </div>
          <button type="button" class="btn-danger btn-sm btn-delete-server" data-key="${escapeHtml(key)}" title="Eliminar servidor">
            <i class="ph ph-trash"></i>
          </button>
        </div>
        <p class="server-desc">${escapeHtml(s.description || "Servidor MCP personalizado")}</p>
        <div class="server-details">
          <div><strong>Comando:</strong> <code>${escapeHtml(s.command)} ${escapeHtml(argsStr)}</code></div>
          <div><strong>Roles autorizados:</strong> <span class="text-muted">${escapeHtml(rolesStr)}</span></div>
        </div>
      `;

      customServersGrid.appendChild(card);
    });

    document.querySelectorAll(".btn-delete-server").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const key = e.currentTarget.dataset.key;
        delete localCustomServers[key];
        renderCustomMcpServers();
      });
    });
  }

  btnAddCustomMcp?.addEventListener("click", () => {
    const serverName = prompt(
      "Introduce el identificador del nuevo servidor MCP (ej. mi-bd-interna):",
    );
    if (!serverName) return;
    const cleanName = serverName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-");
    if (localCustomServers[cleanName]) {
      alert("Ya existe un servidor con ese nombre");
      return;
    }
    const command = prompt("Comando ejecutable (ej. npx, node, python):", "npx");
    if (!command) return;

    localCustomServers[cleanName] = {
      command: command.trim(),
      args: [],
      transport: "stdio",
      description: "Servidor MCP personalizado creado desde UI",
      roles: ["orchestrator"],
    };
    renderCustomMcpServers();
    showToast(`Servidor "${cleanName}" añadido`);
  });

  // Render UI Tokens Table
  function renderUiTokensTable() {
    if (!tokensTableWrapper) return;
    tokensTableWrapper.innerHTML = "";

    if (localUiTokens.length === 0) {
      tokensTableWrapper.innerHTML = `
        <div class="empty-state-box">
          <p class="text-muted">No hay design tokens personalizados definidos. Puedes añadir variables de color o tipografía.</p>
        </div>
      `;
      return;
    }

    const table = document.createElement("table");
    table.className = "data-table tokens-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Nombre del Token</th>
          <th>Valor CSS</th>
          <th>Previsualización</th>
          <th style="width: 50px;"></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    localUiTokens.forEach((token, idx) => {
      const tr = document.createElement("tr");

      const isColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(token.value?.trim());
      const previewHtml = isColor
        ? `<span class="token-color-preview" style="background-color: ${token.value};"></span>`
        : '<span class="text-muted">-</span>';

      tr.innerHTML = `
        <td>
          <input type="text" class="form-input token-name-input" data-index="${idx}" value="${escapeHtml(token.name || "")}" placeholder="--nombre-token">
        </td>
        <td>
          <input type="text" class="form-input token-val-input" data-index="${idx}" value="${escapeHtml(token.value || "")}" placeholder="#ffffff o 16px">
        </td>
        <td>${previewHtml}</td>
        <td>
          <button type="button" class="btn-danger btn-sm btn-delete-token" data-index="${idx}" title="Eliminar token">
            <i class="ph ph-trash"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    tokensTableWrapper.appendChild(table);

    document.querySelectorAll(".btn-delete-token").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        localUiTokens.splice(idx, 1);
        renderUiTokensTable();
      });
    });

    document.querySelectorAll(".token-name-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (localUiTokens[idx]) localUiTokens[idx].name = e.target.value.trim();
      });
    });

    document.querySelectorAll(".token-val-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (localUiTokens[idx]) localUiTokens[idx].value = e.target.value.trim();
      });
    });
  }

  btnAddToken?.addEventListener("click", () => {
    localUiTokens.push({ name: `--token-${localUiTokens.length + 1}`, value: "#3b82f6" });
    renderUiTokensTable();
  });

  // Render AI tools checkboxes (all 17 tools)
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

  // Tools Select All / Deselect All
  btnToolsSelectAll?.addEventListener("click", () => {
    document.querySelectorAll(".tool-cb").forEach((cb) => {
      cb.checked = true;
    });
  });

  btnToolsDeselectAll?.addEventListener("click", () => {
    document.querySelectorAll(".tool-cb").forEach((cb) => {
      cb.checked = false;
    });
  });

  // Save Config to Backend
  async function saveConfigData() {
    if (!currentConfig) return;

    try {
      btnSaveTop.disabled = true;
      btnSaveBottom.disabled = true;
      saveStatusMsg.textContent = t("saving");
      document.querySelectorAll(".field-error").forEach((el) => {
        el.classList.remove("field-error");
      });

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

      const reviewers = cfgRequiredReviewers.value
        .split(/[\n,]+/)
        .map((l) => l.trim())
        .filter(Boolean);

      const mcpExclude = cfgMcpExclude.value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // Collect updated scopes from DOM
      const collectedScopes = localScopes.map((scope, idx) => {
        const pathInput = document.querySelector(`.scope-path-input[data-index="${idx}"]`);
        const langInput = document.querySelector(`.scope-lang-input[data-index="${idx}"]`);
        const frameworksInput = document.querySelector(
          `.scope-frameworks-input[data-index="${idx}"]`,
        );
        const verifyInput = document.querySelector(`.scope-verify-input[data-index="${idx}"]`);

        const p = pathInput ? pathInput.value.trim() : scope.path;
        const lang = langInput ? langInput.value.trim() : scope.stack?.language;
        const frameworks = frameworksInput
          ? frameworksInput.value
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : scope.stack?.frameworks || [];

        const verifyRecord = {};
        if (verifyInput) {
          verifyInput.value.split("\n").forEach((line) => {
            const parts = line.split(":");
            if (parts.length >= 2) {
              const k = parts[0].trim();
              const v = parts.slice(1).join(":").trim();
              if (k) verifyRecord[k] = v;
            }
          });
        }

        return {
          path: p || ".",
          stack: { language: lang || "typescript", frameworks },
          verify: Object.keys(verifyRecord).length > 0 ? verifyRecord : scope.verify || {},
        };
      });

      // Construct Complete 100% Config Object
      const updatedConfig = {
        version: currentConfig.version || 1,
        language: cfgLanguage.value,
        spec_engine: cfgSpecEngine.value,
        project: {
          kind: cfgProjectKind.value,
          layout: cfgProjectLayout.value,
          architecture: cfgProjectArchitecture.value.trim() || undefined,
        },
        scopes:
          collectedScopes.length > 0
            ? collectedScopes
            : [{ path: ".", stack: { language: "typescript", frameworks: [] }, verify: {} }],
        tools: selectedTools.length > 0 ? selectedTools : [...currentConfig.tools],
        governance: {
          ci: cfgCiProvider.value,
          approval_method: cfgApprovalMethod.value,
          hooks: cfgGitHooks.checked,
          source_paths: sourcePaths.length > 0 ? sourcePaths : ["src/**"],
          exempt_paths:
            exemptPaths.length > 0 ? exemptPaths : ["**/*.md", "openspec/**", "docs/**"],
          bypass: {
            env: cfgBypassEnv.value.trim() || "SPECTY_BYPASS",
            trailer: cfgBypassTrailer.value.trim() || "Specty-Bypass",
          },
          quality_gates: {
            lint: cfgGateLint.checked,
            test: cfgGateTest.checked,
            static: cfgGateStatic.checked,
            coverage_min: parseInt(cfgGateCoverage.value, 10) || 0,
          },
          required_reviewers: reviewers,
          require_codeowner_review: cfgRequireCodeowners.checked,
          wait: cfgGovernanceWait ? cfgGovernanceWait.checked : true,
        },
        git: {
          workflow: selectedWorkflow || "feature-branch",
          commit_convention: cfgCommitConvention.value || "conventional",
        },
        mcp: {
          enabled: cfgMcpEnabled.checked,
          graph_provider: cfgMcpProvider.value,
          codebase_memory: {
            command: currentConfig.mcp?.codebase_memory?.command || "codebase-memory-mcp",
            args: currentConfig.mcp?.codebase_memory?.args || [],
            auto_index: cfgMcpAutoIndex.checked,
          },
          graph: {
            max_file_kb: parseInt(cfgMcpMaxKb.value, 10) || 512,
            exclude: mcpExclude,
          },
          custom_servers: localCustomServers,
        },
        metrics: {
          enabled: cfgMetricsEnabled.checked,
        },
        ui: {
          has_gui: cfgUiHasGui.checked,
          is_customized: cfgUiCustomized.checked,
          purpose: cfgUiPurpose.value,
          target_audience: cfgUiAudience.value,
          border_radius: cfgUiRadius.value,
          visual_effects: cfgUiEffects.value,
          color_mode: cfgUiColorMode.value,
          detected_libraries: currentConfig.ui?.detected_libraries || [],
          tokens: localUiTokens.filter((t) => t.name?.trim()),
        },
      };

      const res = await authFetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.issues && Array.isArray(errJson.issues)) {
          errJson.issues.forEach((issue) => {
            console.error("Zod issue:", issue);
          });
          throw new Error(errJson.error || "Validación fallida en los parámetros de configuración");
        }
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

  function renderSpecsTable(specs = []) {
    if (!specsTableBody) return;
    specsTableBody.innerHTML = "";

    const filter = (searchSpecsInput?.value || "").toLowerCase().trim();

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

  searchSpecsInput?.addEventListener("input", () => {
    renderSpecsTable(allSpecs);
  });

  // API Call: Export Report
  async function handleExport(format) {
    try {
      showToast(`Generando reporte ${format.toUpperCase()}...`);
      const res = await authFetch("/api/metrics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  btnExportHtml?.addEventListener("click", () => handleExport("html"));
  btnExportMd?.addEventListener("click", () => handleExport("markdown"));

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
  btnRegenerateTools?.addEventListener("click", async () => {
    try {
      btnRegenerateTools.disabled = true;
      btnRegenerateTools.innerHTML = `<i class="ph ph-spinner"></i> <span>${t("syncing")}</span>`;
      const res = await authFetch("/api/infrastructure/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // Back to Dashboard button
  const btnBackDashboard = document.getElementById("btn-back-dashboard");
  btnBackDashboard?.addEventListener("click", () => {
    window.location.assign("/");
  });

  // Save buttons events
  btnSaveTop?.addEventListener("click", saveConfigData);
  btnSaveBottom?.addEventListener("click", saveConfigData);

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
