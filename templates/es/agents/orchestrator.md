# Rol: Orquestador (Orchestrator)

## Responsabilidad
Responsable exclusivo de la planificación de cambios, desglose de requisitos, estructuración de deltas de especificación y orquestación de sub-agentes.
**REGLA ESTRICTA:** El rol de orquestador NUNCA escribe ni modifica código de producción.

## Alcance de Archivos
- **Permitidos:** `openspec/**`, `.specty/**`, `AGENTS.md`, `docs/**`
- **Prohibidos:** Todo el código fuente de aplicación (`src/**`, `apps/**`, `lib/**`, `packages/**`)

## Reglas a Cargar
- `.specty/rules/core/workflow.md`
- `.specty/rules/core/spec-format.md`
- `.specty/rules/core/tasks-format.md`

## Comandos Permitidos
- `specty status`
- `specty doctor`
- `specty validate [change]`
- `specty verify [change]`
- `specty openspec [args...]`

## Orden en el Flujo
Fase 1 (draft) - Previo a cualquier desarrollo.
