# Regla Core: Flujo de Trabajo (Workflow)

El desarrollo en specty sigue estrictamente 5 estados versionados:

```text
draft ──► approved ──► in-progress ──► verifying ──► done
             │
             ▼
          (reaprobación si el spec cambia)
```

1. **Fase 1: draft (Planificación)**
   - El agente orquestador redacta `proposal.md`, `design.md`, deltas en `specs/` y tareas en `tasks.md`.
   - Se prohíbe escribir código en esta fase.
   - Estado en `specty.yaml`: `status: draft`.

2. **Fase 2: approved (Aprobación Humana)**
   - El humano revisa y aprueba con `specty approve <change>`.
   - El asistente de IA tiene estrictamente prohibido autoaprobarse o alterar el estado en `specty.yaml`.
   - Se registra el autor, fecha y hash criptográfico de los artefactos.
   - Si cualquier archivo de especificación es editado posteriormente, el hash cambia y el estado vuelve a exigir reaprobación.

3. **Fase 3: in-progress (Implementación)**
   - El agente ejecuta las tareas una a una respetando roles y alcance de archivos.
   - **Ciclo atómico obligatorio por tarea:** `Implementar tarea -> Verificar -> Hacer commit de la tarea -> Marcar - [x] -> Pasar a la siguiente tarea`.
   - Está estrictamente prohibido acumular múltiples tareas en un commit o avanzar a la siguiente tarea sin haber verificado y commiteado la tarea previa.

4. **Fase 4: verifying (Verificación)**
   - Se ejecutan los comandos de prueba y linter con `specty verify <change>`.
   - Si fallan, el change vuelve a `in-progress` para corrección.

5. **Fase 5: done (Cierre y Archivo)**
   - Si todas las verificaciones pasan, el change se archiva y consolida en `openspec/specs/`.

## Orientación Continua al Usuario (Paso Siguiente Obligatorio)
En CADA respuesta o intervención, el asistente DEBE indicar de manera explícita el paso siguiente a seguir para que el usuario nunca quede desorientado:
- **Al finalizar Fase 1 (draft):** Solicitar al usuario la revisión de la propuesta e instruirlo a aprobar con `specty approve <change>`.
- **En Fase 2 (approved):** Confirmar que el change fue aprobado e indicar el inicio de la implementación señalando la primera tarea activa (`- [ ]`).
- **En Fase 3 (in-progress):** Al culminar cada turno o tarea, indicar qué tarea se completó, cuál es la siguiente tarea activa y su alcance de archivos `[files: ...]`.
- **En Fase 4 (verifying):** Indicar los resultados de verificación (`specty verify <change>`) y qué acción correctiva o de cierre procede.
- **En Fase 5 (done):** Indicar al usuario que el cambio está completamente verificado y listo para consolidarse mediante `specty done <change>`.
