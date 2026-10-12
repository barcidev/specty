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

---

## 7. Iconography and Visual Elements in Interfaces

1. **Strict Prohibition of Unicode Symbols and Emojis as UI Icons:**
   - Never use raw Unicode symbols or emojis (e.g. ✏️, 📐, 🔍, 🗑️, ⚙️, ✕, ➕, ☰, 👁️) as icons in buttons, toolbars, navigation menus, tabs, or interactive controls.
   - Unicode glyphs suffer from inconsistent rendering across operating systems, browsers, and font fallbacks, lack vector styling precision, and convey an unfinished prototype appearance.

2. **Mandatory Use of Vector Icon Libraries:**
   - UI iconography must be implemented using clean SVG components or symbols from standard, production-ready icon libraries suitable for the project's framework.
   - If no icon library is already present in the repository, prefer selecting and installing from among the following popular and established industry standards:
     - **Lucide Icons** (`lucide-react`, `lucide-vue-next`, `lucide-angular`, `lucide-svelte`, `lucide-static`): Modern, crisp, highly compatible, and standard successor to Feather with uniform 24x24 px grid.
     - **Heroicons** (`@heroicons/react`, `@heroicons/vue`): Handcrafted for Tailwind CSS in outline, solid, and micro styles.
     - **Tabler Icons** (`@tabler/icons`, `@tabler/icons-react`, etc.): Massive library with 5,000+ consistent customizable icons.
     - **Phosphor Icons** (`@phosphor-icons/react`, `@phosphor-icons/core`): Highly versatile with multiple visual weights (regular, bold, fill, duotone).
     - **Remix Icon** (`remixicon`): Elegant, neutral open-source icon set for web and mobile interfaces.
     - **Material Symbols / Material Icons** (`@material-symbols/svg-400`, `@fontsource/material-symbols-outlined`): Google's design standard covering extensive domain concepts.
     - **FontAwesome** (`@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`): Established, battle-tested icon suite.
     - **Radix UI Icons** (`@radix-ui/react-icons`): Crisp 15x15 icons tailored for dense UI designs.
     - **Simple Icons** (`simple-icons`): Specialized SVG icons for popular technology brands and services.
     - **Iconify** (`@iconify/react`, `@iconify/vue`, etc.): Universal icon framework providing access to 100+ icon packs.
   - In environments where adding an npm dependency is restricted, provide clean, optimized inline `<svg>` elements with `stroke="currentColor"` or `fill="currentColor"`, sized via design tokens or utility classes.
