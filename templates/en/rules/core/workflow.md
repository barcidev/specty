# Core Rule: Workflow

Development in specty follows a deterministic 5-state automaton:

```text
draft ──► approved ──► in-progress ──► verifying ──► done
             │              │             │
             ▲              └─────────────┘ (adjustments reopen plan and require re-approval)
```

## 1. State and Action Matrix
| Phase | Status | Production Code | Plan (`tasks.md`) | Key Action |
| :--- | :--- | :--- | :--- | :--- |
| **1. Planning** | `draft` | **Forbidden** | Initial authoring with `[files: ...]` | `specty view <change> --web && specty wait <change>` |
| **2. Approval** | `approved` | Allowed on active task | Frozen | `specty approve <change>` (human only) |
| **3. Execution** | `in-progress` | Restricted to active `[files: ...]` | Frozen (only check `- [x]`) | `specty verify <change>` |
| **4. Verification** | `verifying` | **Forbidden** without open task | **Reopened** for adjustment tasks | `specty verify <change>` / `specty approve <change>` |
| **5. Closure** | `done` | **Forbidden** | Consolidated | `specty done <change>` |

## 2. Atomic Task Lifecycle
Each task in `tasks.md` follows a strict sequence:
1. **Implement:** Edit only files within active `[files: ...]` scope.
2. **Verify:** Run stack tests ensuring green status (`specty verify <change>`).
3. **Commit:** Create an atomic git commit (Conventional Commits) leaving a clean tree.
4. **Advance:** Mark `- [x]` and proceed to next active task.
*Batching multiple tasks into one commit or skipping verification is strictly forbidden.*

## 3. Post-Execution Adjustment Protocol
- If in `verifying` or after all tasks are completed adjustments are requested, code edits are blocked.
- Append the new task with its `[files: ...]` scope to `tasks.md`. This invalidates the approval hash and requires running `specty approve <change>` before editing source code.
