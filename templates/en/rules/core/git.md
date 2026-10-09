# Core Rule: Git Conventions

## Branches
- NEVER develop directly on base integration branches (`main`, `master`, `develop`).
- Create feature branches with the convention:
  `feature/<scope>-<short-description>` or `fix/<scope>-<short-description>`.

## Commits
- Strict Conventional Commits format:
  `<type>(<scope>): <lowercase imperative description without period>`
- Valid types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `style`.
- Consider only staged changes (`git diff --cached`).
