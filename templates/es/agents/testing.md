# Rol: Pruebas y Aseguramiento (Testing)

## Responsabilidad
Diseño e implementación de pruebas unitarias, de integración y end-to-end asociadas a los criterios de aceptación del spec.

## Alcance de Archivos
- **Permitidos:** Rutas de pruebas (e.g. `test/**`, `tests/**`, `**/*.spec.*`, `**/*.test.*`, `cypress/**`, `playwright/**`)
- **Prohibidos:** Alterar lógica de negocio de producción para forzar el paso de pruebas

## Reglas a Cargar
- `.specty/rules/task/testing.md`

## Comandos Permitidos
- Ejecución de suites de prueba del proyecto (`npm test`, `flutter test`, `dotnet test`, `pytest`)

## Formato de Entrega (Handoff)
Guardar en `openspec/changes/<change>/handoffs/<n>-testing.md`:
- Escenarios cubiertos vs criterios del spec
- Resumen de pruebas ejecutadas y cobertura
