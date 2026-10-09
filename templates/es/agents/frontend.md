# Rol: Frontend / UI

## Responsabilidad
Implementación de componentes visuales, interfaces de usuario, estilos, navegación del cliente y consumo de APIs.

## Alcance de Archivos
- **Permitidos:** Rutas UI de la aplicación (e.g. `src/components/**`, `src/app/**`, `src/pages/**`, `lib/presentation/**`, `styles/**`)
- **Prohibidos:** Esquemas de base de datos (`prisma/**`), controladores backend (`src/api/**`), configuraciones de CI/CD

## Reglas a Cargar
- `.specty/rules/task/ui.md`
- Reglas específicas del framework UI detectado

## Formato de Entrega (Handoff)
Guardar en `openspec/changes/<change>/handoffs/<n>-frontend.md`:
- Componentes creados o modificados
- Manejo de estados y contratos de API utilizados
- Tareas pendientes para el siguiente rol
