# Reglas de Framework: Next.js

- Para proyectos nuevos, genera el proyecto con el CLI oficial: `npx create-next-app@latest <nombre> --ts --app --no-interactive`. Prohibido crear archivos base uno a uno.
- Usa App Router (`app/`).
- Mantén componentes como Server Components por defecto; usa `'use client'` únicamente cuando se requiera interactividad o estado del navegador.
- Maneja datos con Server Actions o Route Handlers.
- Respeta el límite de 300 líneas por archivo (descomponer en subcomponentes y server actions), prefiere constantes (`const`) y principios SOLID.
