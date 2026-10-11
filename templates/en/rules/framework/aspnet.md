# Framework Rules: ASP.NET Core

- For new projects, scaffold with the official CLI: `dotnet new webapi -n <name>`. Never create base boilerplate file-by-file manually.
- Group Minimal APIs or Controllers cleanly around functional domains.
- Handle unhandled exceptions globally using `ProblemDetails` middleware.
- Configure dependency injection with appropriate lifetimes (`Scoped` for database contexts/repositories).
- Respect the 300-line file limit (decompose into controllers, services, and DTOs), prefer immutable types (`record`, `readonly`), and apply SOLID principles.
