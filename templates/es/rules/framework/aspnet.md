# Reglas de Framework: ASP.NET Core

- Usa Minimal APIs o Controllers agrupados por dominios funcionales.
- Implementa filtros de acción o middleware para manejo global de errores (`ProblemDetails`).
- Inyecta dependencias con scopes correctos (`Scoped` para repositorios/contextos de datos).
