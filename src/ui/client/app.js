// Specty UI - Client SPA Controller
(() => {
  let currentChangeId = null;
  let activeChangeData = null;
  let currentDiffScope = "all";
  let activeDiffFiles = [];
  let selectedDiffIndex = 0;
  let sseSource = null;

  // DOM Elements
  const branchNameEl = document.getElementById("branch-name");
  const changeSelectEl = document.getElementById("change-select");
  const approvalBadgeEl = document.getElementById("approval-status-badge");
  const approvalTextEl = document.getElementById("approval-status-text");
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
  const btnApplySuggestions = document.getElementById("btn-apply-suggestions");

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
  const modalApproveChangeId = document.getElementById("modal-approve-change-id");
  const modalValidationSummary = document.getElementById("modal-validation-summary");
  const approveUserInput = document.getElementById("approve-user-input");
  const approveNotesInput = document.getElementById("approve-notes-input");

  // Top Action Buttons
  const btnApprove = document.getElementById("btn-approve");
  const btnOpenIde = document.getElementById("btn-open-ide");
  const btnQuickReviews = document.getElementById("btn-quick-reviews");
  const btnAddGeneralReview = document.getElementById("btn-add-general-review");

  // Initialize
  async function init() {
    setupTabSwitching();
    setupEventListeners();
    setupSse();
    await loadInitialData();
  }

  // SSE Setup
  function setupSse() {
    try {
      sseSource = new EventSource("/api/events");
      sseSource.addEventListener("fs:change", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("task:toggled", () => {
        if (currentChangeId) loadChange(currentChangeId, true);
      });
      sseSource.addEventListener("change:approved", () => {
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
    } catch (e) {
      console.warn("SSE connection error", e);
    }
  }

  // Load Status and Changes
  async function loadInitialData() {
    try {
      const statusRes = await fetch("/api/status").then((r) => r.json());
      if (statusRes.branch) {
        branchNameEl.textContent = statusRes.branch;
      }
      if (statusRes.config?.spec_engine) {
        specEngineTagEl.textContent = `Engine: ${statusRes.config.spec_engine}`;
      }
      if (statusRes.gitUser?.name) {
        approveUserInput.value = statusRes.gitUser.name;
      }

      const changesRes = await fetch("/api/changes").then((r) => r.json());
      const changes = changesRes.changes || [];

      changeSelectEl.innerHTML = "";
      if (changes.length === 0) {
        changeSelectEl.innerHTML = '<option value="">No hay changes activos</option>';
        return;
      }

      changes.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.id} - ${c.title || "Sin título"} (${c.status})`;
        changeSelectEl.appendChild(opt);
      });

      const urlParams = new URLSearchParams(window.location.search);
      const paramChange = urlParams.get("change");
      const targetId =
        paramChange && changes.some((c) => c.id === paramChange) ? paramChange : changes[0].id;

      changeSelectEl.value = targetId;
      await loadChange(targetId);
    } catch (err) {
      console.error("Error loading initial data", err);
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

    // Approval Badge
    updateApprovalBadge(data.approval, data.status);

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
  }

  function updateApprovalBadge(approval, status) {
    approvalBadgeEl.className = "status-badge";
    if (approval?.approved) {
      approvalBadgeEl.classList.add("status-approved");
      const shortHash = approval.approvedHash ? `#${approval.approvedHash.slice(0, 8)}` : "OK";
      approvalTextEl.textContent = `Approved (${shortHash})`;
      btnApprove.textContent = "✓ Aprobado";
      btnApprove.classList.remove("btn-primary");
      btnApprove.classList.add("btn-secondary");
    } else if (approval?.code === "reapproval_required") {
      approvalBadgeEl.classList.add("status-warning");
      approvalTextEl.textContent = "Re-approval Required";
      btnApprove.textContent = "⚠ Re-aprobar";
      btnApprove.classList.add("btn-primary");
    } else {
      approvalBadgeEl.classList.add("status-draft");
      approvalTextEl.textContent = status || "Draft";
      btnApprove.textContent = "✓ Aprobar Spec";
      btnApprove.classList.add("btn-primary");
    }
  }

  // Render Proposal Sections with Inline Review Buttons
  function renderProposalSections(sections, reviews) {
    proposalSectionsContainer.innerHTML = "";

    if (!sections || sections.length === 0) {
      proposalSectionsContainer.innerHTML =
        '<div class="empty-state">No se encontró contenido en proposal.md</div>';
      return;
    }

    sections.forEach((section) => {
      const card = document.createElement("div");
      card.className = "section-card";
      card.id = `sec-${section.id}`;

      // Section Header
      const header = document.createElement("div");
      header.className = "section-header";

      const titleWrap = document.createElement("div");
      titleWrap.className = "section-title-wrap";
      titleWrap.innerHTML = `<h3 class="section-title">${escapeHtml(section.title)}</h3>`;

      const actions = document.createElement("div");
      actions.className = "section-actions";

      const btnComment = document.createElement("button");
      btnComment.className = "btn-section-review";
      btnComment.innerHTML = "💬 Comentar";
      btnComment.title = "Agregar comentario a esta sección (estilo Antigravity)";
      btnComment.onclick = () => openReviewModal(section);

      actions.appendChild(btnComment);
      header.appendChild(titleWrap);
      header.appendChild(actions);
      card.appendChild(header);

      // Section Body
      const body = document.createElement("div");
      body.className = "section-body";
      body.innerHTML = formatMarkdownContent(section.content);
      card.appendChild(body);

      // Attached Reviews
      const attachedReviews = reviews.filter((r) => r.sectionId === section.id && !r.resolved);
      if (attachedReviews.length > 0) {
        const reviewsWrap = document.createElement("div");
        reviewsWrap.className = "section-reviews-wrapper";

        attachedReviews.forEach((rev) => {
          const revCard = createCommentCard(rev);
          reviewsWrap.appendChild(revCard);
        });
        card.appendChild(reviewsWrap);
      }

      proposalSectionsContainer.appendChild(card);
    });
  }

  // Create Comment Card Element
  function createCommentCard(rev) {
    const card = document.createElement("div");
    card.className = `comment-card type-${rev.type}`;

    const header = document.createElement("div");
    header.className = "comment-card-header";

    const author = document.createElement("span");
    author.className = "comment-author-badge";
    author.innerHTML = `👤 ${escapeHtml(rev.author)} <span class="sub-hash">${new Date(rev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>`;

    const tag = document.createElement("span");
    tag.className = `comment-type-tag ${rev.type}`;
    tag.textContent = rev.type === "change_request" ? "Cambio Requerido" : "Comentario";

    header.appendChild(author);
    header.appendChild(tag);
    card.appendChild(header);

    if (rev.selection) {
      const sel = document.createElement("div");
      sel.className = "sub-hash";
      sel.style.marginBottom = "0.3rem";
      sel.innerHTML = `<em>Ref: "${escapeHtml(rev.selection.slice(0, 100))}${rev.selection.length > 100 ? "..." : ""}"</em>`;
      card.appendChild(sel);
    }

    const text = document.createElement("p");
    text.className = "comment-text";
    text.textContent = rev.comment;
    card.appendChild(text);

    if (rev.suggestion) {
      const sug = document.createElement("div");
      sug.className = "comment-suggestion-preview";
      sug.innerHTML = `<strong>Sugerencia:</strong> <code>${escapeHtml(rev.suggestion)}</code>`;
      card.appendChild(sug);
    }

    const actions = document.createElement("div");
    actions.className = "comment-actions";

    const btnResolve = document.createElement("button");
    btnResolve.className = "btn-subtle btn-xs";
    btnResolve.textContent = "✓ Resolver";
    btnResolve.onclick = async () => {
      await fetch(`/api/changes/${encodeURIComponent(currentChangeId)}/reviews/${rev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
      await loadChange(currentChangeId);
    };

    actions.appendChild(btnResolve);
    card.appendChild(actions);

    return card;
  }

  // Render Tasks Tab
  function renderTasks(tasksData) {
    const total = tasksData.total || 0;
    const completed = tasksData.completed || 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    tasksProgressText.textContent = `${completed} de ${total} tareas completadas`;
    tasksProgressPercent.textContent = `${percent}%`;
    tasksProgressBar.style.width = `${percent}%`;

    tasksContainer.innerHTML = "";
    if (!tasksData.items || tasksData.items.length === 0) {
      tasksContainer.innerHTML =
        '<div class="empty-state">No hay tareas definidas en tasks.md</div>';
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
      roleCard.className = "role-group";

      const title = document.createElement("h4");
      title.className = "role-group-title";
      title.innerHTML = `<span>⚙ [rol: ${escapeHtml(roleName)}]</span>`;
      roleCard.appendChild(title);

      const ul = document.createElement("ul");
      ul.className = "tasks-list";

      groups[roleName].forEach((task) => {
        const li = document.createElement("li");
        li.className = `task-item ${task.completed ? "completed" : ""}`;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.onchange = async () => {
          await toggleTask(task.lineIndex, checkbox.checked);
        };

        const span = document.createElement("span");
        span.className = "task-text";
        span.textContent = task.text;

        li.appendChild(checkbox);
        li.appendChild(span);
        ul.appendChild(li);
      });

      roleCard.appendChild(ul);
      tasksContainer.appendChild(roleCard);
    });
  }

  async function toggleTask(lineIndex, completed) {
    try {
      const res = await fetch(`/api/changes/${encodeURIComponent(currentChangeId)}/tasks/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineIndex, completed }),
      });
      if (res.ok) {
        const json = await res.json();
        renderTasks(json.tasksData);
        tabTasksBadge.textContent = `${json.tasksData.completed}/${json.tasksData.total}`;
      }
    } catch (err) {
      console.error("Error toggling task", err);
    }
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

      const name = document.createElement("span");
      name.textContent = file.file;

      const metrics = document.createElement("span");
      metrics.className = "diff-metrics";
      metrics.innerHTML = `<span class="diff-add">+${file.additions}</span> <span class="diff-del">-${file.deletions}</span>`;

      li.appendChild(name);
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
      const span = document.createElement("span");
      if (line.startsWith("+") && !line.startsWith("+++")) {
        span.className = "diff-line-add";
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        span.className = "diff-line-del";
      } else if (line.startsWith("@@")) {
        span.className = "diff-line-info";
      }
      span.textContent = `${line}\n`;
      codeEl.appendChild(span);
    });
  }

  // Render Reviews Tab
  function renderReviewsTab(reviews) {
    reviewsListContainer.innerHTML = "";
    if (!reviews || reviews.length === 0) {
      reviewsListContainer.innerHTML =
        '<div class="empty-state">No hay comentarios ni solicitudes de cambio registradas aún.</div>';
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

  function setupEventListeners() {
    // Change select
    changeSelectEl.onchange = (e) => {
      loadChange(e.target.value);
    };

    // Quick Reviews Button
    btnQuickReviews.onclick = () => {
      switchTab("tab-reviews");
    };

    // Open in IDE Button
    btnOpenIde.onclick = async () => {
      await fetch("/api/open-ide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    };

    // Open Diff File in IDE
    btnOpenDiffFile.onclick = async () => {
      const file = activeDiffFiles[selectedDiffIndex];
      if (file) {
        await fetch("/api/open-ide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: file.file }),
        });
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
        alert("Por favor escribe tu comentario u observación.");
        return;
      }

      const res = await fetch(`/api/changes/${encodeURIComponent(currentChangeId)}/reviews`, {
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
    btnAddGeneralReview.onclick = () => {
      openReviewModal({ title: "General", id: "general" });
    };

    // Apply Suggestions to Spec
    btnApplySuggestions.onclick = async () => {
      btnApplySuggestions.textContent = "Aplicando...";
      const res = await fetch(`/api/changes/${encodeURIComponent(currentChangeId)}/reviews/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      btnApplySuggestions.textContent = "⚡ Aplicar Sugerencias al Spec";
      if (res.ok) {
        const json = await res.json();
        alert(json.message);
        await loadChange(currentChangeId);
      }
    };

    // Approve Modal Open
    btnApprove.onclick = () => {
      modalApproveChangeId.textContent = currentChangeId;
      const val = activeChangeData?.validation;
      if (val && !val.valid) {
        modalValidationSummary.style.display = "block";
        modalValidationSummary.textContent = `Advertencia: Se detectaron ${val.errorsCount || 0} errores semánticos en el spec.`;
      } else {
        modalValidationSummary.style.display = "none";
      }
      modalApprove.classList.remove("hidden");
    };

    modalApproveClose.onclick = () => modalApprove.classList.add("hidden");
    btnCancelApprove.onclick = () => modalApprove.classList.add("hidden");

    btnConfirmApprove.onclick = async () => {
      btnConfirmApprove.textContent = "Firmando...";
      const user = approveUserInput.value.trim();
      const notes = approveNotesInput.value.trim();

      const res = await fetch(`/api/changes/${encodeURIComponent(currentChangeId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, notes }),
      });

      btnConfirmApprove.textContent = "✓ Confirmar y Firmar Aprobación";
      if (res.ok) {
        modalApprove.classList.add("hidden");
        await loadChange(currentChangeId);
      } else {
        const errJson = await res.json();
        alert(`Error al aprobar: ${errJson.error}`);
      }
    };
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

  // Markdown Formatting Helper
  function formatMarkdownContent(raw) {
    if (!raw) return "";
    let html = escapeHtml(raw);
    // Simple code blocks
    html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Line breaks
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");
    return `<p>${html}</p>`;
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
