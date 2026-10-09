# Task Rules: Data & Persistence

- Apply versioned incremental database migrations; do not edit schemas ad-hoc.
- Index foreign keys and frequently filtered query columns.
- Encapsulate persistence logic behind repository or datasource abstractions.
- Use explicit database transactions for compound multi-table write operations.
