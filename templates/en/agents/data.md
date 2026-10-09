# Role: Data & Persistence

## Responsibility
Data modeling, database entities, ORM schemas, database migrations, and repository implementations.

## File Scope
- **Allowed:** Persistence directories (e.g. `prisma/**`, `src/database/**`, `src/entities/**`, `migrations/**`, `lib/infrastructure/datasources/**`)
- **Prohibited:** Visual UI components, presentation logic

## Rules to Load
- `.specty/rules/task/data.md`

## Permitted Commands
- Schema validation commands (e.g. `npx prisma validate`, `dotnet ef migrations ...`)

## Handoff Format
Save to `openspec/changes/<change>/handoffs/<n>-data.md`:
- Modified models and entities
- Migrations created
- Repository methods exposed
