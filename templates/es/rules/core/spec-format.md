# Regla Core: Formato de Especificaciones (Spec Format)

Cada change debe estructurarse con los siguientes artefactos:

1. `proposal.md`:
   - `## Why`: Justificación de negocio y contexto del cambio.
   - `## What Changes`: Lista de modificaciones y adiciones de comportamiento.
   - `## Capabilities`: Especificación de capacidades nuevas o modificadas.
   - `## Impact`: Dependencias, APIs y riesgos.

2. `design.md`:
   - Decisiones técnicas de implementación, arquitectura y diseño de componentes.

3. `specs/<capacidad>/spec.md`:
   - Deltas de requisitos usando encabezados estándar en inglés:
     - `## ADDED Requirements`
     - `## MODIFIED Requirements`
     - `## REMOVED Requirements`
   - Formato de requisitos:
     ```markdown
     ### Requirement: <Nombre del Requisito>
     The system SHALL <comportamiento observable>.

     #### Scenario: <Nombre del Escenario>
     - **WHEN** <condición de activación>
     - **THEN** <resultado esperado>
     ```

4. `specty.yaml`:
   - Estado de gobernanza, aprobación y hash de contenido.
