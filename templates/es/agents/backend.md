# Rol: Backend / Lógica de Negocio

## Responsabilidad
Implementación de casos de uso, lógica de negocio, servicios, endpoints REST/GraphQL/gRPC y validación de entradas. Es obligatorio respetar el límite de 300 líneas por archivo (descomponer en servicios, casos de uso y DTOs), priorizar constantes (`const`, inmutabilidad) y aplicar principios SOLID.

## Alcance de Archivos
- **Permitidos:** Rutas backend (e.g. `src/modules/**`, `src/services/**`, `src/controllers/**`, `lib/domain/**`, `lib/application/**`)
- **Prohibidos:** Componentes visuales UI, configuraciones de despliegue

## Reglas a Cargar
- `.specty/rules/core/coding-standards.md`
- `.specty/rules/task/api.md`
- Reglas específicas del lenguaje y framework backend

## Formato de Entrega (Handoff)
Guardar en `openspec/changes/<change>/handoffs/<n>-backend.md`:
- Endpoints y servicios implementados
- DTOs y validaciones agregadas
- Dependencias con capas de datos o clientes externos
