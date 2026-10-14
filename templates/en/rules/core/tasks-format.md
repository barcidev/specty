# Core Rule: Tasks Format

Each task in `tasks.md` MUST follow the specty structured convention:

```markdown
- [ ] 1.1 <Task description>  [agent: <role>] [files: <glob1>, <glob2>]
      verify: <verification command>
```

## Syntax Rules and Lifecycle
1. **Hierarchical identifier:** Sequential numbers per phase (e.g. `1.1`, `1.2`, `2.1`).
2. **Agent tag (`[agent: ...]`)**: Must match a catalog role from `.specty/agents/` (`data`, `backend`, `frontend`, `testing`, `security-review`).
3. **File scope tag (`[files: ...]`)**: Comma-separated list of globs allowed for the task. The agent is prohibited from modifying files outside this scope.
4. **Verification line (`verify:`)**: Indented with 6 spaces beneath the task item. Specifies the concrete command to validate the task.
5. **Immutability during execution (`in-progress`):** While the plan is in progress and tasks are pending, `tasks.md` remains frozen. The only permitted modification is transitioning checkboxes from `- [ ]` to `- [x]` after verifying and committing each task atomically.
6. **Reopening for adjustments (`verifying` / post-execution):** If adjustments are required during verification or after completing tasks, code is blocked and `tasks.md` reopens. You must append the new task with its `[files: ...]` scope, which invalidates the approval hash and requires re-approval via `specty approve <change>` before modifying files.
7. **Mandatory atomic task management:** To query, complete, or add tasks, ALWAYS use `specty task (next, list, add, complete)` or MCP `specty_task_*` tools. Modifying `tasks.md` manually with text tools is forbidden when task commands or MCP tools are available.
