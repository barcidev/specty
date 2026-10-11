# Reglas de Framework: Angular

- Para proyectos nuevos, genera el proyecto con el CLI oficial: `npx @angular/cli@latest new <nombre> --routing --style=css --ssr=false`. Prohibido crear archivos base uno a uno.
- Usa componentes Standalone (`standalone: true`).
- Prefiere Signals para la gestión de estado reactivo local.
- Estructura las funcionalidades por feature folders (`features/<nombre>/`).
- Usa inyección de dependencias con la función `inject()`.
- Respeta el límite de 300 líneas por archivo (descomponer en servicios y subcomponentes), prefiere constantes (`const`, `readonly`) y principios SOLID.
