# Reglas de Framework: NestJS

- Para proyectos nuevos, genera el proyecto con el CLI oficial: `npx @nestjs/cli@latest new <nombre> --strict --skip-git`. Prohibido crear archivos base uno a uno.
- Encapsula la lógica en Módulos (`@Module`).
- Usa DTOs validados con `class-validator` y `class-transformer` para cada endpoint.
- Mantén los controladores delgados delegando toda la lógica en Servicios inyectables.
- Maneja excepciones con filtros de excepción (`@Catch`).
- Respeta el límite de 300 líneas por archivo (descomponer en controladores, servicios, DTOs e interfaces), prefiere constantes (`const`, `readonly`) y principios SOLID.
