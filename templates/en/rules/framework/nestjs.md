# Framework Rules: NestJS

- Encapsulate features in cohesive Modules (`@Module`).
- Enforce input DTO validation using `class-validator` and `class-transformer`.
- Keep Controllers thin by delegating business logic to injectable Services.
- Handle application errors via central Exception Filters.
