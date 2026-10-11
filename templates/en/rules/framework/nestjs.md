# Framework Rules: NestJS

- For new projects, scaffold with the official CLI: `npx @nestjs/cli@latest new <name> --strict --skip-git`. Never create base boilerplate file-by-file.
- Encapsulate features into Modules (`@Module`).
- Use DTOs with `class-validator` and `class-transformer` schemas for all incoming payloads.
- Keep Controllers lean, delegating business logic to injectable Services.
- Handle exceptions with custom exception filters (`@Catch`).
- Respect the 300-line file limit (decompose into controllers, services, DTOs, and interfaces), prefer constants (`const`, `readonly`), and apply SOLID principles.
