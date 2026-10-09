# AGENTS.md - Directrices de Asistencia con IA (specty)

<!-- specty:begin id=language -->
## 1. Idioma del Proyecto
- Todos los artefactos de especificación (`proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md`), informes de entrega y resultados de verificación DEBEN redactarse en **Español**.
- Las palabras clave estructurales del estándar OpenSpec (`ADDED Requirements`, `MODIFIED Requirements`, `REMOVED Requirements`, `Requirement:`, `Scenario:`, `WHEN`, `THEN`, `SHALL`, `MUST`) se mantienen en **Inglés**.
<!-- specty:end id=language -->

<!-- specty:begin id=orchestrator -->
## 2. Reglas Duras del Orquestador (Gobernanza Estricta)
1. **Sin código sin aprobación:** NUNCA generes ni modifiques código de producción (`src/**`, `apps/**`, `lib/**`) sin un change aprobado con estado `status: approved` en `openspec/changes/<change>/specty.yaml`.
2. **Alcance delimitado por tarea:** NUNCA modifiques archivos fuera del patrón `[files: ...]` definido para la tarea activa en `tasks.md`.
3. **Verificación obligatoria ejecutable:** Cada tarea y cambio completado DEBE ser verificado ejecutando comandos reales de prueba y linter. No inventes resultados de verificación.
4. **Reanudación de sesión:** Al iniciar cualquier interacción, lee `specty.yaml` y `tasks.md` del change activo y reanuda desde la primera tarea sin marcar (`- [ ]`).
<!-- specty:end id=orchestrator -->

<!-- specty:begin id=project -->
## 3. Contexto Técnico del Repositorio
- **Proyecto:** {{projectName}}
- **Stack Principal:** {{primaryLanguage}}
- **Frameworks:** {{frameworks}}
- **Patrón de Arquitectura:** {{architecture}}
- **Motor de Especificaciones:** {{specEngine}}
<!-- specty:end id=project -->

<!-- specty:begin id=workflow -->
## 4. Ciclo de Vida Guiado por Especificaciones
El desarrollo se rige por un flujo de 5 fases estrictas:
`draft` → `approved` → `in-progress` → `verifying` → `done`

1. **Fase 1 (draft):** El agente orquestador planifica la funcionalidad redactando `proposal.md`, `design.md`, los deltas en `specs/` y las tareas en `tasks.md`. No escribe código de aplicación.
2. **Fase 2 (aprobación humana):** El desarrollador revisa la especificación y ejecuta `specty approve <change>` (o marca `status: approved` en `specty.yaml`). El hash de contenido queda registrado.
3. **Fase 3 (in-progress):** Solo tras la aprobación, se ejecutan las tareas en secuencia respetando los roles y el alcance de archivos.
4. **Fase 4 (verifying):** Se ejecutan los comandos de verificación del stack y criterios de aceptación con `specty verify <change>`.
5. **Fase 5 (done & archivo):** Si todas las pruebas pasan, el change se archiva y consolida en `openspec/specs/`.
<!-- specty:end id=workflow -->

<!-- specty:begin id=links -->
## 5. Referencias y Roles Modulares
- **Catálogo de Roles:** Consulta `.specty/agents/<rol>.md` para conocer responsabilidades y archivos permitidos.
- **Matriz de Enrutamiento:** Consulta `.specty/routing.md` para determinar el rol y las reglas a cargar por tarea.
- **Reglas Modulares:** Consulta `.specty/rules/` para directrices específicas de tecnología y arquitectura.
- **Herramientas del CLI:** Puedes invocar comandos de specty vía `specty status`, `specty verify <change>` o `specty approve <change>`. Si usas OpenSpec, puedes invocar comandos directos con `specty openspec -- <args>`.
<!-- specty:end id=links -->
