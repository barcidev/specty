# Framework Rules: Angular

- For new projects, scaffold with the official CLI: `npx @angular/cli@latest new <name> --routing --style=css --ssr=false`. Never create base boilerplate file-by-file.
- Use standalone components (`standalone: true`).
- Prefer Angular Signals for fine-grained local reactive state.
- Structure codebase around feature folders (`features/<name>/`).
- Prefer dependency injection using the modern `inject()` function.
- Respect the 300-line file limit (decompose into services and subcomponents), prefer constants (`const`, `readonly`), and apply SOLID principles.
