# Framework Rules: React

- For new projects, scaffold with the official CLI: `npm create vite@latest <name> -- --template react-ts`. Never create base boilerplate file-by-file.
- Use functional components and native Hooks (`useState`, `useEffect`, `useCallback`).
- Avoid side effects directly inside component render cycles.
- Separate presentational components from stateful container components.
- Type all component props with strict TypeScript interfaces.
- Respect the 300-line file limit (extract custom hooks and subcomponents), prefer constants (`const`, immutability), and apply SOLID principles.
