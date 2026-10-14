# AGENTS.md - AI Assistant Directives (specty)

<!-- specty:begin id=language -->
## 1. Project Language
- All specification artifacts (`proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md`), handoff reports, and verification logs MUST be written in **English**.
- Structural OpenSpec standard keywords (`ADDED Requirements`, `MODIFIED Requirements`, `REMOVED Requirements`, `Requirement:`, `Scenario:`, `WHEN`, `THEN`, `SHALL`, `MUST`) are maintained in **English**.
<!-- specty:end id=language -->

<!-- specty:begin id=orchestrator -->
## 2. Governance State Machine and Workflow
The assistant operates as a deterministic state machine. Code modifications are strictly governed by the change status in `specty.yaml`:

| Status | Code (`src/**`, `apps/**`) | Plan (`tasks.md`) | Deterministic Action |
| :--- | :--- | :--- | :--- |
| `draft` | **Forbidden** | Author tasks with `[files: ...]` | Run `specty view <change> --web && specty wait <change>` for approval |
| `approved` | Allowed on task 1 | Resume on first unchecked `- [ ]` | Start turn with `specty next --card` |
| `in-progress` | Allowed **only** in active `[files: ...]` | **Frozen** (only check `- [x]`) | Verify with `specty verify <change>` and commit |
| `verifying` / Adjustments | **Forbidden** until re-approved | **Reopened**: add adjustment task | Add new task and re-approve with `specty approve <change>` |
| `done` | **Forbidden** | Consolidated / archived | Finalize with `specty done <change>` |

### Mandatory Operational Directives:
1. **Atomic task lifecycle:** Each task in `tasks.md` strictly follows: `Implement in [files: ...] scope -> Verify green -> Atomic commit (Conventional Commits) -> Mark - [x]`. Batching tasks or advancing without verifying the previous task is strictly forbidden.
2. **Post-execution adjustments:** Editing code in `verifying` or after completing all tasks is forbidden. Any adjustment requires adding the task to `tasks.md`, invalidating hash, and obtaining human re-approval (`specty approve <change>`) before touching code.
3. **Continuous user guidance:** At the end of every interaction, always state the current status and the next command or action required from the user.
4. **Quality and modularity:** Enforce 300-line limit per file (SRP), immutability (`const`/`readonly`), strict typing (zero `any`), and official CLI scaffolding (`@latest`) per `.specty/rules/core/coding-standards.md`.
<!-- specty:end id=orchestrator -->

<!-- specty:begin id=project -->
## 3. Technical Project Context
- **Project:** {{projectName}}
- **Repository Structure:** {{layoutTitle}}
- **Primary Stack:** {{primaryLanguage}}
- **Frameworks:** {{frameworks}}
- **Architecture Pattern:** {{architecture}}
- **Spec Engine:** {{specEngine}}

### Scopes and Governed Modules:
{{scopesSummary}}

### Architecture Directives:
{{structureDirectives}}
<!-- specty:end id=project -->

<!-- specty:begin id=workflow -->
## 4. Specification-Driven Lifecycle
Development strictly follows 5 states: `draft` → `approved` → `in-progress` → `verifying` → `done`.
Consult detailed transition procedures in `.specty/rules/core/workflow.md`.
<!-- specty:end id=workflow -->

<!-- specty:begin id=links -->
## 5. Modular References and Roles
- **Role Catalog:** Consult `.specty/agents/<role>.md` for responsibilities and file scopes.
- **Routing Matrix:** Consult `.specty/routing.md` to determine active role and modular rules per task.
- **Modular Rules:** Consult `.specty/rules/` for technology and architecture guidelines.
- **Coding Standards:** Consult `.specty/rules/core/coding-standards.md`.
{{uiDirectives}}- **CLI Tools:** Use `specty status`, `specty next`, `specty guard`, `specty verify <change>`, or `specty validate [change]`. For native OpenSpec, run `specty openspec [args...]`.
<!-- specty:end id=links -->
