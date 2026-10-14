# Regla Core: Formato de Tareas (Tasks Format)

Cada tarea en `tasks.md` DEBE seguir la convención estructurada de specty:

```markdown
- [ ] 1.1 <Descripción de la tarea>  [agent: <rol>] [files: <glob1>, <glob2>]
      verify: <comando de verificacion>
```

## Reglas de Sintaxis y Ciclo de Vida
1. **Identificador jerárquico:** Números secuenciales por fase (e.g. `1.1`, `1.2`, `2.1`).
2. **Etiqueta de agente (`[agent: ...]`)**: Debe coincidir con un rol de `.specty/agents/` (`data`, `backend`, `frontend`, `testing`, `security-review`).
3. **Alcance de archivos (`[files: ...]`)**: Lista delimitada por comas de globs permitidos para la tarea. El agente tiene prohibido editar archivos fuera de este alcance.
4. **Línea de verificación (`verify:`)**: Indentada con 6 espacios directamente debajo del ítem de la tarea. Especifica el comando real para validar la tarea.
5. **Inmutabilidad en ejecución (`in-progress`):** Mientras el plan esté en ejecución y existan tareas pendientes, `tasks.md` está congelado. Solo se permite marcar casillas de `- [ ]` a `- [x]` tras verificar y commitear cada tarea atómicamente.
6. **Reapertura para ajustes (`verifying` / post-ejecución):** Si en verificación o tras completar las tareas se requieren ajustes, el código queda bloqueado y `tasks.md` se reabre. Se debe agregar la nueva tarea con su alcance `[files: ...]`, lo cual invalida el hash y exige re-aprobación con `specty approve <change>` antes de modificar archivos.
7. **Gestión atómica obligatoria:** Para consultar, avanzar o agregar tareas, usa SIEMPRE `specty task (next, list, add, complete)` o las herramientas MCP `specty_task_*`. Queda prohibido manipular `tasks.md` manualmente con herramientas de texto cuando existan comandos del CLI o MCP.
