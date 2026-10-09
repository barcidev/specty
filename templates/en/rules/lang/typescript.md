# Technology Rules: TypeScript

- Enable strict compiler flags (`strict: true`, `noImplicitAny: true`).
- Avoid `any`; use `unknown`, generics, or discriminated unions.
- Prefer immutability and pure functions for domain logic.
- Use explicit type-only imports (`import type { ... }`).
- Use ESM and explicit `.js` extensions on relative module paths when targeting NodeNext.
