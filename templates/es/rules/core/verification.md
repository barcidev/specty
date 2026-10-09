# Regla Core: Verificación Ejecutable (Verification)

La verificación en specty se basa en pruebas y comandos de consola reales, no en auto-revisión discursiva del modelo.

## Reglas
1. **Comandos reales:** Siempre ejecuta el comando indicado en la tarea o en los criterios de aceptación del spec.
2. **Salida auditable:** La salida de la ejecución se almacena en `openspec/changes/<change>/verification/<timestamp>.md`.
3. **Compuerta de calidad:** Para marcar una tarea como completada (`- [x]`), su comando de verificación debe retornar código de salida `0`.
4. **Comandos no autorizados:** Si un comando no está en la lista de comandos permitidos del stack, el asistente debe solicitar autorización explícita antes de ejecutarlo.
