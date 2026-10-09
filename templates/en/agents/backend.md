# Role: Backend / Business Logic

## Responsibility
Implementation of use cases, domain logic, application services, REST/GraphQL/gRPC endpoints, and input validations.

## File Scope
- **Allowed:** Backend directories (e.g. `src/modules/**`, `src/services/**`, `src/controllers/**`, `lib/domain/**`, `lib/application/**`)
- **Prohibited:** Visual UI components, deployment configs

## Rules to Load
- `.specty/rules/task/api.md`
- Backend framework and language rules

## Handoff Format
Save to `openspec/changes/<change>/handoffs/<n>-backend.md`:
- Endpoints and services implemented
- DTOs and validation rules added
- Dependencies on data layers or external services
