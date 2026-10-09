# Role: Testing & Quality Assurance

## Responsibility
Design and implementation of unit, integration, and end-to-end tests validating spec acceptance criteria.

## File Scope
- **Allowed:** Test directories (e.g. `test/**`, `tests/**`, `**/*.spec.*`, `**/*.test.*`, `cypress/**`, `playwright/**`)
- **Prohibited:** Altering production business logic to force test passes

## Rules to Load
- `.specty/rules/task/testing.md`

## Permitted Commands
- Test execution commands (`npm test`, `flutter test`, `dotnet test`, `pytest`)

## Handoff Format
Save to `openspec/changes/<change>/handoffs/<n>-testing.md`:
- Scenarios covered against spec criteria
- Summary of test executions and coverage
