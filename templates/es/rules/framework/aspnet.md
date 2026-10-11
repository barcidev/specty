# Reglas de Framework: ASP.NET Core

- Para proyectos nuevos, genera el proyecto con el CLI oficial: `dotnet new webapi -n <nombre>`. Prohibido crear archivos base uno a uno manualmente.
- Usa Minimal APIs o Controllers agrupados por dominios funcionales.
- Implementa filtros de acción o middleware para manejo global de errores (`ProblemDetails`).
- Inyecta dependencias con scopes correctos (`Scoped` para repositorios/contextos de datos).
- Respeta el límite de 300 líneas por archivo (descomponer en controladores, servicios y DTOs), prefiere tipos inmutables (`record`, `readonly`) y principios SOLID.
