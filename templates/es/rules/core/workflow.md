# Regla Core: Flujo de Trabajo (Workflow)

El desarrollo en specty sigue un autómata determinista de 5 estados:

```text
draft ──► approved ──► in-progress ──► verifying ──► done
             │              │             │
             ▲              └─────────────┘ (ajustes reabren plan y exigen re-aprobación)
```

## 1. Matriz de Estados y Acciones
| Fase | Estado | Código de Producción | Plan (`tasks.md`) | Acción Clave |
| :--- | :--- | :--- | :--- | :--- |
| **1. Planificación** | `draft` | **Bloqueado** | Redacción inicial con `[files: ...]` | `specty view <change> --web && specty wait <change>` |
| **2. Aprobación** | `approved` | Permitido en tarea activa | Congelado | `specty approve <change>` (solo humano) |
| **3. Ejecución** | `in-progress` | Restringido a `[files: ...]` activo | Congelado (solo marcar `- [x]`) | `specty verify <change>` |
| **4. Verificación** | `verifying` | **Bloqueado** sin tarea abierta | **Reabierto** para tareas de ajuste | `specty verify <change>` / `specty approve <change>` |
| **5. Cierre** | `done` | **Bloqueado** | Consolidado | `specty done <change>` |

## 2. Ciclo Atómico por Tarea
Cada tarea en `tasks.md` se ejecuta bajo secuencia estricta:
1. **Implementar:** Modificar únicamente archivos del scope `[files: ...]`.
2. **Verificar:** Ejecutar pruebas del stack en verde (`specty verify <change>`).
3. **Commit:** Crear un commit git atómico (Conventional Commits) dejando árbol limpio.
4. **Avanzar:** Marcar `- [x]` y pasar a la siguiente tarea activa.
*Prohibido acumular múltiples tareas en un commit o avanzar sin verificar la previa.*

## 3. Protocolo de Ajustes Post-Ejecución
- Si en `verifying` o tras completar el plan se requieren ajustes, el código queda bloqueado.
- Agrega la nueva tarea con su scope `[files: ...]` a `tasks.md`. Esto invalida el hash y exige ejecutar `specty approve <change>` antes de modificar archivos.
