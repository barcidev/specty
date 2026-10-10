# 🔍 specty (`@barcidev/specty`)

> **Specification-Driven AI Assistant Governance & Scaffolding Engine**
> 
> *Govern AI coding assistants across models and IDEs with strict human approval gates, deterministic spec hashing, subagent handoff protocols, and a local MCP server.*

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@barcidev/specty.svg)](https://www.npmjs.com/package/@barcidev/specty)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.13.0-brightgreen.svg)](package.json)
[![Language: English](https://img.shields.io/badge/docs-English-blue.svg)](README.md)
[![Language: Spanish](https://img.shields.io/badge/docs-Espa%C3%B1ol-orange.svg)](README.es.md)

---

## 💡 The Core Problem & Philosophy

Modern AI coding agents (Claude Code, Cursor, Copilot, Antigravity, Windsurf, Roo, etc.) are powerful but prone to:
1. **Scope Creep & Hallucinations:** Writing speculative or unreviewed code outside the intended task.
2. **Context Loss Across Sessions:** Forgetting architectural decisions during model switches or context truncation.
3. **Fragmented Tooling:** Different rule formats (`.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, etc.) requiring redundant maintenance.

### The specty Rule: *No code without explicit human approval.*

`specty` enforces a specification-first workflow. An AI assistant can draft a proposal and task breakdown, but source code files are strictly guarded by Git pre-commit hooks and CI gates until a human reviews and executes `specty approve`.

---

## ⚡ Key Highlights

- **14 Supported AI Assistants:** Single source of truth in `.specty/rules/` synchronized to all tools.
- **Dual Spec Engine:** Full backward compatibility with `@fission-ai/openspec` (1.14.1) and a standalone zero-dependency `builtin` engine.
- **Deterministic Content Hashing:** SHA-256 specification hash that smartly normalizes checklist tasks (`- [x]` to `- [ ]`), so checking off completed work never invalidates prior human approvals.
- **Local Model Context Protocol (MCP) Server:** Native stdio JSON-RPC 2.0 server with 7 governance tools and a **Dual Graph Provider** (`codebase-memory-mcp` by default, plus in-process SQLite `builtin` fallback).
- **Sequential Subagent Handoff Protocol:** Standardized handoff documents (`001-architect-to-developer.md`) maintaining decision logs across agent role switches.
- **Zero-Telemetry by Default:** All AI metrics and audit events are saved locally in `.specty/metrics/events.jsonl` and `.specty/audit/bypasses.jsonl`. No external tracking.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Global installation
npm install -g @barcidev/specty

# Or run directly via npx
npx @barcidev/specty init
```

### 2. Scaffold a Repository

Run the interactive wizard or initialize with flags:

```bash
# Interactive setup
specty init

# Automated setup with defaults
specty init -y --tool antigravity,claude,cursor --lang en
```

### 3. The Governed Workflow

```text
1. Propose:  AI / Developer creates a change specification in openspec/changes/<change-id>/
2. Review:   Developer inspects proposal.md and tasks.md
3. Approve:  specty approve <change-id>
4. Build:    AI implements code; pre-commit hook verifies valid approval
5. Handoff:  specty handoff create <change-id> --from backend --to qa
6. Verify:   specty doctor && specty status
```

---

## 🛠️ CLI Commands Reference

| Command | Description |
| :--- | :--- |
| `specty init` | Full onboarding: detect stack, generate rules, configure tools, Git hooks, and CI. |
| `specty approve [id]` | Computes deterministic SHA-256 hash and records human approval. |
| `specty status` | Summarizes repository health, active changes, and approval statuses (`--json` supported). |
| `specty sync` | Synchronizes `.specty/` rules, templates, and agent definitions into all enabled tool adapters. |
| `specty doctor` | Validates configuration, tools, hooks, and specs with automated repairs (`--fix`). |
| `specty check-approval` | Governance gate evaluated by Git hooks and CI (`--staged`, `--bypass <reason>`). |
| `specty handoff create` | Records a subagent session transition with completed tasks and decisions. |
| `specty handoff list` | Lists all handoffs for a specification change. |
| `specty handoff show` | Displays markdown content of a handoff. |
| `specty mcp` | Starts the stdio Model Context Protocol (MCP) server. |
| `specty metrics` | Displays governance compliance, pass rates, and handoff statistics. |
| `specty adapters list` | Lists all 14 supported AI assistants and their enabled state. |
| `specty adapters add <tool>` | Enables and generates configuration files for an assistant tool. |
| `specty adapters remove <tool>`| Disables and cleans up adapter files for an assistant tool. |
| `specty hooks install` | Installs `.git/hooks/pre-commit` to prevent unauthorized source code commits. |
| `specty hooks uninstall` | Removes specty pre-commit Git hooks. |

---

## 🤖 14 AI Assistant Adapters

`specty` manages configurations for all major AI coding tools from a single centralized rulebase:

| Tool | Scaffolding Target |
| :--- | :--- |
| **Google Antigravity** | `.agents/rules/`, `AGENTS.md` |
| **Claude Code** | `CLAUDE.md`, `.claude/` |
| **Cursor** | `.cursor/rules/`, `.cursorrules` |
| **GitHub Copilot** | `.github/copilot-instructions.md` |
| **Windsurf** | `.windsurfrules`, `.windsurf/` |
| **OpenAI Codex** | `.codex/instructions.md` |
| **Google Gemini** | `GEMINI.md`, `.gemini/` |
| **Cline** | `.clinerules`, `.cline/` |
| **Roo Code** | `.roomodes`, `.roo/` |
| **Continue** | `.continue/config.json`, `.continue/prompts/` |
| **Junie** | `.junie/guidelines.md` |
| **Amazon Q Developer**| `.amazonq/rules.md` |
| **Aider** | `.aider.conf.yml`, `.aider.model.metadata.json` |
| **OpenCode** | `opencode.json`, `AGENTS.md` |
| **Zed Editor** | `.zed/settings.json` |
| **Sourcegraph Cody** | `.cody/project.json`, `.cody/rules.json` |
| **OpenAI Canvas / ChatGPT Projects** | `.specty/exports/chatgpt-instructions.md`, `.specty/exports/openai-context.md` |

---

## 🔌 Model Context Protocol (MCP)

`specty mcp` launches a local stdio MCP server exposing 7 native tools for AI agents:

1. `specty_get_active_change`: Fetches proposal, tasks, and approval status.
2. `specty_get_rules`: Fetches task-specific, language, and framework rules on-demand.
3. `specty_get_agent_role`: Fetches agent persona prompt (`orchestrator`, `architect`, `backend`, `frontend`, `qa`, `security`, `doc`).
4. `specty_get_latest_handoff`: Retrieves the most recent subagent handoff state.
5. `specty_record_handoff`: Records a new handoff between agents.
6. `specty_get_code_graph`: Queries the active graph provider (`codebase-memory-mcp` by default or `builtin` SQLite engine).
7. `specty_verify`: Executes test, lint, and typecheck commands configured in `.specty/config.yaml`.

### Dual Graph Provider
- **`codebase-memory` (Default):** Seamlessly scaffolds `codebase-memory-mcp` into adapter MCP configurations for rich call graphs, deep symbol search, and architecture discovery.
- **`builtin`:** Lightweight zero-dependency in-process SQLite engine (`node:sqlite`) for isolated, offline, or resource-constrained environments.

---

## 🛡️ Emergency Bypass

In urgent production outage scenarios, developers can bypass the approval gate:

```bash
# Via environment variable
SPECTY_BYPASS=1 git commit -m "fix: production incident mitigation"

# Or via CLI flag
specty check-approval --bypass "Hotfix incident INC-8421"
```

Every bypass is permanently and immutably audited in `.specty/audit/bypasses.jsonl` with user, timestamp, reason, and list of touched files.

---

## 📄 License

GPL-3.0-or-later © Jorge Palacio
