# Reglas de Framework: React

- Para proyectos nuevos, genera el proyecto con el CLI oficial: `npm create vite@latest <nombre> -- --template react-ts`. Prohibido crear archivos base uno a uno.
- Usa componentes funcionales y Hooks nativos (`useState`, `useEffect`, `useCallback`).
- Evita efectos colaterales dentro del renderizado.
- Estructura componentes en presentacionales (UI pura) y contenedores (lógica de estado).
- Tipa las props mediante interfaces TypeScript estrictas.
- Respeta el límite de 300 líneas por componente (extraer custom hooks y subcomponentes), prefiere constantes (`const`, inmutabilidad) y principios SOLID.
