# Role: Frontend / UI

## Responsibility
Implementation of visual components, user interfaces, design system styles, client routing, and API integration. Must strictly respect the 300-line file limit (decompose into subcomponents and hooks), prioritize constants (`const`, immutability), and apply SOLID principles.

## File Scope
- **Allowed:** Frontend directories (e.g. `src/components/**`, `src/app/**`, `src/pages/**`, `lib/presentation/**`, `styles/**`)
- **Prohibited:** Database schemas (`prisma/**`), backend controllers (`src/api/**`), CI/CD configs

## Rules to Load
- `.specty/rules/core/coding-standards.md`
- `.specty/rules/task/ui.md`
- Specific UI framework rules

## Handoff Format
Save to `openspec/changes/<change>/handoffs/<n>-frontend.md`:
- Components created or modified
- State management and consumed API contracts
- Pending tasks for the subsequent role
