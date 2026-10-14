# Core Rule: Coding Standards and Scaffolding (Coding Standards)

Mandatory engineering directives for AI agents across new and existing codebases.

## 1. Official Scaffolding (New Projects & Modules)
- **Tool-assisted generation:** Initial boilerplate and base configuration files (`package.json`, `tsconfig.json`, etc.) MUST be generated using the official ecosystem CLI (`@latest`) with non-interactive flags (e.g. `--yes`, `--defaults`, `--skip-git`).
{{scaffoldingTip}}- **Prohibition:** NEVER manually create base project boilerplate file-by-file.

## 2. File Size Limit (Maximum 300 Lines)
- No source code file should exceed 300 lines.
- Apply SRP: extract subcomponents, custom hooks/services, pure functions, and contracts (`types.ts`) into separate modules before exceeding the limit.

## 3. Immutability and Clean Code
- **Constants:** Prefer `const`, `readonly`, and structural immutability over mutable variables. Avoid mutations and reassignments (`map`, `filter`, spread).
- **Strict typing:** Forbid `any`, `Object`, or unsafe type casting.
- **Intentional naming:** Self-explanatory names without redundant comments; explicit error handling with no empty `catch` blocks.

## 4. SOLID Principles
- **S (SRP):** Single reason to change per module, class, or function.
- **O (OCP):** Open for extension, closed for modification.
- **L (LSP):** Subtypes must be substitutable for base contracts.
- **I (ISP):** Small, focused interfaces over monolithic contracts.
- **D (DIP):** Depend on abstractions via dependency injection.

## 5. UI Iconography
- **Prohibition:** NEVER use raw Unicode symbols or emojis (e.g. ✏️, 🔍, ⚙️, ✕) as icons in buttons, toolbars, or interactive controls.
- **SVG vectors:** Use clean SVG components or the project's installed icon library (e.g. Lucide, Heroicons, or inline SVG with `currentColor`).
