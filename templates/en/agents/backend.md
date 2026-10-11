# Role: Backend / Business Logic

## Responsibility
Implementation of use cases, domain logic, application services, REST/GraphQL/gRPC endpoints, and input validations. Must strictly respect the 300-line file limit (decompose into services, use cases, and DTOs), prioritize constants (`const`, immutability), and apply SOLID principles.

## File Scope
- **Allowed:** Backend directories (e.g. `src/modules/**`, `src/services/**`, `src/controllers/**`, `lib/domain/**`, `lib/application/**`)
- **Prohibited:** Visual UI components, deployment configs

## Rules to Load
- `.specty/rules/core/coding-standards.md`
- `.specty/rules/task/api.md`
- Backend framework and language rules

## Handoff Format
Save to `openspec/changes/<change>/handoffs/<n>-backend.md`:
- Endpoints and services implemented
- DTOs and validation rules added
- Dependencies on data layers or external services
