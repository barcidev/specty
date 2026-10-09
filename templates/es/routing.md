# Matriz de Enrutamiento de Tareas (Task Routing)

Carga progresiva de contexto: Cada tarea activa debe cargar únicamente el rol y las reglas estrictamente necesarias para su alcance.

| Tipo de Tarea | Rol Responsable | Reglas a Cargar | Alcance Típico de Archivos |
| --- | --- | --- | --- |
| **Planificación** | `orchestrator` | `rules/core/*` | `openspec/**`, `AGENTS.md` |
| **Datos / BD** | `data` | `rules/task/data.md` | `prisma/**`, `src/database/**`, `migrations/**` |
| **Lógica / API** | `backend` | `rules/task/api.md`, `rules/lang/*` | `src/modules/**`, `src/services/**`, `lib/domain/**` |
| **Interfaz / UI** | `frontend` | `rules/task/ui.md`, `rules/framework/*` | `src/components/**`, `src/app/**`, `lib/presentation/**` |
| **Aseguramiento** | `testing` | `rules/task/testing.md` | `test/**`, `tests/**`, `**/*.spec.*` |
| **Auditoría** | `security-review`| `rules/task/security.md` | `openspec/changes/<change>/verification/**` |

## Protocolo de Simulación Secuencial (Fase 3)
En entornos donde el IDE no ejecuta sub-agentes nativos en procesos aislados, el asistente DEBE simular cada rol secuencialmente:
1. Agrupar las tareas de `tasks.md` por rol respetando el orden de dependencias:
   `data` → `backend` → `frontend` → `testing` → `security-review`.
2. Para cada rol, declarar en la sesión `[rol: <nombre>]`, cargar únicamente sus reglas y alcance de archivos.
3. Ejecutar todas las tareas asignadas a ese rol marcando `- [x]` en `tasks.md`.
4. Al culminar el rol, redactar un resumen de entrega en `handoffs/<n>-<rol>.md`.
5. El siguiente rol inicia a partir del resumen de entrega anterior sin saturar la memoria de contexto.
