# Reglas de Tarea: Datos y Persistencia

- Aplica migraciones incrementales versionadas; no modifiques esquemas de producción manualmente.
- Indexa claves foráneas y campos frecuentes de búsqueda.
- Encapsula consultas directas tras interfaces de repositorios o datasources.
- Usa transacciones para operaciones compuestas que involucren múltiples escrituras.
