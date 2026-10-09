# Framework Rules: ASP.NET Core

- Group Minimal APIs or Controllers cleanly around functional domains.
- Handle unhandled exceptions globally using `ProblemDetails` middleware.
- Configure dependency injection with appropriate lifetimes (`Scoped` for database contexts/repositories).
