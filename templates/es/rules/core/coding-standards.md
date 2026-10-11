# Regla Core: Estándares de Código y Scaffolding (Coding Standards)

Directrices obligatorias de ingeniería para todos los agentes de IA en proyectos nuevos (greenfield) y avanzados (brownfield).

---

## 1. Configuración de Frameworks en Proyectos Nuevos (Scaffolding Oficial)

Al inicializar un proyecto nuevo o incorporar un nuevo framework o subsistema:

1. **Prohibición de creación manual archivo a archivo:**
   - NUNCA crees manualmente los archivos base de infraestructura y configuración (`package.json`, `tsconfig.json`, `vite.config.ts`, `next.config.js`, `main.ts`, etc.) uno por uno.
   - El boilerplate base debe ser generado exclusivamente mediante el CLI oficial del ecosistema.

2. **Uso obligatorio de CLIs oficiales y versión más actual (`@latest`):**
   - Siempre invoca la herramienta oficial garantizando la versión más actual y estable:
     - **Next.js:** `npx create-next-app@latest <nombre> [flags]`
     - **Vite (React, Vue, Svelte, Vanilla):** `npm create vite@latest <nombre> -- --template <template>`
     - **Angular:** `npx @angular/cli@latest new <nombre> [flags]`
     - **NestJS:** `npx @nestjs/cli@latest new <nombre> [flags]`
     - **FastAPI / Python:** `uv init` o `poetry new <nombre>`
     - **ASP.NET Core:** `dotnet new <plantilla> -n <nombre>`
     - **Flutter:** `flutter create <nombre>`
     - **Rust:** `cargo new <nombre>`
     - **Go:** `go mod init <modulo>`

3. **Ejecución desatendida / no interactiva:**
   - Emplea siempre los flags correspondientes para ejecución no interactiva (ej. `--yes`, `--defaults`, `--skip-git`, `--no-interactive`) para asegurar que el comando se complete sin pausas ni prompts interactivos en la terminal.

---

## 2. Límite de Tamaño de Archivo (Máximo 300 Líneas)

1. **Límite máximo recomendado:**
   - Ningún archivo de código fuente debe exceder las 300 líneas en la medida de lo posible.
2. **Estrategia de descomposición:**
   - Cuando un archivo se acerque o sobrepase las 300 líneas, descompónlo inmediatamente aplicando el Principio de Responsabilidad Única (SRP):
     - Extraer componentes visuales secundarios en submódulos o subcomponentes dedicados.
     - Extraer lógica de estado y efectos en custom hooks, composables o gestores de estado.
     - Extraer llamadas de red, transformaciones y cálculos en servicios y funciones utilitarias.
     - Mover contratos, esquemas y tipos a archivos independientes (`types.ts`, `schemas.ts`, etc.).

---

## 3. Inmutabilidad y Preferencia por Constantes

1. **Uso de constantes:**
   - Prefiere siempre `const` (o modificadores equivalentes en el lenguaje: `readonly`, `final`, inmutabilidad estructural) sobre variables mutables (`let`, `var`).
2. **Evitar reasignaciones y mutaciones:**
   - Minimiza variables con estado mutable. Si un valor se calcula o transforma, deriva una nueva constante.
   - Usa métodos inmutables de colección (`map`, `filter`, `reduce`) y desestructuración en lugar de modificar estructuras existentes en memoria.
   - Trata los parámetros de entrada y props como de solo lectura.

---

## 4. Principios SOLID en la Práctica

Aplica rigurosamente los 5 principios SOLID tanto en código nuevo como en refactorizaciones de proyectos existentes:

1. **S - Responsabilidad Única (Single Responsibility Principle):**
   - Cada clase, función, módulo o componente debe tener un único motivo de cambio y cumplir un propósito bien definido.
2. **O - Abierto/Cerrado (Open/Closed Principle):**
   - Diseña el código para que sea extensible (mediante interfaces, polimorfismo, composición o patrones de estrategia) sin necesidad de modificar el código existente ya probado.
3. **L - Sustitución de Liskov (Liskov Substitution Principle):**
   - Cualquier subtipo o implementación de una interfaz debe ser completamente intercambiable con su abstracción base sin romper invariantes ni comportamientos esperados.
4. **I - Segregación de Interfaces (Interface Segregation Principle):**
   - Prefiere múltiples interfaces delgadas y cohesivas antes que una interfaz monolítica cargada de métodos que los consumidores no necesitan.
5. **D - Inversión de Dependencias (Dependency Inversion Principle):**
   - Los módulos de alto nivel no deben acoplarse directamente a implementaciones concretas de bajo nivel; ambos deben depender de abstracciones o interfaces. Aplica inyección de dependencias.

---

## 5. Tipado Estricto y Clean Code

- **Cero tolerancia a tipos laxos:** Prohibido el uso de `any`, `Object` o casts inseguros sin validación de tipo previa.
- **Nombres significativos:** Nombres descriptivos y directos para variables, funciones y archivos que expresen su intención sin requerir comentarios redundantes.
- **Manejo defensivo y explícito de errores:** No ignores excepciones ni dejes bloques `catch` vacíos; propaga o maneja errores con contexto técnico útil.

---

## 6. Orientación Continua al Usuario (Next-Step Guidance)

- **Instrucción de cierre obligatoria:** Al finalizar cada respuesta o turno, el agente DEBE indicar explícitamente al usuario el estado de situación y qué debe hacer a continuación (ej. comando a ejecutar, archivo a validar o aprobación requerida). Nunca dejes una respuesta sin indicar el paso siguiente.
