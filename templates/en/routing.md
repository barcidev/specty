# Task Routing Matrix

Progressive loading: each active task loads exclusively the role and rules within its scope.

| Task Type | Role | Rules to Load | File Scope |
| :--- | :--- | :--- | :--- |
| **Planning** | `orchestrator` | `rules/core/*` | `openspec/**`, `AGENTS.md` |
| **Data / DB** | `data` | `rules/task/data.md` | `prisma/**`, `src/database/**` |
| **Logic / API** | `backend` | `rules/task/api.md`, `rules/lang/*` | `src/modules/**`, `src/services/**` |
| **Interface / UI** | `frontend` | `rules/task/ui.md`, `rules/framework/*` | `src/components/**`, `src/app/**` |
| **Testing** | `testing` | `rules/task/testing.md` | `test/**`, `tests/**`, `**/*.spec.*` |
| **Security Audit** | `security-review` | `rules/task/security.md` | `openspec/changes/<change>/verification/**` |

## Role Execution Protocol
1. Group tasks by role: `data` → `backend` → `frontend` → `testing` → `security-review`.
2. For each role, declare `[role: <name>]`, load only its rules, and complete its tasks (`- [x]`).
3. Record brief handoff in `handoffs/<n>-<role>.md` before transitioning context to the next role.
