# AGENTS.md - AI Assistant Directives (specty)

<!-- specty:begin id=language -->
## 1. Project Language
- All specification artifacts (`proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md`), handoff reports, and verification logs MUST be written in **English**.
- Structural OpenSpec standard keywords (`ADDED Requirements`, `MODIFIED Requirements`, `REMOVED Requirements`, `Requirement:`, `Scenario:`, `WHEN`, `THEN`, `SHALL`, `MUST`) are maintained in **English**.
<!-- specty:end id=language -->

<!-- specty:begin id=orchestrator -->
## 2. Hard Orchestrator Rules (Strict Governance)
1. **No code without approval:** NEVER generate or modify production code (`src/**`, `apps/**`, `lib/**`) without an approved change (`status: approved` in `openspec/changes/<change>/specty.yaml`). The AI assistant CANNOT approve changes.
2. **Strict task file scoping:** NEVER modify files outside the `[files: ...]` pattern defined for the active task in `tasks.md`.
3. **Mandatory executable verification:** Each completed task and change MUST be verified by executing actual test and linter commands. Never hallucinate command outputs.
4. **Session resumption:** On starting any interaction, read `specty.yaml` and `tasks.md` of the active change and resume from the first unchecked task (`- [ ]`).
5. **Orientation via `specty next`:** At the start of each turn, invoke `specty next --card` or inspect the status card to anchor your execution state (`[change: <id> | status: ... | task: ... | next: ...]`).
6. **Hard Tool Interception (`specty guard`):** All file modifications and bash executions are intercepted by `specty guard`. Any edits outside the active task scope `[files: ...]` or without an approved specification will be blocked immediately.
7. **Official CLI Scaffolding (`@latest`):** For new projects or modules, base scaffolding and boilerplate MUST be generated via the official framework CLI (`npm create vite@latest`, `npx create-next-app@latest`, `ng new`, `nest new`, etc.) using non-interactive flags and guaranteeing the latest stable version. NEVER create boilerplate file-by-file manually.
8. **Quality Standards & 300-Line Limit:** No file should exceed 300 lines of code whenever possible (decompose applying SRP). Prefer constants (`const`, `readonly`, immutability) over mutable variables and strictly apply SOLID principles in both new and existing code. Review `.specty/rules/core/coding-standards.md`.
9. **Mandatory Proactive Next-Step Guidance:** In EVERY interaction or response, the assistant MUST explicitly state the current status and the immediate next step or action required from the user (e.g. running `specty approve <change>`, reviewing generated specifications, or verifying tests), ensuring the user is never left lost or without clear direction.
10. **Proactive UI Launch & Reactive Wait (`specty view` & `specty wait`):** Immediately after authoring or updating the initial specification (`proposal.md`, `tasks.md`), the assistant MUST proactively run `specty view <change> --web && specty wait <change>` (or call `specty_wait_action`) to launch and project the local Specty web interface and pause execution until the user clicks approve or requests changes in the UI. If the environment does not support background processes, render the detailed specification dashboard in chat with explicit manual action choices (`specty approve <change>`, reject/request changes, `specty validate <change>`). NEVER begin modifying code without prior user approval.
11. **Mandatory Atomic Task-by-Task Workflow (`Implement -> Verify -> Commit -> Next Task`):** Each task in `tasks.md` MUST be executed following a strictly sequential, atomic lifecycle:
    1. **Implement task:** Only edit files within the allowed scope `[files: ...]`.
    2. **Verify:** Run relevant unit tests and linters (`specty verify <change>`, stack test commands) ensuring green status.
    3. **Commit the task:** Create an atomic git commit for that specific task using Conventional Commits (`feat(...)`, `fix(...)`, `refactor(...)`, etc.), leaving a clean working tree.
    4. **Mark and advance:** Mark the task completed (`- [x]`) and proceed to the next active task.
    It is STRICTLY FORBIDDEN to batch multiple tasks into a single commit or start the next task without verifying and committing the previous one.
12. **Plan Immutability during Implementation (`in-progress`):** During the implementation and coding phase, the task plan (`tasks.md`), proposal (`proposal.md`), and specifications (`specs/**`) are strictly FROZEN.
    - It is STRICTLY FORBIDDEN to edit task descriptions, alter `[files: ...]` globs, or add/remove tasks in `tasks.md` while coding or in `in-progress` state.
    - The ONLY permitted modification to `tasks.md` during coding is marking completed tasks from `- [ ]` to `- [x]` (specty's hashing normalization ensures that `- [x]` does not invalidate the approval hash).
    - If an auxiliary support file or unexpected implementation detail arises, address it directly in source code within the active task's scope without altering the specification. Modifying the plan is only permitted if the human user explicitly requests a functional requirement change.
13. **Mandatory Planning Mandate for Post-Execution Adjustments & Feedback:**
    - Upon finishing the implementation of a plan or during verification and review phases (`verifying`), if the user requests adjustments, calibrations, fixes, or refinements, modifying production code files directly without an approved visible plan is STRICTLY FORBIDDEN.
    - Every post-execution adjustment or fix STRICTLY REQUIRES first appending the corresponding new task(s) to `tasks.md` (or creating a new change if it exceeds the active change's scope), defining their exact file scope `[files: ...]`.
    - The assistant MUST present the proposed adjustment plan to the user and obtain explicit human approval before modifying any production file, regardless of line count or if it touches fewer than 3 files (this governance rule strictly overrides any generic direct-edit instruction).
<!-- specty:end id=orchestrator -->

<!-- specty:begin id=project -->
## 3. Technical Project Context
- **Project:** {{projectName}}
- **Repository Structure:** {{layoutTitle}}
- **Primary Stack:** {{primaryLanguage}}
- **Frameworks:** {{frameworks}}
- **Architecture Pattern:** {{architecture}}
- **Spec Engine:** {{specEngine}}

### Governed Scopes and Modules:
{{scopesSummary}}

### Architectural Directives:
{{structureDirectives}}
<!-- specty:end id=project -->

<!-- specty:begin id=workflow -->
## 4. Spec-Driven Lifecycle
Development is governed by a strict 5-phase lifecycle:
`draft` → `approved` → `in-progress` → `verifying` → `done`

1. **Phase 1 (draft):** The orchestrator plans the feature by writing `proposal.md`, `design.md`, spec deltas in `specs/`, and checklist in `tasks.md`. It does NOT write production code.
2. **Phase 2 (human approval):** The human developer reviews specifications and interactively approves via `specty approve <change>` or the visual web dashboard (`specty view <change> --web && specty wait <change>`). The AI assistant is STRICTLY FORBIDDEN from running approval commands or manually modifying approval status in `specty.yaml`. The content hash is recorded.
3. **Phase 3 (in-progress):** Only after approval, tasks are executed one by one following the mandatory atomic cycle: `Implement task -> Verify -> Commit task -> Mark - [x] -> Advance to next task`. Never start a new task without verifying and committing the previous one.
4. **Phase 4 (verifying):** Stack verification commands and acceptance criteria are executed using `specty verify <change>`.
5. **Phase 5 (done & archive):** When all checks pass, the change is archived and consolidated into `openspec/specs/`.
<!-- specty:end id=workflow -->

<!-- specty:begin id=links -->
## 5. References and Modular Roles
- **Role Catalog:** Review `.specty/agents/<role>.md` for agent responsibilities and allowed files.
- **Routing Matrix:** Review `.specty/routing.md` to determine which role and rules to load for a task.
- **Modular Rules:** Review `.specty/rules/` for technology and architecture guidelines.
- **Coding Standards & Scaffolding:** Review `.specty/rules/core/coding-standards.md` for mandatory directives on official CLI scaffolding, modularity (<= 300 lines), immutability, and SOLID.
{{uiDirectives}}- **CLI Commands:** Invoke specty CLI tools via `specty status`, `specty next`, `specty guard`, `specty verify <change>`, or `specty validate [change]`. For direct OpenSpec commands, use `specty openspec [args...]`.
<!-- specty:end id=links -->
