# Matriz de Enrutamiento (Task Routing)

Carga progresiva: cada tarea activa carga exclusivamente el rol y reglas de su alcance.

| Tipo de Tarea | Rol | Reglas a Cargar | Alcance de Archivos |
| :--- | :--- | :--- | :--- |
| **Planificación** | `orchestrator` | `rules/core/*` | `openspec/**`, `AGENTS.md` |
| **Datos / BD** | `data` | `rules/task/data.md` | `prisma/**`, `src/database/**` |
| **Lógica / API** | `backend` | `rules/task/api.md`, `rules/lang/*` | `src/modules/**`, `src/services/**` |
| **Interfaz / UI** | `frontend` | `rules/task/ui.md`, `rules/framework/*` | `src/components/**`, `src/app/**` |
| **Pruebas** | `testing` | `rules/task/testing.md` | `test/**`, `tests/**`, `**/*.spec.*` |
| **Auditoría** | `security-review` | `rules/task/security.md` | `openspec/changes/<change>/verification/**` |

## Protocolo de Ejecución por Roles
1. Agrupar tareas por rol en orden: `data` → `backend` → `frontend` → `testing` → `security-review`.
2. Para cada rol, declarar `[rol: <nombre>]`, cargar solo sus reglas y ejecutar sus tareas (`- [x]`).
3. Registrar entrega breve en `handoffs/<n>-<rol>.md` antes de transferir el contexto al siguiente rol.
