# Core Rule: Tasks Format

Each task in `tasks.md` MUST follow the specty structured convention:

```markdown
- [ ] 1.1 <Task description>  [agent: <role>] [files: <glob1>, <glob2>]
      verify: <verification command>
```

## Syntax Rules
1. **Hierarchical identifier:** Sequential numbers per phase (e.g. `1.1`, `1.2`, `2.1`).
2. **Agent tag (`[agent: ...]`)**: Must match a catalog role from `.specty/agents/` (`data`, `backend`, `frontend`, `testing`, `security-review`).
3. **File scope tag (`[files: ...]`)**: Comma-separated list of globs allowed for the task. The agent is prohibited from modifying files outside this scope.
4. **Verification line (`verify:`)**: Indented with 6 spaces beneath the task item. Specifies the concrete command to validate the task.
