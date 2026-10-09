# Reglas de Framework: NestJS

- Encapsula la lógica en Módulos (`@Module`).
- Usa DTOs validados con `class-validator` y `class-transformer` para cada endpoint.
- Mantén los controladores delgados delegando toda la lógica en Servicios inyectables.
- Maneja excepciones con filtros de excepción (`@Catch`).
