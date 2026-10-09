# Core Rule: Executable Verification

Verification in specty relies on real terminal commands and test suites, not conversational self-affirmation by the model.

## Rules
1. **Real commands:** Always execute the specific command listed in the task or the spec acceptance criteria.
2. **Auditable logs:** Execution stdout and stderr are recorded under `openspec/changes/<change>/verification/<timestamp>.md`.
3. **Quality gate:** To check off a task (`- [x]`), its verification command must exit with code `0`.
4. **Unauthorized commands:** If a command is not part of the allowed stack defaults, the assistant must request explicit authorization before running it.
