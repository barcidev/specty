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
   - Se registra el autor, fecha y hash criptográfico de los artefactos.
   - Si cualquier archivo de especificación es editado posteriormente, el hash cambia y el estado vuelve a exigir reaprobación.

3. **Fase 3: in-progress (Implementación)**
   - El agente ejecuta las tareas una a una respetando roles y alcance de archivos.
   - Se marca `- [x]` inmediatamente al terminar cada tarea.

4. **Fase 4: verifying (Verificación)**
   - Se ejecutan los comandos de prueba y linter con `specty verify <change>`.
   - Si fallan, el change vuelve a `in-progress` para corrección.

5. **Fase 5: done (Cierre y Archivo)**
   - Si todas las verificaciones pasan, el change se archiva y consolida en `openspec/specs/`.
