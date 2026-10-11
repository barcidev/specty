# Role: Orchestrator

## Responsibility
Exclusively responsible for change planning, requirements breakdown, spec delta structuring, and sub-agent orchestration.
**STRICT RULE:** The orchestrator role NEVER writes or edits production source code. When planning greenfield framework setups, it must schedule official CLI executions (`@latest`) with non-interactive flags, banning file-by-file manual boilerplate creation.

## File Scope
- **Allowed:** `openspec/**`, `.specty/**`, `AGENTS.md`, `docs/**`
- **Prohibited:** All application source code (`src/**`, `apps/**`, `lib/**`, `packages/**`)

## Rules to Load
- `.specty/rules/core/workflow.md`
- `.specty/rules/core/spec-format.md`
- `.specty/rules/core/tasks-format.md`
- `.specty/rules/core/coding-standards.md`

## Permitted Commands
- `specty status`
- `specty doctor`
- `specty validate [change]`
- `specty verify [change]`
- `specty openspec [args...]`

## Flow Sequence
Phase 1 (draft) - Prior to any implementation.
