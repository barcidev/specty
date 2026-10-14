# AGENTS.md - Directrices de Asistencia con IA (specty)

<!-- specty:begin id=language -->
## 1. Idioma del Proyecto
- Todos los artefactos de especificación (`proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md`), informes de entrega y resultados de verificación DEBEN redactarse en **Español**.
- Las palabras clave estructurales del estándar OpenSpec (`ADDED Requirements`, `MODIFIED Requirements`, `REMOVED Requirements`, `Requirement:`, `Scenario:`, `WHEN`, `THEN`, `SHALL`, `MUST`) se mantienen en **Inglés**.
<!-- specty:end id=language -->

<!-- specty:begin id=orchestrator -->
## 2. Autómata de Gobernanza y Flujo de Trabajo
El asistente opera como un autómata determinista. La edición de código está estrictamente gobernada por el estado del cambio en `specty.yaml`:

| Estado | Código (`src/**`, `apps/**`) | Plan (`tasks.md`) | Acción Determinista |
| :--- | :--- | :--- | :--- |
| `draft` | **Bloqueado** | Redacción de tareas con `[files: ...]` | Ejecutar `specty view <change> --web && specty wait <change>` para aprobación |
| `approved` | Permitido en tarea 1 | Iniciar ejecución en primera casilla `- [ ]` | Iniciar turno con `specty next --card` |
| `in-progress` | Permitido **solo** en `[files: ...]` de tarea activa | **Congelado** (solo marcar `- [x]`) | Verificar con `specty verify <change>` y commitear |
| `verifying` / Ajustes | **Bloqueado** hasta re-aprobar | **Reabierto**: añadir tarea de ajuste | Registrar nueva tarea y re-aprobar con `specty approve <change>` |
| `done` | **Bloqueado** | Consolidado / archivado | Finalizar con `specty done <change>` |

### Reglas Operativas Obligatorias:
1. **Ciclo atómico por tarea:** Cada tarea en `tasks.md` sigue estrictamente: `Implementar en scope [files: ...] -> Verificar en verde -> Commit atómico (Conventional Commits) -> Marcar - [x]`. Prohibido acumular tareas en un solo commit o avanzar sin verificar la previa.
2. **Ajustes y feedback post-ejecución:** Prohibido editar código en `verifying` o tras completar tareas. Todo ajuste exige agregar primero la tarea a `tasks.md`, invalidar el hash y obtener re-aprobación con `specty approve <change>` antes de tocar archivos.
3. **Guía continua al usuario:** Al final de cada intervención, indica siempre el estado actual y el siguiente comando o acción requerida.
4. **Calidad y modularidad:** Cumple el límite de 300 líneas por archivo (SRP), inmutabilidad (`const`/`readonly`), tipado estricto (cero `any`) y scaffolding oficial (`@latest`) según `.specty/rules/core/coding-standards.md`.
<!-- specty:end id=orchestrator -->

<!-- specty:begin id=project -->
## 3. Contexto Técnico del Repositorio
- **Proyecto:** {{projectName}}
- **Estructura del Repositorio:** {{layoutTitle}}
- **Stack Principal:** {{primaryLanguage}}
- **Frameworks:** {{frameworks}}
- **Patrón de Arquitectura:** {{architecture}}
- **Motor de Especificaciones:** {{specEngine}}

### Scopes y Módulos Gobernados:
{{scopesSummary}}

### Directrices de Arquitectura:
{{structureDirectives}}
<!-- specty:end id=project -->

<!-- specty:begin id=workflow -->
## 4. Ciclo de Vida Guiado por Especificaciones
El desarrollo se rige por 5 estados: `draft` → `approved` → `in-progress` → `verifying` → `done`.
Consulta los procedimientos detallados de transición en `.specty/rules/core/workflow.md`.
<!-- specty:end id=workflow -->

<!-- specty:begin id=links -->
## 5. Referencias y Roles Modulares
- **Catálogo de Roles:** Consulta `.specty/agents/<rol>.md` para conocer responsabilidades y archivos permitidos.
- **Matriz de Enrutamiento:** Consulta `.specty/routing.md` para determinar el rol y las reglas a cargar por tarea.
- **Reglas Modulares:** Consulta `.specty/rules/` para directrices específicas de tecnología y arquitectura.
- **Estándares de Código:** Consulta `.specty/rules/core/coding-standards.md`.
{{uiDirectives}}- **Herramientas del CLI:** Puedes invocar `specty status`, `specty next`, `specty guard`, `specty verify <change>` o `specty validate [change]`. Para OpenSpec nativo, usa `specty openspec [args...]`.
<!-- specty:end id=links -->
