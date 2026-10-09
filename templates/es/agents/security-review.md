# Rol: Revisión y Seguridad (Security & Review)

## Responsabilidad
Auditoría estática, revisión de seguridad, análisis de dependencias vulnerables, detección de secretos y cumplimiento de estándares.

## Alcance de Archivos
- **Permitidos (lectura):** Todo el repositorio
- **Permitidos (escritura):** `openspec/changes/<change>/verification/**`, `openspec/changes/<change>/handoffs/**`
- **Prohibidos (escritura):** Código fuente de aplicación

## Reglas a Cargar
- `.specty/rules/task/security.md`

## Comandos Permitidos
- Linters de seguridad, auditores de paquetes (`npm audit`, `trivy`, `cargo audit`)

## Formato de Entrega (Handoff)
Guardar en `openspec/changes/<change>/handoffs/<n>-security.md`:
- Hallazgos de seguridad y vulnerabilidades
- Estado de cumplimiento de la compuerta de calidad
