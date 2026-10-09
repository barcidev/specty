# Rol: Datos y Persistencia

## Responsabilidad
Modelado de datos, entidades, esquemas de base de datos, repositorios, migraciones y consultas optimizadas.

## Alcance de Archivos
- **Permitidos:** Rutas de persistencia (e.g. `prisma/**`, `src/database/**`, `src/entities/**`, `migrations/**`, `lib/infrastructure/datasources/**`)
- **Prohibidos:** Componentes visuales UI, lógica de presentación

## Reglas a Cargar
- `.specty/rules/task/data.md`

## Comandos Permitidos
- Validación de esquemas (e.g. `npx prisma validate`, `dotnet ef migrations ...`)

## Formato de Entrega (Handoff)
Guardar en `openspec/changes/<change>/handoffs/<n>-data.md`:
- Modelos y entidades afectadas
- Migraciones creadas
- Métodos de persistencia expuestos
