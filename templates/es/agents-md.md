# AGENTS.md - Directrices de Asistencia con IA (specty)

<!-- specty:begin id=language -->
## 1. Idioma del Proyecto
- Todos los artefactos de especificación (`proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md`), informes de entrega y resultados de verificación DEBEN redactarse en **Español**.
- Las palabras clave estructurales del estándar OpenSpec (`ADDED Requirements`, `MODIFIED Requirements`, `REMOVED Requirements`, `Requirement:`, `Scenario:`, `WHEN`, `THEN`, `SHALL`, `MUST`) se mantienen en **Inglés**.
<!-- specty:end id=language -->

<!-- specty:begin id=orchestrator -->
## 2. Reglas Duras del Orquestador (Gobernanza Estricta)
1. **Sin código sin aprobación:** NUNCA generes ni modifiques código de producción (`src/**`, `apps/**`, `lib/**`) sin un change aprobado con estado `status: approved` en `openspec/changes/<change>/specty.yaml`. El asistente de IA NO PUEDE autoaprobar cambios.
2. **Alcance delimitado por tarea:** NUNCA modifiques archivos fuera del patrón `[files: ...]` definido para la tarea activa en `tasks.md`.
3. **Verificación obligatoria ejecutable:** Cada tarea y cambio completado DEBE ser verificado ejecutando comandos reales de prueba y linter. No inventes resultados de verificación.
4. **Reanudación de sesión:** Al iniciar cualquier interacción, lee `specty.yaml` y `tasks.md` del change activo y reanuda desde la primera tarea sin marcar (`- [ ]`).
5. **Orientación mediante `specty next`:** Al inicio de cada turno, invoca `specty next --card` o lee la tarjeta de estado para anclar tu contexto de ejecución (`[change: <id> | status: ... | task: ... | next: ...]`).
6. **Intercepción dura de herramientas (`specty guard`):** Todas las modificaciones de archivos y llamadas a bash son interceptadas por `specty guard`. Cualquier edición fuera del alcance `[files: ...]` de la tarea activa o sin una especificación aprobada será bloqueada de inmediato.
7. **Scaffolding oficial con CLI (`@latest`):** Para proyectos o módulos nuevos, la configuración y boilerplate base DEBE generarse mediante el CLI oficial del framework respectivo (`npm create vite@latest`, `npx create-next-app@latest`, `ng new`, `nest new`, etc.) con flags no interactivos y garantizando la versión más actual. NUNCA crees el boilerplate archivo por archivo manualmente.
8. **Estándares de calidad y límite de 300 líneas:** Ningún archivo debe exceder las 300 líneas de código en la medida de lo posible (descomponer aplicando SRP). Prefiere constantes (`const`, `readonly`, inmutabilidad) sobre variables mutables y aplica rigurosamente principios SOLID tanto en código nuevo como existente. Consulta `.specty/rules/core/coding-standards.md`.
9. **Guía proactiva y paso siguiente obligatorio:** En CADA respuesta o intervención, el asistente DEBE indicar explícitamente al usuario el estado de situación y cuál es el paso siguiente inmediato o qué acción se espera de su parte (ej. comando a ejecutar como `specty approve <change>`, revisión de archivos de especificación o validación de pruebas), asegurando que el usuario nunca se quede perdido o sin claridad de acción.
10. **Apertura Proactiva de Interfaz y Espera Reactiva (`specty view` y `specty wait`):** Inmediatamente al redactar o actualizar la especificación inicial (`proposal.md`, `tasks.md`), el asistente DEBE ejecutar proactivamente `specty view <change> --web && specty wait <change>` (o invocar `specty_wait_action`) para levantar y proyectar la interfaz web local de Specty y pausar su ejecución a la espera de que el usuario apruebe o solicite cambios desde la UI con un solo clic. Si el entorno no soporta procesos en segundo plano, presenta obligatoriamente el dashboard detallado del plan en el chat con las opciones manuales (`specty approve <change>`, rechazar con solicitudes de ajuste, `specty validate <change>`). NUNCA comiences a modificar código sin aprobación previa del usuario.
11. **Flujo Atómico por Tarea Obligatorio (`Implementar -> Verificar -> Commit -> Siguiente Tarea`):** Cada tarea de `tasks.md` DEBE ejecutarse bajo un ciclo estrictamente secuencial y atómico:
    1. **Implementar tarea:** Modificar exclusivamente los archivos dentro del alcance `[files: ...]`.
    2. **Verificar:** Ejecutar las pruebas unitarias y linters correspondientes (`specty verify <change>`, comandos de prueba del stack) asegurando que pasen en verde.
    3. **Hacer commit de la tarea:** Crear un commit git atómico para esa tarea específica utilizando Conventional Commits (`feat(...)`, `fix(...)`, `refactor(...)`, etc.), dejando el árbol de trabajo limpio.
    4. **Marcar y avanzar:** Marcar la tarea como completada (`- [x]`) y pasar a la siguiente tarea activa.
    Está ESTRICTAMENTE PROHIBIDO acumular múltiples tareas en un solo commit o avanzar a la siguiente tarea sin haber verificado y commiteado la tarea previa.
<!-- specty:end id=orchestrator -->

<!-- specty:begin id=project -->
## 3. Contexto Técnico del Repositorio
- **Proyecto:** {{projectName}}
- **Estructura del Repositorio:** {{layoutTitle}}
- **Stack Principal:** {{primaryLanguage}}
- **Frameworks:** {{frameworks}}
- **Patrón de Arquitectura:** {{architecture}}
- **Motor de Especificaciones:** {{specEngine}}

### Scopes y Módulos Gobernados:
{{scopesSummary}}

### Directrices de Arquitectura:
{{structureDirectives}}
<!-- specty:end id=project -->

<!-- specty:begin id=workflow -->
## 4. Ciclo de Vida Guiado por Especificaciones
El desarrollo se rige por un flujo de 5 fases estrictas:
`draft` → `approved` → `in-progress` → `verifying` → `done`

1. **Fase 1 (draft):** El agente orquestador planifica la funcionalidad redactando `proposal.md`, `design.md`, los deltas en `specs/` y las tareas en `tasks.md`. No escribe código de aplicación.
2. **Fase 2 (aprobación humana):** El desarrollador humano revisa la especificación y aprueba de forma interactiva con `specty approve <change>` o desde la interfaz visual web (`specty view <change> --web && specty wait <change>`). El asistente de IA tiene ESTRICTAMENTE PROHIBIDO ejecutar comandos de aprobación o modificar manualmente el estado de aprobación en `specty.yaml`. El hash de contenido queda registrado.
3. **Fase 3 (in-progress):** Solo tras la aprobación, se ejecutan las tareas una a una siguiendo obligatoriamente el ciclo atómico: `Implementar tarea -> Verificar -> Hacer commit de la tarea -> Marcar - [x] -> Pasar a la siguiente tarea`. No comiences una nueva tarea sin haber verificado y commiteado la anterior.
4. **Fase 4 (verifying):** Se ejecutan los comandos de verificación del stack y criterios de aceptación con `specty verify <change>`.
5. **Fase 5 (done & archivo):** Si todas las pruebas pasan, el change se archiva y consolida en `openspec/specs/`.
<!-- specty:end id=workflow -->

<!-- specty:begin id=links -->
## 5. Referencias y Roles Modulares
- **Catálogo de Roles:** Consulta `.specty/agents/<rol>.md` para conocer responsabilidades y archivos permitidos.
- **Matriz de Enrutamiento:** Consulta `.specty/routing.md` para determinar el rol y las reglas a cargar por tarea.
- **Reglas Modulares:** Consulta `.specty/rules/` para directrices específicas de tecnología y arquitectura.
- **Estándares de Código y Scaffolding:** Consulta `.specty/rules/core/coding-standards.md` para directrices obligatorias de scaffolding con CLI oficial, modularidad (<= 300 líneas), inmutabilidad y SOLID.
{{uiDirectives}}- **Herramientas del CLI:** Puedes invocar comandos de specty vía `specty status`, `specty next`, `specty guard`, `specty verify <change>` o `specty validate [change]`. Si usas OpenSpec, puedes invocar comandos directos con `specty openspec [args...]`.
<!-- specty:end id=links -->
