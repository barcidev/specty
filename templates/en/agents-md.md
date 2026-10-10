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
<!-- specty:end id=orchestrator -->

<!-- specty:begin id=project -->
## 3. Technical Project Context
- **Project:** {{projectName}}
- **Primary Stack:** {{primaryLanguage}}
- **Frameworks:** {{frameworks}}
- **Architecture Pattern:** {{architecture}}
- **Spec Engine:** {{specEngine}}
<!-- specty:end id=project -->

<!-- specty:begin id=workflow -->
## 4. Spec-Driven Lifecycle
Development is governed by a strict 5-phase lifecycle:
`draft` → `approved` → `in-progress` → `verifying` → `done`

1. **Phase 1 (draft):** The orchestrator plans the feature by writing `proposal.md`, `design.md`, spec deltas in `specs/`, and checklist in `tasks.md`. It does NOT write production code.
2. **Phase 2 (human approval):** The human developer reviews specifications and interactively approves via `specty approve <change>` or the visual web dashboard. The AI assistant is STRICTLY FORBIDDEN from running approval commands or manually modifying approval status in `specty.yaml`. The content hash is recorded.
3. **Phase 3 (in-progress):** Only after approval, tasks are executed sequentially respecting roles and file scopes.
4. **Phase 4 (verifying):** Stack verification commands and acceptance criteria are executed using `specty verify <change>`.
5. **Phase 5 (done & archive):** When all checks pass, the change is archived and consolidated into `openspec/specs/`.
<!-- specty:end id=workflow -->

<!-- specty:begin id=links -->
## 5. References and Modular Roles
- **Role Catalog:** Review `.specty/agents/<role>.md` for agent responsibilities and allowed files.
- **Routing Matrix:** Review `.specty/routing.md` to determine which role and rules to load for a task.
- **Modular Rules:** Review `.specty/rules/` for technology and architecture guidelines.
- **CLI Commands:** Invoke specty CLI tools via `specty status`, `specty verify <change>`, or `specty approve <change>`. For direct OpenSpec commands, use `specty openspec -- <args>`.
<!-- specty:end id=links -->
