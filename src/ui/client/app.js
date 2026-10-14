// Specty UI - Client SPA Controller
(() => {
  let sessionToken = window.__SPECTY_TOKEN__ || null;
  let currentChangeId = null;
  let activeChangeData = null;
  let currentDiffScope = "all";
  let activeDiffFiles = [];
  let selectedDiffIndex = 0;
  let sseSource = null;

  // i18n Dictionary
  const I18N_LOCALES = {
    es: {
      liveSync: "Live Sync",
      changeLabel: "Change:",
      loadingChanges: "Cargando changes...",
      noChanges: "No hay changes activos",
      statusDraft: "Borrador",
      statusApproved: "Aprobado",
      openInIde: "Abrir en IDE",
      approveSpec: "Aprobar Plan",
      approvedSpec: "Plan Aprobado",
      tabProposal: "Propuesta",
      tabTasks: "Lista de Tareas",
      tabDiffs: "Diffs de Código & Specs",
      tabReviews: "Ajustes & Feedback",
      commentSection: "Ajustar Sección",
      tasksTitle: "Lista de Tareas",
      tasksDesc: "Checklist interactiva sincronizada con tasks.md. Marca tareas con un clic.",
      tasksCompletedOf: "tareas completadas",
      noTasksDefined: "No hay tareas definidas en tasks.md",
      diffsTitle: "Diferencias de Código y Especificaciones",
      diffsDesc:
        "Inspecciona los cambios propuestos en el repositorio y los deltas de especificaciones.",
      scopeAll: "Todos",
      scopeStaged: "Staged",
      scopeUnstaged: "Unstaged",
      modifiedFiles: "Archivos Modificados",
      diffEmpty: "Selecciona un archivo modificado para inspeccionar el diff.",
      openFile: "Abrir archivo",
      reviewsTitle: "Historial de Ajustes",
      reviewsDesc: "Registro de auditoría (log) de todos los ajustes realizados al plan.",
      comment: "Ajustar",
      changeRequest: "Solicitud de Cambio",
      modalReviewTitle: "Agregar Ajuste a Sección",
      modalReviewSection: "Sección:",
      modalReviewRefText: "Texto Referenciado (Opcional):",
      modalReviewType: "Tipo de Observación:",
      typeComment: "Ajuste / Pregunta",
      typeChangeRequest: "Solicitud de Cambio",
      modalReviewCommentLabel: "Ajuste / Observación:",
      modalReviewSuggestionLabel: "Sugerencia de Reemplazo Textual (Opcional):",
      btnCancel: "Cancelar",
      btnSaveComment: "Guardar Ajuste",
      modalApproveTitle: "Aprobar Especificación",
      modalApproveIntro: "Estás a punto de aprobar el change",
      modalApproveUser: "Aprobado por:",
      modalApproveNotes: "Notas de Aprobación (Opcional):",
      modalApproveHint1: "Se calculará el hash criptográfico SHA-256 de la especificación.",
      modalApproveHint2: "Se registrará en .specty/audit/approvals.jsonl para auditoría y CI.",
      btnConfirmApprove: "Confirmar y Firmar Aprobación",
      signing: "Firmando...",
      resolve: "Resolver",
      resolved: "Resuelto",
      applied: "Aplicado",
      pending: "Pendiente",
      copyCode: "Copiar",
      codeCopied: "¡Copiado!",
      openInIdeTooltip: "Abrir archivo en el IDE",
      emptyProposal: "No se encontró contenido en proposal.md",
      emptyReviews: "No hay ajustes registrados en el historial.",
      alertFillComment: "Por favor escribe tu ajuste u observación.",
      alertApproveError: "Error al aprobar:",
      badgeProposal: "Propuesta Principal",
      badgeMotivation: "Motivación & Por qué",
      badgeCapabilities: "Capacidades",
      badgeNewCapabilities: "Nueva Capacidad",
      badgeModifiedCapabilities: "Capacidad Modificada",
      badgeImpact: "Impacto Arquitectónico",
      badgeRisks: "Riesgos & Seguridad",
      badgeGeneral: "Especificación",
      updatePlanBtn: "Actualizar Plan",
      updatePlanSuccess: "Plan actualizado con éxito según los ajustes.",
      noCommentsToUpdate: "No hay ajustes pendientes en las secciones del plan.",
      emptySectionText: "Sin contenido especificado para esta sección",
      commentPlaceholder: "Escribe el ajuste para esta sección...",
      addAdjustment: "Ajuste para:",
      proposedAdjustment: "Ajuste Propuesto",
      commentSavedToast: "Ajuste guardado para esta sección",
      tasksReadonly: "Solo lectura",
      settingsLanguage: "Idioma",
      quickWaitLabel: "Espera Reactiva (wait)",
      openSettings: "Configuración & Métricas",
      waitEnabledToast: "Espera reactiva activada para el asistente",
      waitDisabledToast: "Espera reactiva desactivada",
      stepDraft: "Borrador",
      stepApproved: "Aprobado",
      stepInProgress: "En Progreso",
      stepVerifying: "Verificando",
      stepDone: "Completado",
      stepArchived: "Archivado",
      btnStartImpl: "Iniciar Desarrollo",
      btnRunVerify: "Ejecutar Verificación",
      btnCompleteDone: "Aprobar y Finalizar (Done)",
      btnArchiveFeature: "Cerrar y Archivar Feature",
      archivedFeature: "Feature Archivado (Solo Lectura)",
      tabVerify: "Verificación",
      verifyTitle: "Verificación Técnica & Quality Gates",
      verifyDesc:
        "Resultados de ejecución de comandos de stack, linters, pruebas unitarias y aceptación.",
      verifyPendingTitle: "Sin verificación reciente",
      verifyPendingDesc:
        "Ejecuta la verificación técnica para evaluar las suites de pruebas y compuertas de calidad.",
      verifyPassedTitle: "Comprobaciones superadas con éxito",
      verifyFailedTitle: "Falla en comprobaciones de verificación",
      allChecksPassed: "Todas las comprobaciones pasaron limpiamente",
      someChecksFailed: "Se encontraron fallas o advertencias en las pruebas.",
      metricStack: "Stack Checks",
      metricTasks: "Task Checks",
      stackChecksTitle: "Comandos de Stack (Build, Linters, Tests)",
      taskChecksTitle: "Comprobaciones de Tareas Específicas",
      noStackResults: "No hay resultados de stack disponibles.",
      noTaskResults: "No hay verificaciones de tareas configuradas.",
      verifyingSpinner: "Ejecutando verificación...",
      verificationPassedToast: "Verificación superada exitosamente.",
      verificationFailedToast: "La verificación ha fallado. Revisa los detalles.",
      modalDoneTitle: "Completar y Aprobar Feature",
      modalDoneIntro: "Estás a punto de marcar como completado el change",
      precondTasks: "Todas las tareas en tasks.md completadas",
      precondVerify: "Verificación técnica superada en HEAD",
      precondScope: "Archivos modificados dentro del alcance gobernado",
      chkDoneForce: "Forzar finalización aunque existan advertencias (--force)",
      btnConfirmDone: "Confirmar y Marcar como Done",
      doneSuccessToast: "Feature completado con éxito.",
      modalArchiveTitle: "Cerrar y Archivar Feature",
      modalArchiveIntro: "Estás a punto de archivar formalmente",
      archiveWarningText:
        "El directorio se moverá a openspec/changes/archive/ y se actualizará el índice del grafo de código MCP. La especificación quedará en modo histórico de solo lectura.",
      chkArchiveForce: "Forzar archivado sin exigir estado previo 'done' (--force)",
      btnConfirmArchive: "Confirmar y Archivar",
      archiveSuccessToast: "Feature archivado exitosamente.",
      startImplToast: "Feature transicionado a 'in-progress'. Asistente habilitado para codificar.",
      btnPendingTasks: "Tareas Pendientes",
      pendingTasksDesc:
        "Existen tareas incompletas en tasks.md. El asistente debe culminar el desarrollo antes de verificar o finalizar.",
    },
    en: {
      liveSync: "Live Sync",
      changeLabel: "Change:",
      loadingChanges: "Loading changes...",
      noChanges: "No active changes",
      statusDraft: "Draft",
      statusApproved: "Approved",
      openInIde: "Open in IDE",
      approveSpec: "Approve Plan",
      approvedSpec: "Plan Approved",
      tabProposal: "Proposal",
      tabTasks: "Task List",
      tabDiffs: "Code & Spec Diffs",
      tabReviews: "Adjustments & Feedback",
      commentSection: "Adjust Section",
      tasksTitle: "Task List",
      tasksDesc: "Interactive checklist synced with tasks.md. Check items with one click.",
      tasksCompletedOf: "tasks completed",
      noTasksDefined: "No tasks defined in tasks.md",
      diffsTitle: "Code and Specification Diffs",
      diffsDesc: "Inspect proposed repository changes and specification deltas.",
      scopeAll: "All",
      scopeStaged: "Staged",
      scopeUnstaged: "Unstaged",
      modifiedFiles: "Modified Files",
      diffEmpty: "Select a modified file to inspect its diff.",
      openFile: "Open file",
      reviewsTitle: "Adjustment Log",
      reviewsDesc: "Audit log of all adjustments made to the plan.",
      comment: "Adjust",
      changeRequest: "Change Request",
      modalReviewTitle: "Add Section Adjustment",
      modalReviewSection: "Section:",
      modalReviewRefText: "Referenced Text (Optional):",
      modalReviewType: "Feedback Type:",
      typeComment: "Adjustment / Question",
      typeChangeRequest: "Change Request",
      modalReviewCommentLabel: "Adjustment / Feedback:",
      modalReviewSuggestionLabel: "Text Replacement Suggestion (Optional):",
      btnCancel: "Cancel",
      btnSaveComment: "Save Adjustment",
      modalApproveTitle: "Approve Specification",
      modalApproveIntro: "You are about to approve change",
      modalApproveUser: "Approved by:",
      modalApproveNotes: "Approval Notes (Optional):",
      modalApproveHint1: "A SHA-256 cryptographic hash of the spec will be computed.",
      modalApproveHint2: "It will be logged to .specty/audit/approvals.jsonl for audit and CI.",
      btnConfirmApprove: "Confirm & Sign Approval",
      signing: "Signing...",
      resolve: "Resolve",
      resolved: "Resolved",
      applied: "Applied",
      pending: "Pending",
      copyCode: "Copy",
      codeCopied: "Copied!",
      openInIdeTooltip: "Open file in IDE",
      emptyProposal: "No content found in proposal.md",
      emptyReviews: "No adjustments recorded in the history log.",
      alertFillComment: "Please write your adjustment or feedback.",
      alertApproveError: "Error approving:",
      badgeProposal: "Core Proposal",
      badgeMotivation: "Motivation & Why",
      badgeCapabilities: "Capabilities",
      badgeNewCapabilities: "New Capability",
      badgeModifiedCapabilities: "Modified Capability",
      badgeImpact: "Architectural Impact",
      badgeRisks: "Risks & Security",
      badgeGeneral: "Specification",
      updatePlanBtn: "Update Plan",
      updatePlanSuccess: "Plan successfully updated with adjustments.",
      noCommentsToUpdate: "No pending adjustments in the plan sections.",
      emptySectionText: "No content specified for this section",
      commentPlaceholder: "Write your adjustment for this section...",
      addAdjustment: "Adjustment for:",
      proposedAdjustment: "Proposed Adjustment",
      commentSavedToast: "Adjustment saved for this section",
      tasksReadonly: "Read-only",
      settingsLanguage: "Language",
      quickWaitLabel: "Reactive Wait (wait)",
      openSettings: "Settings & Global Metrics",
      waitEnabledToast: "Reactive wait enabled for AI assistant",
      waitDisabledToast: "Reactive wait disabled",
      stepDraft: "Draft",
      stepApproved: "Approved",
      stepInProgress: "In Progress",
      stepVerifying: "Verifying",
      stepDone: "Done",
      stepArchived: "Archived",
      btnStartImpl: "Start Implementation",
      btnRunVerify: "Run Verification",
      btnCompleteDone: "Approve & Complete Feature",
      btnArchiveFeature: "Archive Feature",
      archivedFeature: "Archived Feature (Read-only)",
      tabVerify: "Verification",
      verifyTitle: "Technical Verification & Quality Gates",
      verifyDesc: "Execution results of stack commands, linters, unit tests, and acceptance.",
      verifyPendingTitle: "No recent execution",
      verifyPendingDesc: "Run technical verification to evaluate test suites and quality gates.",
      verifyPassedTitle: "All checks passed successfully",
      verifyFailedTitle: "Verification checks failed",
      allChecksPassed: "All checks passed cleanly",
      someChecksFailed: "Failures or warnings were found during verification.",
      metricStack: "Stack Checks",
      metricTasks: "Task Checks",
      stackChecksTitle: "Stack Commands (Build, Linters, Tests)",
      taskChecksTitle: "Task Verification Commands",
      noStackResults: "No stack results available.",
      noTaskResults: "No task verifications configured.",
      verifyingSpinner: "Running verification...",
      verificationPassedToast: "Verification passed successfully.",
      verificationFailedToast: "Verification failed. Inspect details.",
      modalDoneTitle: "Complete & Approve Feature",
      modalDoneIntro: "You are about to mark change as completed",
      precondTasks: "All tasks in tasks.md completed",
      precondVerify: "Technical verification passed on HEAD",
      precondScope: "Modified files within governed scope",
      chkDoneForce: "Force completion despite warnings (--force)",
      btnConfirmDone: "Confirm & Mark as Done",
      doneSuccessToast: "Feature marked as done successfully.",
      modalArchiveTitle: "Close & Archive Feature",
      modalArchiveIntro: "You are about to formally archive",
      archiveWarningText:
        "The directory will be moved to openspec/changes/archive/ and codebase graph index will be updated. The spec will become historical read-only.",
      chkArchiveForce: "Force archiving without requiring 'done' state (--force)",
      btnConfirmArchive: "Confirm & Archive",
      archiveSuccessToast: "Feature archived successfully.",
      startImplToast: "Feature transitioned to 'in-progress'. Assistant enabled to code.",
      btnPendingTasks: "Pending Tasks",
      pendingTasksDesc:
        "There are incomplete tasks in tasks.md. The assistant must complete development before verifying or completing.",
    },
  };

  const SECTION_TITLE_TRANSLATIONS = {
    "what changes": { es: "Qué Cambia", en: "What Changes" },
    "what change": { es: "Qué Cambia", en: "What Changes" },
    "que cambia": { es: "Qué Cambia", en: "What Changes" },
    "que cambios": { es: "Qué Cambios", en: "What Changes" },
    capabilities: { es: "Capacidades", en: "Capabilities" },
    "new capabilities": { es: "Nuevas Capacidades", en: "New Capabilities" },
    "modified capabilities": { es: "Capacidades Modificadas", en: "Modified Capabilities" },
    impact: { es: "Impacto Arquitectónico", en: "Architectural Impact" },
    "architectural impact": { es: "Impacto Arquitectónico", en: "Architectural Impact" },
    why: { es: "Motivación y Contexto", en: "Motivation & Context" },
    motivation: { es: "Motivación y Contexto", en: "Motivation & Context" },
    risks: { es: "Riesgos y Mitigación", en: "Risks & Mitigations" },
    "risks & mitigations": { es: "Riesgos y Mitigación", en: "Risks & Mitigations" },
    overview: { es: "Resumen de la Propuesta", en: "Proposal Overview" },
    "problem statement": { es: "Declaración del Problema", en: "Problem Statement" },
    "proposed changes": { es: "Cambios Propuestos", en: "Proposed Changes" },
    "trade-offs": { es: "Compromisos y Decisiones", en: "Trade-offs" },
    "open questions": { es: "Preguntas Abiertas", en: "Open Questions" },
  };

  function localizeSectionTitle(title, lang) {
    if (!title) return "";
    const trimmed = title.trim();
    const cleaned = trimmed
      .replace(/^#+\s*/, "")
      .replace(/[?¿!¡:.]/g, "")
      .trim()
      .toLowerCase();

    const proposalMatch = trimmed.match(/^(?:proposal|propuesta|change proposal):\s*(.+)$/i);
    if (proposalMatch) {
      const prefix = lang === "es" ? "Propuesta:" : "Proposal:";
      return `${prefix} ${proposalMatch[1]}`;
    }

    if (SECTION_TITLE_TRANSLATIONS[cleaned]) {
      return SECTION_TITLE_TRANSLATIONS[cleaned][lang] || SECTION_TITLE_TRANSLATIONS[cleaned].es;
    }

    for (const [key, trans] of Object.entries(SECTION_TITLE_TRANSLATIONS)) {
      if (cleaned === key || cleaned.includes(key)) {
        return trans[lang] || trans.es;
      }
    }

    return trimmed;
  }

  let toastTimer = null;
  function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    toast.textContent = message;
    toast.className = `toast ${isError ? "toast-error" : "toast-success"}`;
    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 3200);
  }

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

    if (activeChangeData) {
      renderChangeView(activeChangeData);
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

  async function refreshSessionToken() {
    try {
      const statusRes = await fetch("/api/status").then((r) => r.json());
      if (statusRes.sessionToken) {
        sessionToken = statusRes.sessionToken;
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
  const changeSelectEl = document.getElementById("change-select");
  const btnSettingsToggle = document.getElementById("btn-settings-toggle");
  const settingsDropdown = document.getElementById("settings-dropdown");
  const quickToggleWait = document.getElementById("quick-toggle-wait");
  const approvalBadgeEl = document.getElementById("approval-status-badge");
  const reviewsCounterEl = document.getElementById("reviews-counter");
  const specEngineTagEl = document.getElementById("spec-engine-tag");
  const changeTitleEl = document.getElementById("change-title");
  const changeIdSubEl = document.getElementById("change-id-sub");

  // Tabs
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const tabTasksBadge = document.getElementById("tab-tasks-badge");
  const tabDiffBadge = document.getElementById("tab-diff-badge");
  const tabReviewsBadge = document.getElementById("tab-reviews-badge");

  // Proposal Elements
  const proposalSectionsContainer = document.getElementById("proposal-sections-container");

  // Tasks Elements
  const tasksContainer = document.getElementById("tasks-container");
  const tasksProgressText = document.getElementById("tasks-progress-text");
  const tasksProgressPercent = document.getElementById("tasks-progress-percent");
  const tasksProgressBar = document.getElementById("tasks-progress-bar");

  // Diff Elements
  const diffScopeBtns = document.querySelectorAll(".scope-btn");
  const diffFilesList = document.getElementById("diff-files-list");
  const diffFileCount = document.getElementById("diff-file-count");
  const diffEmptyState = document.getElementById("diff-empty-state");
  const diffContentWrapper = document.getElementById("diff-content-wrapper");
  const diffCurrentFileName = document.getElementById("diff-current-file-name");
  const diffCodePre = document.getElementById("diff-code-pre");
  const btnOpenDiffFile = document.getElementById("btn-open-diff-file");

  // Reviews Elements
  const reviewsListContainer = document.getElementById("reviews-list-container");

  // Modals
  const modalReview = document.getElementById("modal-review");
  const modalReviewClose = document.getElementById("modal-review-close");
  const btnCancelReview = document.getElementById("btn-cancel-review");
  const btnSaveReview = document.getElementById("btn-save-review");
  const reviewSectionName = document.getElementById("review-section-name");
  const reviewSectionId = document.getElementById("review-section-id");
  const reviewSelectedText = document.getElementById("review-selected-text");
  const reviewCommentText = document.getElementById("review-comment-text");
  const reviewSuggestionText = document.getElementById("review-suggestion-text");

  const modalApprove = document.getElementById("modal-approve");
  const modalApproveClose = document.getElementById("modal-approve-close");
  const btnCancelApprove = document.getElementById("btn-cancel-approve");
  const btnConfirmApprove = document.getElementById("btn-confirm-approve");
  const approveUserInput = document.getElementById("approve-user-input");
  const approveNotesInput = document.getElementById("approve-notes-input");

  // Top Action Buttons
  const btnApprove = document.getElementById("btn-approve");
  const btnOpenIde = document.getElementById("btn-open-ide");
  const btnQuickReviews = document.getElementById("btn-quick-reviews");
  const btnAddGeneralReview = document.getElementById("btn-add-general-review");

  // Lifecycle Elements
  const modalDone = document.getElementById("modal-done");
  const modalDoneClose = document.getElementById("modal-done-close");
  const btnCancelDone = document.getElementById("btn-cancel-done");
  const btnConfirmDone = document.getElementById("btn-confirm-done");
  const modalDoneChangeId = document.getElementById("modal-done-change-id");
  const chkDoneForce = document.getElementById("chk-done-force");

  const modalArchive = document.getElementById("modal-archive");
  const modalArchiveClose = document.getElementById("modal-archive-close");
  const btnCancelArchive = document.getElementById("btn-cancel-archive");
  const btnConfirmArchive = document.getElementById("btn-confirm-archive");
  const modalArchiveChangeId = document.getElementById("modal-archive-change-id");
  const chkArchiveForce = document.getElementById("chk-archive-force");

  const btnRunVerify = document.getElementById("btn-run-verify");
  const tabVerifyBadge = document.getElementById("tab-verify-badge");

  // Initialize
  async function init() {
    setupTabSwitching();
    setupEventListeners();
    setupDelegatedEvents();
    setupSse();
    setLanguage(currentLang);
    await loadInitialData();
  }

  // SSE Setup
  function setupSse() {
    try {
      sseSource = new EventSource("/api/events");
      sseSource.addEventListener("fs:change", async () => {
        await refreshChangesList(true);
      });
      sseSource.addEventListener("task:toggled", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("change:approved", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("change:status_changed", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("change:verified", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("change:archived", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("review:added", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("review:updated", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("review:deleted", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("config:updated", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (quickToggleWait && payload.config?.governance) {
            quickToggleWait.checked = Boolean(payload.config.governance.wait !== false);
          }
        } catch {}
      });
    } catch (e) {
      console.warn("SSE connection error", e);
    }
  }

  // Load Status and Changes
  async function loadInitialData() {
    try {
      const statusRes = await fetch("/api/status").then((r) => r.json());
      if (statusRes.sessionToken) {
        sessionToken = statusRes.sessionToken;
      }
      if (statusRes.branch) {
        branchNameEl.textContent = statusRes.branch;
      }
      if (statusRes.config?.spec_engine) {
        specEngineTagEl.textContent = `Engine: ${statusRes.config.spec_engine}`;
      }
      if (statusRes.gitUser?.name) {
        approveUserInput.value = statusRes.gitUser.name;
      }
      if (statusRes.config?.language && !localStorage.getItem("specty_lang")) {
        setLanguage(statusRes.config.language);
      }
      if (quickToggleWait && statusRes.config?.governance) {
        quickToggleWait.checked = Boolean(statusRes.config.governance.wait !== false);
      }

      await refreshChangesList(false);
    } catch (err) {
      console.error("Error loading initial data", err);
    }
  }

  async function refreshChangesList(autoSelectNew = true) {
    try {
      const changesRes = await fetch("/api/changes").then((r) => r.json());
      const changes = changesRes.changes || [];
      const prevIds = changeSelectEl
        ? Array.from(changeSelectEl.options)
            .map((o) => o.value)
            .filter(Boolean)
        : [];

      if (changeSelectEl) {
        changeSelectEl.innerHTML = "";
      }
      if (changes.length === 0) {
        if (changeSelectEl) {
          changeSelectEl.innerHTML = `<option value="">${t("noChanges")}</option>`;
        }
        currentChangeId = null;
        return;
      }

      if (changeSelectEl) {
        changes.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = `${c.id} - ${c.title || "Sin título"} (${c.status})`;
          changeSelectEl.appendChild(opt);
        });
      }

      // Si se creó un spec nuevo que no estaba en el dropdown, cambiar automáticamente a él
      const newChange = changes.find((c) => !prevIds.includes(c.id));
      if (autoSelectNew && newChange) {
        if (changeSelectEl) changeSelectEl.value = newChange.id;
        await loadChange(newChange.id);
        return;
      }

      // Si ya hay un change seleccionado y sigue existiendo, refrescarlo
      if (currentChangeId && changes.some((c) => c.id === currentChangeId)) {
        if (changeSelectEl) changeSelectEl.value = currentChangeId;
        await loadChange(currentChangeId, true);
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const paramChange = urlParams.get("change");
        const targetId =
          paramChange && changes.some((c) => c.id === paramChange) ? paramChange : changes[0].id;
        if (changeSelectEl) changeSelectEl.value = targetId;
        await loadChange(targetId);
      }
    } catch (err) {
      console.error("Error refreshing changes list", err);
    }
  }

  // Load Change Detail
  async function loadChange(changeId, isBackgroundSync = false) {
    try {
      currentChangeId = changeId;
      const res = await fetch(`/api/changes/${encodeURIComponent(changeId)}`);
      if (!res.ok) return;

      activeChangeData = await res.json();
      renderChangeView(activeChangeData);

      if (!isBackgroundSync) {
        await loadDiffs(changeId, currentDiffScope);
      }
    } catch (err) {
      console.error(`Error loading change ${changeId}`, err);
    }
  }

  // Render Whole View
  function renderChangeView(data) {
    changeTitleEl.textContent = data.title || data.id;
    changeIdSubEl.textContent = `openspec/changes/${data.id}`;

    // Lifecycle Stepper
    updateLifecycleStepper(data.status);

    // Approval Badge & Lifecycle Action Button
    updateApprovalBadge(data.approval, data.status, data.reviews || [], data);

    // Reviews Counter
    const activeReviews = (data.reviews || []).filter((r) => !r.resolved);
    reviewsCounterEl.textContent = activeReviews.length;
    tabReviewsBadge.textContent = activeReviews.length;

    // Tasks Badge & Progress
    tabTasksBadge.textContent = `${data.tasksData.completed}/${data.tasksData.total}`;
    renderTasks(data.tasksData);

    // Render Proposal Sections
    renderProposalSections(data.proposalSections, data.reviews || []);

    // Render Reviews Tab
    renderReviewsTab(data.reviews || []);

    // Render Technical Verification Tab
    renderVerificationReport(data.verification);
  }

  const LIFECYCLE_STAGES = ["draft", "approved", "in-progress", "verifying", "done", "archived"];

  function updateLifecycleStepper(status) {
    const normStatus = (status || "draft").toLowerCase();
    const currentIndex = LIFECYCLE_STAGES.indexOf(normStatus);
    const activeIndex = currentIndex !== -1 ? currentIndex : 0;

    LIFECYCLE_STAGES.forEach((stage, idx) => {
      const node = document.getElementById(`step-node-${stage}`);
      if (!node) return;

      node.classList.remove("active", "completed");
      if (idx < activeIndex) {
        node.classList.add("completed");
      } else if (idx === activeIndex) {
        node.classList.add("active");
      }
    });

    const connectors = [
      { id: "conn-draft-approved", fromIdx: 0 },
      { id: "conn-approved-in-progress", fromIdx: 1 },
      { id: "conn-in-progress-verifying", fromIdx: 2 },
      { id: "conn-verifying-done", fromIdx: 3 },
      { id: "conn-done-archived", fromIdx: 4 },
    ];

    connectors.forEach((c) => {
      const el = document.getElementById(c.id);
      if (!el) return;
      if (c.fromIdx < activeIndex) {
        el.classList.add("completed");
      } else {
        el.classList.remove("completed");
      }
    });
  }

  function updateApprovalBadge(approval, status, reviews = [], currentData = null) {
    approvalBadgeEl.className = "status-badge";
    const normStatus = (status || "draft").toLowerCase();

    // 1. Status Badge
    if (normStatus === "archived") {
      approvalBadgeEl.classList.add("status-archived");
      approvalBadgeEl.innerHTML = `<span class="status-icon"><i class="ph-bold ph-archive"></i></span><span id="approval-status-text">${t("stepArchived")}</span>`;
    } else if (normStatus === "done") {
      approvalBadgeEl.classList.add("status-done");
      approvalBadgeEl.innerHTML = `<span class="status-icon"><i class="ph-bold ph-check-fat"></i></span><span id="approval-status-text">${t("stepDone")}</span>`;
    } else if (normStatus === "verifying") {
      approvalBadgeEl.classList.add("status-verifying");
      approvalBadgeEl.innerHTML = `<span class="status-icon"><i class="ph-bold ph-shield-check"></i></span><span id="approval-status-text">${t("stepVerifying")}</span>`;
    } else if (normStatus === "in-progress") {
      approvalBadgeEl.classList.add("status-in-progress");
      approvalBadgeEl.innerHTML = `<span class="status-icon"><i class="ph-bold ph-gear-fine"></i></span><span id="approval-status-text">${t("stepInProgress")}</span>`;
    } else if (approval?.approved || normStatus === "approved") {
      approvalBadgeEl.classList.add("status-approved");
      const shortHash = approval?.approvedHash ? `#${approval.approvedHash.slice(0, 8)}` : "OK";
      approvalBadgeEl.innerHTML = `<span class="status-icon"><i class="ph-bold ph-check-circle"></i></span><span id="approval-status-text">${t("statusApproved")} (${shortHash})</span>`;
    } else {
      approvalBadgeEl.classList.add("status-draft");
      approvalBadgeEl.innerHTML = `<span class="status-icon"><i class="ph-bold ph-circle"></i></span><span id="approval-status-text">${t("statusDraft")}</span>`;
    }

    // 2. Dynamic Primary Action Button
    const activeReviews = (reviews || []).filter((r) => !r.resolved);

    if (activeReviews.length > 0) {
      btnApprove.className = "btn-primary";
      btnApprove.innerHTML = `<i class="ph-bold ph-arrows-clockwise"></i> <span>${t("updatePlanBtn")} (${activeReviews.length})</span>`;
      btnApprove.title = `${t("updatePlanBtn")} (${activeReviews.length})`;
      btnApprove.disabled = false;
      btnApprove.onclick = handleUpdatePlan;
    } else {
      if (normStatus === "archived") {
        btnApprove.className = "btn-secondary btn-archived-state";
        btnApprove.innerHTML = `<i class="ph-bold ph-archive"></i> <span>${t("archivedFeature")}</span>`;
        btnApprove.title = t("archivedFeature");
        btnApprove.disabled = true;
        btnApprove.onclick = null;
      } else if (normStatus === "done") {
        btnApprove.className = "btn-primary btn-archive";
        btnApprove.innerHTML = `<i class="ph-bold ph-archive"></i> <span>${t("btnArchiveFeature")}</span>`;
        btnApprove.title = t("btnArchiveFeature");
        btnApprove.disabled = false;
        btnApprove.onclick = () => openArchiveModal();
      } else if (normStatus === "verifying") {
        const hasPendingTasks = Boolean(
          currentData?.tasksData?.total > 0 &&
            currentData?.tasksData?.completed < currentData?.tasksData?.total,
        );

        if (hasPendingTasks) {
          const pendingCount = currentData.tasksData.total - currentData.tasksData.completed;
          btnApprove.className = "btn-secondary";
          btnApprove.innerHTML = `<i class="ph-bold ph-gear-fine"></i> <span>${t("btnPendingTasks")} (${pendingCount})</span>`;
          btnApprove.title = `${pendingCount} ${t("pendingTasksDesc")}`;
          btnApprove.disabled = true;
          btnApprove.onclick = null;
        } else {
          btnApprove.className = "btn-primary btn-success";
          btnApprove.innerHTML = `<i class="ph-bold ph-check-fat"></i> <span>${t("btnCompleteDone")}</span>`;
          btnApprove.title = t("btnCompleteDone");
          btnApprove.disabled = false;
          btnApprove.onclick = () => openDoneModal(currentData);
        }
      } else if (normStatus === "in-progress") {
        btnApprove.className = "btn-primary";
        btnApprove.innerHTML = `<i class="ph-bold ph-shield-check"></i> <span>${t("btnRunVerify")}</span>`;
        btnApprove.title = t("btnRunVerify");
        btnApprove.disabled = false;
        btnApprove.onclick = handleRunVerification;
      } else if (approval?.approved || normStatus === "approved") {
        btnApprove.className = "btn-primary btn-success";
        btnApprove.innerHTML = `<i class="ph-bold ph-play"></i> <span>${t("btnStartImpl")}</span>`;
        btnApprove.title = t("btnStartImpl");
        btnApprove.disabled = false;
        btnApprove.onclick = handleStartImplementation;
      } else {
        btnApprove.className = "btn-primary";
        btnApprove.innerHTML = `<i class="ph-bold ph-check"></i> <span>${t("approveSpec")}</span>`;
        btnApprove.title = t("approveSpec");
        btnApprove.disabled = false;
        btnApprove.onclick = () => {
          modalApprove.classList.remove("hidden");
        };
      }
    }
  }

  function renderVerificationReport(verification) {
    const banner = document.getElementById("verify-overview-banner");
    const bannerTitle = document.getElementById("verify-banner-title");
    const bannerDesc = document.getElementById("verify-banner-desc");
    const bannerIcon = document.getElementById("verify-banner-icon");
    const metaInfo = document.getElementById("verify-meta-info");
    const metricStackVal = document.getElementById("metric-stack-val");
    const metricTasksVal = document.getElementById("metric-tasks-val");
    const stackList = document.getElementById("verify-stack-results");
    const taskList = document.getElementById("verify-task-results");
    const badge = tabVerifyBadge;

    if (!banner || !bannerTitle || !stackList || !taskList || !badge) return;

    if (!verification) {
      banner.className = "verify-banner banner-pending";
      bannerIcon.className = "ph-bold ph-clock";
      bannerTitle.textContent = t("verifyPendingTitle");
      bannerDesc.textContent = t("verifyPendingDesc");
      if (metaInfo) metaInfo.innerHTML = "";
      metricStackVal.textContent = "0/0";
      metricTasksVal.textContent = "0/0";
      stackList.innerHTML = `<div class="empty-state-subtle">${t("noStackResults")}</div>`;
      taskList.innerHTML = `<div class="empty-state-subtle">${t("noTaskResults")}</div>`;
      badge.textContent = t("pending");
      badge.className = "pill-badge pill-blue";
      return;
    }

    const passed = Boolean(verification.passed);
    banner.className = `verify-banner ${passed ? "banner-passed" : "banner-failed"}`;
    bannerIcon.className = passed ? "ph-bold ph-check-circle" : "ph-bold ph-x-circle";
    bannerTitle.textContent = passed ? t("verifyPassedTitle") : t("verifyFailedTitle");
    bannerDesc.textContent = passed
      ? `${t("allChecksPassed")} (${(verification.totalStackCommands || 0) + (verification.totalTasks || 0)} checks)`
      : t("someChecksFailed");

    const shortCommit = verification.commitSha ? `HEAD: ${verification.commitSha.slice(0, 8)}` : "";
    const dateStr = verification.timestamp
      ? new Date(verification.timestamp).toLocaleString(currentLang)
      : "";
    if (metaInfo) {
      metaInfo.innerHTML = `<span>${escapeHtml(shortCommit)}</span> <span>${escapeHtml(dateStr)}</span>`;
    }

    const stackPassed = (verification.stackResults || []).filter((r) => r.passed).length;
    const stackTotal = verification.totalStackCommands || (verification.stackResults || []).length;
    metricStackVal.textContent = `${stackPassed}/${stackTotal}`;

    const tasksPassed = (verification.tasksResults || []).filter((r) => r.passed).length;
    const tasksTotal = verification.totalTasks || (verification.tasksResults || []).length;
    metricTasksVal.textContent = `${tasksPassed}/${tasksTotal}`;

    badge.textContent = passed ? "Passed" : "Failed";
    badge.className = `pill-badge ${passed ? "pill-emerald" : "pill-rose"}`;

    // Render stack results
    if (verification.stackResults && verification.stackResults.length > 0) {
      stackList.innerHTML = "";
      verification.stackResults.forEach((res) => {
        const card = document.createElement("div");
        card.className = `verify-result-card ${res.passed ? "passed" : "failed"}`;
        const durationSec = (res.durationMs / 1000).toFixed(2);
        card.innerHTML = `
          <div class="card-top-row">
            <div class="card-title-group">
              <span class="card-badge-status ${res.passed ? "pass" : "fail"}">
                <i class="ph-bold ${res.passed ? "ph-check" : "ph-x"}"></i>
                ${res.passed ? "PASSED" : "FAILED"}
              </span>
              <strong>[${escapeHtml(res.scope)}] ${escapeHtml(res.commandType)}</strong>
            </div>
            <span class="card-duration">${durationSec}s</span>
          </div>
          <div class="card-cmd-text">${escapeHtml(res.command)}</div>
          ${!res.passed && (res.stderr || res.stdout) ? `<pre class="card-output-details">${escapeHtml(res.stderr || res.stdout)}</pre>` : ""}
        `;
        stackList.appendChild(card);
      });
    } else {
      stackList.innerHTML = `<div class="empty-state-subtle">${t("noStackResults")}</div>`;
    }

    // Render task results
    if (verification.tasksResults && verification.tasksResults.length > 0) {
      taskList.innerHTML = "";
      verification.tasksResults.forEach((res) => {
        const card = document.createElement("div");
        card.className = `verify-result-card ${res.passed ? "passed" : "failed"}`;
        const durationSec = (res.durationMs / 1000).toFixed(2);
        card.innerHTML = `
          <div class="card-top-row">
            <div class="card-title-group">
              <span class="card-badge-status ${res.passed ? "pass" : "fail"}">
                <i class="ph-bold ${res.passed ? "ph-check" : "ph-x"}"></i>
                ${res.passed ? "PASSED" : "FAILED"}
              </span>
              <strong>Task ${escapeHtml(res.taskId)}</strong>
            </div>
            <span class="card-duration">${durationSec}s</span>
          </div>
          <div class="card-cmd-text">${escapeHtml(res.command)}</div>
          ${!res.passed && (res.stderr || res.stdout) ? `<pre class="card-output-details">${escapeHtml(res.stderr || res.stdout)}</pre>` : ""}
        `;
        taskList.appendChild(card);
      });
    } else {
      taskList.innerHTML = `<div class="empty-state-subtle">${t("noTaskResults")}</div>`;
    }
  }

  async function handleStartImplementation() {
    if (!currentChangeId) return;
    btnApprove.disabled = true;
    try {
      const res = await authFetch(`/api/changes/${encodeURIComponent(currentChangeId)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        showToast(t("startImplToast"), false);
        await loadChange(currentChangeId);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Error starting implementation", true);
      }
    } catch (err) {
      console.error("Error starting implementation", err);
      showToast("Error starting implementation", true);
    } finally {
      btnApprove.disabled = false;
    }
  }

  async function handleRunVerification() {
    if (!currentChangeId) return;
    if (btnRunVerify) btnRunVerify.disabled = true;
    btnApprove.disabled = true;
    showToast(t("verifyingSpinner"), false);
    try {
      const res = await authFetch(`/api/changes/${encodeURIComponent(currentChangeId)}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        const passed = Boolean(data.report?.passed);
        showToast(passed ? t("verificationPassedToast") : t("verificationFailedToast"), !passed);
        await loadChange(currentChangeId);
        switchTab("tab-verify");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Error running verification", true);
      }
    } catch (err) {
      console.error("Error running verification", err);
      showToast("Error running verification", true);
    } finally {
      if (btnRunVerify) btnRunVerify.disabled = false;
      btnApprove.disabled = false;
    }
  }

  function openDoneModal(currentData) {
    if (!modalDone) return;
    modalDoneChangeId.textContent = currentChangeId || "";
    chkDoneForce.checked = false;

    const precondTasks = document.getElementById("precond-tasks");
    const precondVerify = document.getElementById("precond-verify");
    const precondScope = document.getElementById("precond-scope");

    const allTasksDone = Boolean(
      currentData?.tasksData?.total > 0 &&
        currentData?.tasksData?.completed === currentData?.tasksData?.total,
    );
    const verifPassed = Boolean(currentData?.verification?.passed);

    if (precondTasks) {
      precondTasks.className = `precondition-item ${allTasksDone ? "valid" : "invalid"}`;
      const icon = precondTasks.querySelector("i");
      if (icon) icon.className = `ph-bold ${allTasksDone ? "ph-check-circle" : "ph-x-circle"}`;
    }

    if (precondVerify) {
      precondVerify.className = `precondition-item ${verifPassed ? "valid" : "invalid"}`;
      const icon = precondVerify.querySelector("i");
      if (icon) icon.className = `ph-bold ${verifPassed ? "ph-check-circle" : "ph-x-circle"}`;
    }

    if (precondScope) {
      precondScope.className = "precondition-item valid";
      const icon = precondScope.querySelector("i");
      if (icon) icon.className = "ph-bold ph-check-circle";
    }

    modalDone.classList.remove("hidden");
  }

  async function handleConfirmDone() {
    if (!currentChangeId) return;
    btnConfirmDone.disabled = true;
    try {
      const force = Boolean(chkDoneForce?.checked);
      const res = await authFetch(`/api/changes/${encodeURIComponent(currentChangeId)}/done`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.ok) {
        modalDone.classList.add("hidden");
        showToast(t("doneSuccessToast"), false);
        await loadChange(currentChangeId);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Cannot complete change", true);
      }
    } catch (err) {
      console.error("Error completing change", err);
      showToast("Error completing change", true);
    } finally {
      btnConfirmDone.disabled = false;
    }
  }

  function openArchiveModal() {
    if (!modalArchive) return;
    modalArchiveChangeId.textContent = currentChangeId || "";
    chkArchiveForce.checked = false;
    modalArchive.classList.remove("hidden");
  }

  async function handleConfirmArchive() {
    if (!currentChangeId) return;
    btnConfirmArchive.disabled = true;
    try {
      const force = Boolean(chkArchiveForce?.checked);
      const res = await authFetch(`/api/changes/${encodeURIComponent(currentChangeId)}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.ok) {
        modalArchive.classList.add("hidden");
        showToast(t("archiveSuccessToast"), false);
        await refreshChangesList(true);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Cannot archive change", true);
      }
    } catch (err) {
      console.error("Error archiving change", err);
      showToast("Error archiving change", true);
    } finally {
      btnConfirmArchive.disabled = false;
    }
  }

  async function handleUpdatePlan() {
    btnApprove.disabled = true;
    try {
      await authFetch(`/api/changes/${encodeURIComponent(currentChangeId)}/reviews/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      showToast(t("updatePlanSuccess"));
      await loadChange(currentChangeId);
    } catch (err) {
      console.error("Error updating plan with adjustments", err);
      showToast(t("updatePlanSuccess"));
      await loadChange(currentChangeId);
    } finally {
      btnApprove.disabled = false;
    }
  }

  let activePopoverSectionId = null;

  function closeActivePopover() {
    const existing = document.querySelector(".section-comment-popover");
    if (existing) existing.remove();
    activePopoverSectionId = null;
  }

  function toggleSectionPopover(section, localizedTitle, wrapElement) {
    if (activePopoverSectionId === section.id) {
      closeActivePopover();
      return;
    }

    closeActivePopover();
    activePopoverSectionId = section.id;

    const popover = document.createElement("div");
    popover.className = "section-comment-popover";

    popover.innerHTML = `
      <div class="popover-header">
        <span class="popover-title"><i class="ph-bold ph-chat-circle-dots"></i> ${t("addAdjustment")} ${escapeHtml(localizedTitle)}</span>
        <button type="button" class="popover-close-btn" aria-label="Cerrar">&times;</button>
      </div>
      <div class="popover-body">
        <textarea class="popover-textarea" placeholder="${t("commentPlaceholder")}"></textarea>
      </div>
      <div class="popover-footer">
        <button type="button" class="btn-popover-cancel">${t("btnCancel")}</button>
        <button type="button" class="btn-popover-save">${t("btnSaveComment")}</button>
      </div>
    `;

    const textarea = popover.querySelector(".popover-textarea");
    const btnClose = popover.querySelector(".popover-close-btn");
    const btnCancel = popover.querySelector(".btn-popover-cancel");
    const btnSave = popover.querySelector(".btn-popover-save");

    btnClose.onclick = (e) => {
      e.stopPropagation();
      closeActivePopover();
    };

    btnCancel.onclick = (e) => {
      e.stopPropagation();
      closeActivePopover();
    };

    btnSave.onclick = async (e) => {
      e.stopPropagation();
      const commentText = textarea.value.trim();
      if (!commentText) {
        textarea.focus();
        return;
      }

      btnSave.disabled = true;
      try {
        await authFetch(`/api/changes/${encodeURIComponent(currentChangeId)}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: section.id,
            sectionTitle: localizedTitle,
            comment: commentText,
            type: "change_request",
          }),
        });

        closeActivePopover();
        showToast(t("commentSavedToast"));
        await loadChange(currentChangeId);
      } catch (err) {
        console.error("Error saving section comment", err);
        closeActivePopover();
      }
    };

    wrapElement.appendChild(popover);
    setTimeout(() => textarea.focus(), 50);
  }

  // Render Proposal Sections with Localized Titles & Inline Popover
  function renderProposalSections(sections, reviews) {
    proposalSectionsContainer.innerHTML = "";
    closeActivePopover();

    if (!sections || sections.length === 0) {
      proposalSectionsContainer.innerHTML = `<div class="empty-state">${t("emptyProposal")}</div>`;
      return;
    }

    // Filtrar secciones meramente estructurales o redundantes:
    // 1. Título principal del documento (H1 / "Propuesta: ..."), ya visible en la cabecera.
    // 2. Encabezado agrupador "Capacidades" ("Capabilities") sin contenido directo.
    const displaySections = sections.filter((section) => {
      const lower = (section.title || "").trim().toLowerCase();
      const isProposalTitle =
        section.level === 1 ||
        lower.startsWith("proposal:") ||
        lower.startsWith("propuesta:") ||
        lower.startsWith("change proposal:") ||
        lower === "proposal" ||
        lower === "propuesta";
      if (isProposalTitle) return false;

      const isCapabilitiesGroup =
        (lower === "capabilities" || lower === "capacidades") && !section.content?.trim();
      if (isCapabilitiesGroup) return false;

      return true;
    });

    if (displaySections.length === 0) {
      proposalSectionsContainer.innerHTML = `<div class="empty-state">${t("emptyProposal")}</div>`;
      return;
    }

    displaySections.forEach((section) => {
      const localizedTitle = localizeSectionTitle(section.title, currentLang);
      const card = document.createElement("div");
      card.className = "section-card";
      card.id = `sec-${section.id}`;

      // Section Header (Sleek, minimalist, consistent)
      const header = document.createElement("div");
      header.className = "section-header";

      const titleWrap = document.createElement("div");
      titleWrap.className = "section-title-wrap";
      titleWrap.innerHTML = `
        <h3 class="section-title">
          <i class="ph-bold ph-caret-right section-heading-icon"></i>
          <span>${escapeHtml(localizedTitle)}</span>
        </h3>
      `;

      const actions = document.createElement("div");
      actions.className = "section-actions";

      const commentWrap = document.createElement("div");
      commentWrap.className = "section-comment-wrap";

      const btnComment = document.createElement("button");
      btnComment.type = "button";
      btnComment.className = "btn-section-review";
      btnComment.innerHTML = `<i class="ph-bold ph-chat-teardrop-dots"></i> <span>${t("comment")}</span>`;
      btnComment.title = t("commentSection");
      btnComment.onclick = (e) => {
        e.stopPropagation();
        toggleSectionPopover(section, localizedTitle, commentWrap);
      };

      commentWrap.appendChild(btnComment);
      actions.appendChild(commentWrap);
      header.appendChild(titleWrap);
      header.appendChild(actions);
      card.appendChild(header);

      // Section Body (With Empty State Placeholder if no content)
      const body = document.createElement("div");
      body.className = "section-body";
      if (!section.content?.trim()) {
        body.innerHTML = `
          <div class="empty-section-placeholder">
            <i class="ph ph-info"></i>
            <span>${t("emptySectionText")}</span>
          </div>
        `;
      } else {
        body.innerHTML = formatMarkdownContent(section.content);
      }
      card.appendChild(body);

      // Attached Section Comments / Adjustments
      const attachedReviews = reviews.filter((r) => r.sectionId === section.id && !r.resolved);
      if (attachedReviews.length > 0) {
        const reviewsWrap = document.createElement("div");
        reviewsWrap.className = "section-reviews-wrapper";

        attachedReviews.forEach((rev) => {
          const revBox = document.createElement("div");
          revBox.className = "section-review-box";
          revBox.innerHTML = `
            <div class="review-box-header">
              <span class="review-badge-violet">
                <i class="ph-bold ph-chat-teardrop-dots"></i>
                <span>${t("proposedAdjustment")}</span>
              </span>
              <button type="button" class="btn-resolve-review" title="${t("resolve")}">
                <i class="ph-bold ph-check"></i> <span>${t("resolve")}</span>
              </button>
            </div>
            <p class="review-box-content">${escapeHtml(rev.comment)}</p>
          `;

          const btnResolve = revBox.querySelector(".btn-resolve-review");
          btnResolve.onclick = async () => {
            await authFetch(
              `/api/changes/${encodeURIComponent(currentChangeId)}/reviews/${rev.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resolved: true }),
              },
            );
            await loadChange(currentChangeId);
          };

          reviewsWrap.appendChild(revBox);
        });
        card.appendChild(reviewsWrap);
      }

      proposalSectionsContainer.appendChild(card);
    });
  }

  // Create Log Card Element (Read-only Audit Log)
  function createCommentCard(rev) {
    const card = document.createElement("div");
    card.className = "log-review-card";

    const header = document.createElement("div");
    header.className = "log-card-header";

    const metaLeft = document.createElement("div");
    metaLeft.className = "log-meta-left";
    const dateStr = new Date(rev.createdAt).toLocaleString(
      currentLang === "es" ? "es-ES" : "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
    metaLeft.innerHTML = `
      <span class="log-author"><i class="ph ph-user"></i> ${escapeHtml(rev.author || "reviewer")}</span>
      <span class="log-date">${dateStr}</span>
      <span class="log-section-tag">[${escapeHtml(rev.sectionTitle || rev.sectionId || "General")}]</span>
    `;

    const statusBadge = document.createElement("span");
    statusBadge.className = `log-status-badge ${rev.resolved ? "status-applied" : "status-pending"}`;
    statusBadge.innerHTML = rev.resolved
      ? `<i class="ph-bold ph-check"></i> ${t("applied")}`
      : `<i class="ph-bold ph-clock"></i> ${t("pending")}`;

    header.appendChild(metaLeft);
    header.appendChild(statusBadge);
    card.appendChild(header);

    if (rev.selection) {
      const sel = document.createElement("div");
      sel.className = "log-ref-text";
      sel.innerHTML = `<em>Ref: "${escapeHtml(rev.selection.slice(0, 120))}${rev.selection.length > 120 ? "..." : ""}"</em>`;
      card.appendChild(sel);
    }

    const text = document.createElement("p");
    text.className = "log-comment-text";
    text.textContent = rev.comment;
    card.appendChild(text);

    if (rev.suggestion) {
      const sug = document.createElement("div");
      sug.className = "log-suggestion-box";
      sug.innerHTML = `<code>${escapeHtml(rev.suggestion)}</code>`;
      card.appendChild(sug);
    }

    return card;
  }

  // Render Tasks Tab
  function renderTasks(tasksData) {
    const total = tasksData.total || 0;
    const completed = tasksData.completed || 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    tasksProgressText.textContent = `${completed} / ${total} ${t("tasksCompletedOf")}`;
    tasksProgressPercent.textContent = `${percent}%`;
    tasksProgressBar.style.width = `${percent}%`;

    tasksContainer.innerHTML = "";
    if (!tasksData.items || tasksData.items.length === 0) {
      tasksContainer.innerHTML = `<div class="empty-state">${t("noTasksDefined")}</div>`;
      return;
    }

    // Group items by role
    const groups = {};
    tasksData.items.forEach((item) => {
      const roleKey = item.role || "General";
      if (!groups[roleKey]) groups[roleKey] = [];
      groups[roleKey].push(item);
    });

    Object.keys(groups).forEach((roleName) => {
      const roleCard = document.createElement("div");
      roleCard.className = "role-group-card";

      const header = document.createElement("div");
      header.className = "role-group-header";

      const title = document.createElement("div");
      title.className = "role-title";
      title.innerHTML = `<i class="ph ph-user-gear"></i> <span>[rol: ${escapeHtml(roleName)}]</span>`;

      const counter = document.createElement("span");
      counter.className = "role-counter";
      const groupCompleted = groups[roleName].filter((i) => i.completed).length;
      counter.textContent = `${groupCompleted}/${groups[roleName].length}`;

      header.appendChild(title);
      header.appendChild(counter);
      roleCard.appendChild(header);

      const ul = document.createElement("ul");
      ul.className = "tasks-list";

      groups[roleName].forEach((task) => {
        const li = document.createElement("li");
        li.className = `task-item ${task.completed ? "completed" : ""}`;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.disabled = true;
        checkbox.tabIndex = -1;
        checkbox.title = t("tasksReadonly");

        const span = document.createElement("span");
        span.className = "task-label";
        span.textContent = task.text;

        li.appendChild(checkbox);
        li.appendChild(span);
        ul.appendChild(li);
      });

      roleCard.appendChild(ul);
      tasksContainer.appendChild(roleCard);
    });
  }

  // Render Diffs Tab
  async function loadDiffs(changeId, scope = "all") {
    try {
      const res = await fetch(`/api/changes/${encodeURIComponent(changeId)}/diff?scope=${scope}`);
      if (!res.ok) return;

      const data = await res.json();
      activeDiffFiles = data.files || [];
      tabDiffBadge.textContent = activeDiffFiles.length;
      diffFileCount.textContent = activeDiffFiles.length;

      renderDiffFileList(activeDiffFiles);

      if (activeDiffFiles.length > 0) {
        selectDiffFile(0);
      } else {
        diffEmptyState.classList.remove("hidden");
        diffContentWrapper.classList.add("hidden");
      }
    } catch (err) {
      console.error("Error loading diffs", err);
    }
  }

  function renderDiffFileList(files) {
    diffFilesList.innerHTML = "";
    files.forEach((file, index) => {
      const li = document.createElement("li");
      li.className = `diff-file-item ${index === selectedDiffIndex ? "active" : ""}`;
      li.title = file.file;

      const left = document.createElement("div");
      left.className = "diff-file-item-left";
      left.innerHTML = `<i class="ph ph-file-code"></i> <span class="diff-file-name">${escapeHtml(file.file)}</span>`;

      const metrics = document.createElement("div");
      metrics.className = "diff-file-metrics";
      metrics.innerHTML = `
        <span class="diff-num-add">+${file.additions}</span>
        <span class="diff-num-del">-${file.deletions}</span>
      `;

      li.appendChild(left);
      li.appendChild(metrics);
      li.onclick = () => selectDiffFile(index);
      diffFilesList.appendChild(li);
    });
  }

  function selectDiffFile(index) {
    selectedDiffIndex = index;
    const file = activeDiffFiles[index];
    if (!file) return;

    document.querySelectorAll(".diff-file-item").forEach((el, i) => {
      el.classList.toggle("active", i === index);
    });

    diffEmptyState.classList.add("hidden");
    diffContentWrapper.classList.remove("hidden");
    diffCurrentFileName.textContent = file.file;

    // Syntax highlight patch
    const patchLines = (file.patch || "").split("\n");
    const codeEl = diffCodePre.querySelector("code");
    codeEl.innerHTML = "";

    patchLines.forEach((line) => {
      const span = document.createElement("div");
      if (line.startsWith("+") && !line.startsWith("+++")) {
        span.className = "diff-line-add";
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        span.className = "diff-line-del";
      } else if (line.startsWith("@@")) {
        span.className = "diff-line-info";
      }
      span.textContent = line || " ";
      codeEl.appendChild(span);
    });
  }

  // Render Reviews Tab
  function renderReviewsTab(reviews) {
    reviewsListContainer.innerHTML = "";
    if (!reviews || reviews.length === 0) {
      reviewsListContainer.innerHTML = `<div class="empty-state">${t("emptyReviews")}</div>`;
      return;
    }

    reviews.forEach((rev) => {
      const card = createCommentCard(rev);
      reviewsListContainer.appendChild(card);
    });
  }

  // Modals & Events
  function openReviewModal(section) {
    const selectedText = window.getSelection ? window.getSelection().toString().trim() : "";
    reviewSectionName.value = section.title;
    reviewSectionId.value = section.id;
    reviewSelectedText.value = selectedText;
    reviewCommentText.value = "";
    reviewSuggestionText.value = "";
    modalReview.classList.remove("hidden");
  }

  async function openFileInIde(filePath) {
    try {
      await authFetch("/api/open-ide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: filePath }),
      });
    } catch (err) {
      console.error("Error opening file in IDE", err);
    }
  }

  function setupDelegatedEvents() {
    // Delegated click on code chips
    document.addEventListener("click", async (e) => {
      const chip = e.target.closest(".code-chip");
      if (chip) {
        e.preventDefault();
        const fileUrl = chip.getAttribute("data-file-url");
        if (fileUrl) {
          chip.classList.add("chip-opening");
          setTimeout(() => chip.classList.remove("chip-opening"), 1200);
          await openFileInIde(fileUrl);
        }
        return;
      }

      // Delegated click on copy code button
      const copyBtn = e.target.closest(".btn-copy-code");
      if (copyBtn) {
        e.preventDefault();
        const codeText = copyBtn.getAttribute("data-code") || "";
        try {
          await navigator.clipboard.writeText(codeText);
          const origHtml = copyBtn.innerHTML;
          copyBtn.innerHTML = `<i class="ph ph-check"></i> <span>${t("codeCopied")}</span>`;
          setTimeout(() => {
            copyBtn.innerHTML = origHtml;
          }, 1800);
        } catch {
          // Fallback
        }
        return;
      }

      // Language Switcher buttons
      const langBtn = e.target.closest(".lang-btn");
      if (langBtn) {
        const lang = langBtn.getAttribute("data-lang");
        if (lang) {
          setLanguage(lang);
        }
      }
    });
  }

  function setupEventListeners() {
    // Change select
    if (changeSelectEl) {
      changeSelectEl.onchange = (e) => {
        loadChange(e.target.value);
      };
    }

    // Settings Dropdown Toggle
    if (btnSettingsToggle && settingsDropdown) {
      btnSettingsToggle.onclick = (e) => {
        e.stopPropagation();
        const isHidden = settingsDropdown.classList.contains("hidden");
        if (isHidden) {
          settingsDropdown.classList.remove("hidden");
          btnSettingsToggle.classList.add("active");
        } else {
          settingsDropdown.classList.add("hidden");
          btnSettingsToggle.classList.remove("active");
        }
      };

      document.addEventListener("click", (e) => {
        if (!settingsDropdown.contains(e.target) && e.target !== btnSettingsToggle) {
          settingsDropdown.classList.add("hidden");
          btnSettingsToggle.classList.remove("active");
        }
      });
    }

    // Quick Wait Toggle Change
    if (quickToggleWait) {
      quickToggleWait.onchange = async () => {
        const isChecked = quickToggleWait.checked;
        try {
          const cfgRes = await fetch("/api/config", { headers: authHeaders() });
          if (cfgRes.ok) {
            const data = await cfgRes.json();
            const currentCfg = data.config || {};
            const updated = {
              ...currentCfg,
              governance: {
                ...(currentCfg.governance || {}),
                wait: isChecked,
              },
            };
            const saveRes = await authFetch("/api/config", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated),
            });
            if (saveRes.ok) {
              showToast(isChecked ? t("waitEnabledToast") : t("waitDisabledToast"), false);
            }
          }
        } catch (err) {
          console.error("Error updating wait setting:", err);
        }
      };
    }

    // Quick Reviews Button
    btnQuickReviews.onclick = () => {
      switchTab("tab-reviews");
    };

    // Open in IDE Button
    btnOpenIde.onclick = async () => {
      if (settingsDropdown) {
        settingsDropdown.classList.add("hidden");
        btnSettingsToggle?.classList.remove("active");
      }
      await openFileInIde("");
    };

    // Open Diff File in IDE
    btnOpenDiffFile.onclick = async () => {
      const file = activeDiffFiles[selectedDiffIndex];
      if (file) {
        await openFileInIde(file.file);
      }
    };

    // Diff Scope Buttons
    diffScopeBtns.forEach((btn) => {
      btn.onclick = () => {
        diffScopeBtns.forEach((b) => {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        currentDiffScope = btn.dataset.scope;
        if (currentChangeId) loadDiffs(currentChangeId, currentDiffScope);
      };
    });

    // Review Modal Close & Cancel
    modalReviewClose.onclick = () => modalReview.classList.add("hidden");
    btnCancelReview.onclick = () => modalReview.classList.add("hidden");

    // Save Review Comment
    btnSaveReview.onclick = async () => {
      const sectionId = reviewSectionId.value;
      const sectionTitle = reviewSectionName.value;
      const selection = reviewSelectedText.value.trim();
      const comment = reviewCommentText.value.trim();
      const suggestion = reviewSuggestionText.value.trim();
      const type = document.querySelector('input[name="review-type"]:checked').value;

      if (!comment) {
        alert(t("alertFillComment"));
        return;
      }

      const res = await authFetch(`/api/changes/${encodeURIComponent(currentChangeId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          sectionTitle,
          selection,
          comment,
          type,
          suggestion,
        }),
      });

      if (res.ok) {
        modalReview.classList.add("hidden");
        await loadChange(currentChangeId);
      }
    };

    // General Review Button
    if (btnAddGeneralReview) {
      btnAddGeneralReview.onclick = () => {
        openReviewModal({ title: "General", id: "general" });
      };
    }

    modalApproveClose.onclick = () => modalApprove.classList.add("hidden");
    btnCancelApprove.onclick = () => modalApprove.classList.add("hidden");

    btnConfirmApprove.onclick = async () => {
      btnConfirmApprove.innerHTML = `<i class="ph ph-spinner"></i> <span>${t("signing")}</span>`;
      const user = approveUserInput.value.trim();
      const notes = approveNotesInput.value.trim();

      const res = await authFetch(`/api/changes/${encodeURIComponent(currentChangeId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, notes }),
      });

      btnConfirmApprove.innerHTML = `<i class="ph-bold ph-check"></i> <span>${t("btnConfirmApprove")}</span>`;
      if (res.ok) {
        modalApprove.classList.add("hidden");
        await loadChange(currentChangeId);
      } else {
        const errJson = await res.json();
        alert(`${t("alertApproveError")} ${errJson.error}`);
      }
    };

    // Verification trigger
    if (btnRunVerify) {
      btnRunVerify.onclick = () => {
        handleRunVerification();
      };
    }

    // Done Modal
    if (modalDoneClose) modalDoneClose.onclick = () => modalDone.classList.add("hidden");
    if (btnCancelDone) btnCancelDone.onclick = () => modalDone.classList.add("hidden");
    if (btnConfirmDone) btnConfirmDone.onclick = () => handleConfirmDone();

    // Archive Modal
    if (modalArchiveClose) modalArchiveClose.onclick = () => modalArchive.classList.add("hidden");
    if (btnCancelArchive) btnCancelArchive.onclick = () => modalArchive.classList.add("hidden");
    if (btnConfirmArchive) btnConfirmArchive.onclick = () => handleConfirmArchive();
  }

  // Tabs Switching
  function setupTabSwitching() {
    tabBtns.forEach((btn) => {
      btn.onclick = () => {
        const target = btn.dataset.tab;
        switchTab(target);
      };
    });
  }

  function switchTab(tabId) {
    tabBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tabId);
    });
    tabPanes.forEach((p) => {
      p.classList.toggle("active", p.id === tabId);
    });
  }

  // Robust Markdown & Impact Code Parser
  function formatMarkdownContent(raw) {
    if (!raw) return "";

    const codeBlocks = [];
    const inlineCodes = [];

    // 1. Extract Fenced Code Blocks (```lang ... ```)
    let processed = raw.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (_match, lang, code) => {
      const idx = codeBlocks.length;
      const safeCode = escapeHtml(code.trimEnd());
      const rawCode = escapeHtml(code.trim());
      const langLabel = escapeHtml(lang || "code");
      codeBlocks.push(
        `<div class="code-block-wrapper"><div class="code-block-header"><span>${langLabel}</span><button type="button" class="btn-copy-code" data-code="${rawCode}"><i class="ph ph-copy"></i> <span>${t("copyCode")}</span></button></div><pre><code>${safeCode}</code></pre></div>`,
      );
      return `\n\n__CODE_BLOCK_${idx}__\n\n`;
    });

    // 2. Extract Inline Code (`code`)
    processed = processed.replace(/`([^`\n]+)`/g, (_match, code) => {
      const idx = inlineCodes.length;
      inlineCodes.push(`<code class="inline-code">${escapeHtml(code)}</code>`);
      return `__INLINE_CODE_${idx}__`;
    });

    // 3. Process Markdown Links & Code File Chips: [label](url)
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
      const cleanUrl = url.trim();
      const isFileLink =
        cleanUrl.startsWith("file://") ||
        /\.(ts|tsx|js|jsx|py|java|c|cpp|cs|go|rs|php|rb|swift|kt|html|css|scss|json|yaml|yml|md|sql|sh)$/i.test(
          cleanUrl,
        ) ||
        cleanUrl.includes("/src/") ||
        cleanUrl.includes("/app/");

      if (isFileLink) {
        return `<button type="button" class="code-chip" data-file-url="${escapeHtml(cleanUrl)}" title="${t("openInIdeTooltip")}"><i class="ph ph-file-code"></i><code>${escapeHtml(label)}</code><i class="ph ph-arrow-square-out chip-icon-ext"></i></button>`;
      }
      return `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="external-link">${escapeHtml(label)} <i class="ph ph-arrow-up-right"></i></a>`;
    });

    // 4. Highlight Architectural Layer Prefixes in Impact Sections
    // Matches patterns like "- **PRESENTATION:**", "- presentation:", "- infrastructure:", "- application/domain:", "**APIs:**", etc.
    processed = processed.replace(
      /(^|\n)\s*[-*]\s*(?:\*{0,2}\[?)(presentation|infrastructure|application\/domain|application|domain|apis|api|dependencies|risks|core|database|security)(?:\]?\*{0,2})\s*[:\-–—]?\s*(?:\*{2})?/gi,
      (_match, newline, layer) => {
        const lower = layer.toLowerCase().replace(/[^a-z0-9]/g, "-");
        return `${newline}- <span class="impact-layer-tag layer-${lower}">${escapeHtml(layer)}</span> `;
      },
    );

    // 5. Bold & Italic (clean pairing & remove orphan leading stars)
    processed = processed.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    processed = processed.replace(/\*\*\s+/g, "");

    // 6. Split into blocks and format lists vs paragraphs
    const lines = processed.split("\n");
    const output = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("__CODE_BLOCK_")) {
        if (inList) {
          output.push("</ul>");
          inList = false;
        }
        output.push(trimmed);
        continue;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (!inList) {
          output.push("<ul>");
          inList = true;
        }
        output.push(`<li>${trimmed.slice(2)}</li>`);
      } else if (trimmed === "") {
        if (inList) {
          output.push("</ul>");
          inList = false;
        }
      } else {
        if (inList) {
          output.push("</ul>");
          inList = false;
        }
        output.push(`<p>${line}</p>`);
      }
    }

    if (inList) {
      output.push("</ul>");
    }

    let finalHtml = output.join("\n");

    // 7. Reinsert Inline Codes
    inlineCodes.forEach((codeHtml, idx) => {
      finalHtml = finalHtml.split(`__INLINE_CODE_${idx}__`).join(codeHtml);
    });

    // 8. Reinsert Code Blocks
    codeBlocks.forEach((blockHtml, idx) => {
      finalHtml = finalHtml.split(`__CODE_BLOCK_${idx}__`).join(blockHtml);
    });

    return finalHtml;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Start
  document.addEventListener("DOMContentLoaded", init);
})();
