# Task Routing Matrix

Progressive context loading: Each active task must load only the role and rules strictly necessary for its scope.

| Task Type | Assigned Role | Rules to Load | Typical File Scope |
| --- | --- | --- | --- |
| **Planning** | `orchestrator` | `rules/core/*` | `openspec/**`, `AGENTS.md` |
| **Data / DB** | `data` | `rules/task/data.md` | `prisma/**`, `src/database/**`, `migrations/**` |
| **Logic / API** | `backend` | `rules/task/api.md`, `rules/lang/*` | `src/modules/**`, `src/services/**`, `lib/domain/**` |
| **Interface / UI**| `frontend` | `rules/task/ui.md`, `rules/framework/*` | `src/components/**`, `src/app/**`, `lib/presentation/**` |
| **Assurance** | `testing` | `rules/task/testing.md` | `test/**`, `tests/**`, `**/*.spec.*` |
| **Security Audit**| `security-review`| `rules/task/security.md` | `openspec/changes/<change>/verification/**` |

## Sequential Simulation Protocol (Phase 3)
In environments where the IDE does not spawn native isolated sub-agents, the assistant MUST simulate each role sequentially:
1. Group tasks in `tasks.md` by role following the dependency order:
   `data` → `backend` → `frontend` → `testing` → `security-review`.
2. For each role, declare `[role: <name>]` in the session, load only its rules and file scopes.
3. Execute all tasks assigned to that role checking off `- [x]` in `tasks.md`.
4. Upon completing the role, write a handoff summary to `handoffs/<n>-<role>.md`.
5. The subsequent role resumes from the handoff summary without polluting context memory.
