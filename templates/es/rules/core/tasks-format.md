# Regla Core: Formato de Tareas (Tasks Format)

Cada tarea en `tasks.md` DEBE seguir la convención estructurada de specty:

```markdown
- [ ] 1.1 <Descripción de la tarea>  [agent: <rol>] [files: <glob1>, <glob2>]
      verify: <comando de verificacion>
```

## Reglas de Sintaxis
1. **Identificador jerárquico:** Números secuenciales por fase (e.g. `1.1`, `1.2`, `2.1`).
2. **Etiqueta de agente (`[agent: ...]`)**: Debe coincidir con un rol de `.specty/agents/` (`data`, `backend`, `frontend`, `testing`, `security-review`).
3. **Alcance de archivos (`[files: ...]`)**: Lista delimitada por comas de globs permitidos para la tarea. El agente tiene prohibido editar archivos fuera de este alcance.
4. **Línea de verificación (`verify:`)**: Indentada con 6 espacios directamente debajo del ítem de la tarea. Especifica el comando real para validar la tarea.
