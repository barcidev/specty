# Regla Core: Estándares de Código y Scaffolding (Coding Standards)

Directrices de ingeniería obligatorias para agentes de IA en código nuevo y existente.

## 1. Scaffolding Oficial (Proyectos Nuevos y Módulos)
- **Generación asistida:** El boilerplate inicial y archivos de configuración base (`package.json`, `tsconfig.json`, etc.) DEBEN generarse con el CLI oficial del ecosistema (`@latest`) usando flags no interactivos (ej. `--yes`, `--defaults`, `--skip-git`).
{{scaffoldingTip}}- **Prohibición:** NUNCA crees el boilerplate archivo por archivo manualmente.

## 2. Límite de Archivo (Máximo 300 Líneas)
- Ningún archivo de código fuente debe exceder 300 líneas.
- Aplica SRP: extrae subcomponentes, custom hooks/servicios, transformaciones y contratos (`types.ts`) en módulos independientes antes de superar el límite.

## 3. Inmutabilidad y Limpieza
- **Constantes:** Prefiere `const`, `readonly` e inmutabilidad estructural sobre variables mutables. Evita reasignaciones y mutaciones en memoria (`map`, `filter`, spread).
- **Tipado estricto:** Prohibido el uso de `any`, `Object` o casts inseguros.
- **Nombres significativos:** Nombres descriptivos sin comentarios redundantes; manejo explícito de errores sin bloques `catch` vacíos.

## 4. Principios SOLID
- **S (SRP):** Un único motivo de cambio por módulo o clase.
- **O (OCP):** Abierto a extensión, cerrado a modificación directa.
- **L (LSP):** Subtipos sustituibles sin romper invariantes.
- **I (ISP):** Interfaces delgadas y cohesivas en lugar de monolitos.
- **D (DIP):** Inyección de dependencias; acoplarse a abstracciones, no a implementaciones.

## 5. Iconografía en Interfaces
- **Prohibición:** NUNCA uses símbolos Unicode o emojis (ej. ✏️, 🔍, ⚙️, ✕) como iconos en botones o controles interactivos.
- **Vectores SVG:** Usa componentes SVG limpios o la librería de iconos instalada en el proyecto (ej. Lucide, Heroicons o SVG inline con `currentColor`).
