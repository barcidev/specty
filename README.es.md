# 🔍 specty (`@barcidev/specty`)

> **Motor de Gobernanza y Scaffolding para Asistentes de IA Guiado por Especificaciones**
> 
> *Gobierna agentes de código en múltiples modelos e IDEs mediante puertas de aprobación humana obligatoria, hashing determinístico de especificaciones, protocolo de handoffs entre subagentes y servidor MCP local.*

[![Licencia: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Versión npm](https://img.shields.io/npm/v/@barcidev/specty.svg)](https://www.npmjs.com/package/@barcidev/specty)
[![Versión Node.js](https://img.shields.io/badge/node-%3E%3D22.13.0-brightgreen.svg)](package.json)
[![Idioma: Inglés](https://img.shields.io/badge/docs-English-blue.svg)](README.md)
[![Idioma: Español](https://img.shields.io/badge/docs-Espa%C3%B1ol-orange.svg)](README.es.md)

---

## 💡 Filosofía y Principio Rector

Los asistentes de programación actuales (Claude Code, Cursor, Copilot, Antigravity, Windsurf, Roo, etc.) son extraordinariamente potentes pero presentan desafíos críticos:
1. **Desviación de Alcance y Alucinaciones:** Modifican código innecesario o especulativo sin revisión humana.
2. **Pérdida de Contexto:** Al cambiar de modelo o alcanzar el límite de tokens, olvidan acuerdos de arquitectura.
3. **Fragmentación:** Mantener `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md` de forma dispersa e inconsistente.

### La Regla de Oro de specty: *Ningún código sin aprobación humana explícita.*

`specty` impone un flujo guiado por especificaciones. Los asistentes de IA pueden redactar propuestas y listas de tareas, pero los archivos de código fuente permanecen estrictamente bloqueados por hooks de Git (`pre-commit`) y comprobaciones de CI hasta que un humano revise y ejecute `specty approve`.

---

## ⚡ Características Principales

- **14 Asistentes de IA Compatibles:** Fuente única de verdad en `.specty/rules/` sincronizada automáticamente hacia todas las herramientas.
- **Motor Dual de Especificaciones:** Compatibilidad total con `@fission-ai/openspec` (1.14.1) y un motor nativo `builtin` sin dependencias externas.
- **Hashing Determinístico SHA-256:** Normaliza inteligentemente las listas de tareas (`- [x]` a `- [ ]`), garantizando que marcar tareas como completadas durante la implementación nunca invalide la aprobación humana previa.
- **Servidor MCP Local (Model Context Protocol):** Servidor JSON-RPC 2.0 sobre stdio con 7 herramientas nativas y **Motor Dual de Grafo** (`codebase-memory-mcp` predeterminado + SQLite `builtin` ligero en memoria/disco).
- **Protocolo de Handoffs entre Subagentes:** Documentos estandarizados de traspaso de sesión (`001-architect-to-backend.md`) que conservan decisiones clave entre roles.
- **Privacidad y Telemetría Cero:** Las métricas y eventos de auditoría se almacenan exclusivamente en local en `.specty/metrics/events.jsonl` y `.specty/audit/bypasses.jsonl`.

---

## 🚀 Inicio Rápido

### 1. Instalación

```bash
# Instalación global
npm install -g @barcidev/specty

# O ejecución directa mediante npx
npx @barcidev/specty init
```

### 2. Inicializar un Repositorio

```bash
# Asistente interactivo
specty init

# Inicialización desatendida con configuración rápida
specty init -y --tool antigravity,claude,cursor --lang es
```

### 3. El Flujo de Trabajo Gobernado

```text
1. Propuesta:      La IA o el desarrollador redacta una especificación en openspec/changes/<id>/
2. Revisión:       El desarrollador revisa proposal.md y tasks.md
3. Aprobación:     specty approve <id>
4. Implementación: La IA programa; el hook de Git valida la aprobación activa
5. Handoff:        specty handoff create <id> --from backend --to qa
6. Verificación:   specty doctor && specty status
```

---

## 🛠️ Referencia de Comandos CLI

| Comando | Descripción |
| :--- | :--- |
| `specty init` | Onboarding integral: detección de stack, generación de reglas, adaptadores, hooks y CI. |
| `specty approve [id]` | Calcula el hash SHA-256 normalizado y registra la aprobación humana. |
| `specty status` | Resumen del estado del repositorio, cambios activos y aprobaciones (`--json` disponible). |
| `specty sync` | Sincroniza reglas, plantillas y roles de `.specty/` hacia todas las herramientas activas. |
| `specty doctor` | Diagnóstico de configuración, herramientas, hooks y especificaciones con autorreparación (`--fix`). |
| `specty check-approval`| Puerta de gobernanza evaluada por Git hooks y CI (`--staged`, `--bypass <motivo>`). |
| `specty handoff create`| Registra una transición de sesión entre roles con tareas completadas y decisiones. |
| `specty handoff list`  | Lista todos los handoffs registrados para un cambio. |
| `specty handoff show`  | Muestra los detalles de un handoff específico. |
| `specty mcp`           | Inicia el servidor MCP local sobre stdio. |
| `specty metrics`       | Muestra métricas de cumplimiento, tasa de aprobación y traspasos entre agentes. |
| `specty gate`          | PR Gate y bot comentador para CI (comenta estado, hashes y auditoría de bypass). |
| `specty adapters list` | Lista los 17 asistentes de IA compatibles y su estado de habilitación. |
| `specty adapters add <herramienta>` | Habilita y genera archivos de adaptación para un asistente. |
| `specty adapters remove <herramienta>` | Deshabilita y limpia archivos para un asistente. |
| `specty hooks install` | Instala el hook `.git/hooks/pre-commit` para prevenir commits sin aprobación. |
| `specty hooks uninstall`| Desinstala los hooks de Git de specty. |

---

## 🚦 GitHub Action & PR Gate Automatizado

Specty incluye soporte nativo para Pull Requests en GitHub Actions (`action.yml` y comando `specty gate`):

```yaml
# .github/workflows/specty.yml
name: Specty PR Gate

on:
  pull_request:
    branches: [main, master, develop]

permissions:
  contents: read
  pull-requests: write

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - name: Check Specty Gate & Comment PR
        run: npx specty gate --comment
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

El bot publica y actualiza de manera idempotente (*sticky comment*, sin spam) un comentario en el PR que audita:
1. **Resumen del change**: Título, estado y progreso de tareas de `tasks.md`.
2. **Estado de aprobación y hash**: Verificación criptográfica SHA-256 (`content_hash`) certificando que la spec no fue modificada tras la aprobación.
3. **Auditoría de Bypass**: Alertas automáticas si se utilizó una salida de emergencia (`SPECTY_BYPASS` o commit trailer `Specty-Bypass: <motivo>`).

---

## 🤖 17 Adaptadores de Asistentes de IA

`specty` centraliza y distribuye reglas hacia los principales entornos de desarrollo:

- **Google Antigravity:** `.agents/rules/`, `AGENTS.md`
- **Claude Code:** `CLAUDE.md`, `.claude/`
- **Cursor:** `.cursor/rules/`, `.cursorrules`
- **GitHub Copilot:** `.github/copilot-instructions.md`
- **Windsurf:** `.windsurfrules`, `.windsurf/`
- **OpenAI Codex:** `.codex/instructions.md`
- **Google Gemini:** `GEMINI.md`, `.gemini/`
- **Cline:** `.clinerules`, `.cline/`
- **Roo Code:** `.roomodes`, `.roo/`
- **Continue:** `.continue/config.json`, `.continue/prompts/`
- **Junie:** `.junie/guidelines.md`
- **Amazon Q Developer:** `.amazonq/rules.md`
- **Aider:** `.aider.conf.yml`, `.aider.model.metadata.json`
- **OpenCode:** `opencode.json`, `AGENTS.md`
- **Zed Editor:** `.zed/settings.json`
- **Sourcegraph Cody:** `.cody/project.json`, `.cody/rules.json`
- **OpenAI Canvas / ChatGPT Projects:** `.specty/exports/chatgpt-instructions.md`, `.specty/exports/openai-context.md`

---

## 🛡️ Bypass de Emergencia

En incidentes críticos de producción, el desarrollador puede omitir la verificación de aprobación:

```bash
# Mediante variable de entorno
SPECTY_BYPASS=1 git commit -m "fix: mitigación urgente en producción"

# O mediante parámetro CLI
specty check-approval --bypass "Hotfix urgente por caída del servicio"
```

Cada bypass queda registrado permanentemente en `.specty/audit/bypasses.jsonl` con usuario, fecha, motivo y lista de archivos modificados.

---

## 📄 Licencia

GPL-3.0-or-later © Jorge Palacio
