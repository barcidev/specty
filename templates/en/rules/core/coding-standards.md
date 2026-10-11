# Core Rule: Coding Standards and Scaffolding (Coding Standards)

Mandatory engineering directives for all AI agents in greenfield (new) and brownfield (existing) projects.

---

## 1. Greenfield Framework Setup (Official CLI Scaffolding)

When initializing a new project or integrating a new framework or subsystem:

1. **Strict ban on file-by-file manual boilerplate creation:**
   - NEVER manually create boilerplate and core configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`, `next.config.js`, `main.ts`, etc.) file-by-file.
   - Base project scaffolding must be generated exclusively via the official ecosystem CLI tool.

2. **Mandatory use of official CLIs and latest stable version (`@latest`):**
   - Always invoke the official tool specifying the latest stable version:
     - **Next.js:** `npx create-next-app@latest <name> [flags]`
     - **Vite (React, Vue, Svelte, Vanilla):** `npm create vite@latest <name> -- --template <template>`
     - **Angular:** `npx @angular/cli@latest new <name> [flags]`
     - **NestJS:** `npx @nestjs/cli@latest new <name> [flags]`
     - **FastAPI / Python:** `uv init` or `poetry new <name>`
     - **ASP.NET Core:** `dotnet new <template> -n <name>`
     - **Flutter:** `flutter create <name>`
     - **Rust:** `cargo new <name>`
     - **Go:** `go mod init <module>`

3. **Unattended / non-interactive execution:**
   - Always supply non-interactive flags (e.g. `--yes`, `--defaults`, `--skip-git`, `--no-interactive`) to guarantee terminal execution succeeds without blocking or interactive prompts.

---

## 2. File Size Limit (Maximum 300 Lines)

1. **Maximum recommended file length:**
   - No source code file should exceed 300 lines of code whenever possible.
2. **Decomposition strategy:**
   - When a file approaches or exceeds 300 lines, immediately decompose it by applying the Single Responsibility Principle (SRP):
     - Extract secondary visual components into dedicated subcomponents.
     - Extract state logic and side effects into custom hooks, composables, or state managers.
     - Extract network calls, transformations, and algorithms into services and utility functions.
     - Move contracts, schemas, and types into dedicated files (`types.ts`, `schemas.ts`, etc.).

---

## 3. Immutability and Preference for Constants

1. **Use of constants:**
   - Always prefer `const` (or language equivalents: `readonly`, `final`, structural immutability) over mutable variables (`let`, `var`).
2. **Avoid reassignments and mutations:**
   - Minimize mutable state. When calculating or transforming data, derive a new constant.
   - Use immutable collection methods (`map`, `filter`, `reduce`) and destructuring rather than mutating existing memory structures.
   - Treat incoming parameters and props as strictly read-only.

---

## 4. SOLID Principles in Practice

Strictly apply all 5 SOLID principles in both greenfield development and brownfield refactoring:

1. **S - Single Responsibility Principle (SRP):**
   - Each class, function, module, or component must have only one reason to change and fulfill a well-defined purpose.
2. **O - Open/Closed Principle (OCP):**
   - Design code to be extensible (via interfaces, polymorphism, composition, or strategy patterns) without modifying existing, tested code.
3. **L - Liskov Substitution Principle (LSP):**
   - Any subtype or implementation of an interface must be completely substitutable for its base contract without altering system invariants.
4. **I - Interface Segregation Principle (ISP):**
   - Prefer multiple small, cohesive interfaces over monolithic contracts loaded with unused methods.
5. **D - Dependency Inversion Principle (DIP):**
   - High-level modules must not depend on low-level concrete implementations; both must depend on abstractions or interfaces. Use dependency injection.

---

## 5. Strict Typing and Clean Code

- **Zero tolerance for weak typing:** Ban the use of `any`, `Object`, or unsafe type casting without prior runtime validation.
- **Self-explanatory naming:** Use clear, intention-revealing names for variables, functions, and files that eliminate the need for redundant comments.
- **Defensive and explicit error handling:** Never silence exceptions or leave empty `catch` blocks; propagate or handle errors with actionable technical context.

---

## 6. Continuous User Guidance (Next-Step Guidance)

- **Mandatory closing instruction:** At the end of every response or turn, the agent MUST explicitly tell the user the current status and what action to take next (e.g. command to run, file to review, or approval needed). Never leave a response without a clear next step.
