# Framework Rules: Next.js

- For new projects, scaffold with the official CLI: `npx create-next-app@latest <name> --ts --app --no-interactive`. Never create base boilerplate file-by-file.
- Standardize on the App Router (`app/`).
- Default to React Server Components; mark with `'use client'` only for interactive client hooks and browser events.
- Manage data mutations with Server Actions or Route Handlers.
- Respect the 300-line file limit (decompose into subcomponents and server actions), prefer constants (`const`), and apply SOLID principles.
