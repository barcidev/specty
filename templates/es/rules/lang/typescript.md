# Reglas de Tecnología: TypeScript

- Usa modo estricto en el compilador (`strict: true`, `noImplicitAny: true`).
- Evita el tipo `any`; utiliza `unknown`, genéricos o tipos discriminados.
- Prefiere inmutabilidad y funciones puras para la lógica de dominio.
- Exporta tipos de forma explícita (`import type { ... }`).
- Usa ESM (`import/export`) y extensiones `.js` explícitas en rutas relativas si el proyecto usa NodeNext.
