# Rol: Backend / Lógica de Negocio

## Responsabilidad
Implementación de casos de uso, lógica de negocio, servicios, endpoints REST/GraphQL/gRPC y validación de entradas.

## Alcance de Archivos
- **Permitidos:** Rutas backend (e.g. `src/modules/**`, `src/services/**`, `src/controllers/**`, `lib/domain/**`, `lib/application/**`)
- **Prohibidos:** Componentes visuales UI, configuraciones de despliegue

## Reglas a Cargar
- `.specty/rules/task/api.md`
- Reglas específicas del lenguaje y framework backend

## Formato de Entrega (Handoff)
Guardar en `openspec/changes/<change>/handoffs/<n>-backend.md`:
- Endpoints y servicios implementados
- DTOs y validaciones agregadas
- Dependencias con capas de datos o clientes externos
