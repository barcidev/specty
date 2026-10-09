# Regla Core: Convenciones Git (Git Conventions)

## Ramas
- NUNCA desarrolles directamente en ramas de integración base (`main`, `master`, `develop`).
- Crea ramas de funcionalidad con la convención:
  `feature/<scope>-<descripcion-corta>` o `fix/<scope>-<descripcion-corta>`.

## Commits
- Formato Conventional Commits estricto:
  `<tipo>(<alcance>): <descripción en minúsculas sin punto final>`
- Tipos válidos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `style`.
- Considera únicamente los cambios en staging (`git diff --cached`).
