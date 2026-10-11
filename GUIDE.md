# specty Onboarding & Configuration Guide

A practical step-by-step guide to adopting and configuring `specty` across any software project, designed for developers and tech leads of all experience levels.

---

## 1. What is specty and What Problem Does It Solve?

When using AI coding assistants (such as Google Antigravity, Cursor, Claude Code, GitHub Copilot, Windsurf, or Cline), it is common for the AI to:
- Modify files outside the scope of the request.
- Make architectural choices without consulting the team.
- Forget earlier agreements when conversations grow long.
- Hallucinate or introduce unnecessary third-party dependencies.

**specty** acts as an architectural orchestrator and governance filter. Its golden rule is:
> **No code is written without explicit human approval.**

The governed workflow is simple:
1. The AI drafts a specification plan containing a proposal and a task checklist.
2. You review the plan and approve it formally.
3. Only once approved does the AI receive permission to write application code.
4. Git enforces a hard pre-commit hook that rejects any commit not tied to an active, approved specification change.

---

## 2. Prerequisites & Installation

### Minimum Requirements
- **Node.js:** Version 22.13.0 or higher (verify with `node -v`).
- **Git:** Installed and initialized in the system (verify with `git --version`).

### Installation

```bash
# Option A: Global system installation
npm install -g @barcidev/specty

# Option B: Direct execution via npx without global install (Recommended)
npx @barcidev/specty init
```

---

## 3. How to Initialize specty According to Your Project State

### Case 1: Blank Project (From Scratch / Empty Directory)

Use this flow when starting a brand new application where no code or Git repository exists yet.

```bash
# 1. Create the project directory and navigate into it
mkdir my-new-project
cd my-new-project

# 2. Initialize the Git repository
git init

# 3. Launch the specty onboarding wizard
npx @barcidev/specty init
```

#### Recommended Choices in the Interactive Wizard:
- **Language:** Select `English (en)` or `Español (es)`. All AI directives and rule templates will be generated in this language.
- **Project Kind:** Select `new` (Clean scaffold from scratch).
- **Repository Structure (Monolith, Monorepo, or Workspace):**
  - *Monolith:* Single application or service. Lets you select a single language and framework.
  - *Monorepo:* Governed by a centralized package orchestrator. Displays the list of supported orchestrators (Turborepo, Nx, pnpm workspaces, npm workspaces, Yarn workspaces, Lerna, Melos, .NET Solution, Cargo) and allows picking exactly one alongside the primary application stack.
  - *Workspace:* Polyglot workspace or multi-subsystem repository. Allows multi-selecting frameworks, languages, and/or internal monorepos.
- **Language and Framework:** Based on the chosen structure, pick your stack. Specty automatically adapts directives in `AGENTS.md`, scaffolds `.specty/rules/core/architecture.md`, and generates scoped rules in `.specty/rules/lang/` and `.specty/rules/framework/` for all configured subsystems.
- **Architectural Pattern:**
  - *Clean Architecture:* Recommended for robust backend APIs or Flutter mobile applications.
  - *Modular / Feature-Based:* Recommended for web applications (React, Next.js, Angular, NestJS).
  - *Layered (N-Tier):* Recommended for traditional APIs with controllers, services, and repositories.
  - *Hexagonal (Ports & Adapters):* Recommended when core domain logic must remain completely decoupled from external infrastructure.
  - *Vertical Slices:* Recommended when structuring self-contained business features rather than technical layers.
- **AI Tools:** Keep all tools checked that your team uses (or pick specific ones like `antigravity`, `cursor`, `claude`).
- **Spec Engine:** Select the specification engine tailored to your team's needs:
  - *openspec (Default & Recommended):* Uses the official OpenSpec 1.14.1 standard. Active proposals are stored in `openspec/changes/<id>/`, and finalized specs are archived into `openspec/specs/`.
    - *Advantages:* Full ecosystem compatibility, native support for AI slash commands (e.g., `/opsx:propose`), standardized schema validation, and a persistent architectural knowledge base that evolves with each completed change.
    - *Best suited when:*
      - Working in a medium or large team requiring a visible, living architectural documentation base in the repository root (`openspec/`).
      - You want to leverage third-party tools and extensions built for the OpenSpec standard.
  - *builtin (Lightweight Built-in Engine):* Specty's native engine with zero external dependencies. Active changes reside in `.specty/changes/<id>/` and archived specs in `.specty/specs/`.
    - *Advantages:* Zero additional packages, ultra-fast startup, absolute privacy without telemetry, and keeps the repository root clean by encapsulating all governance files inside the hidden `.specty/` directory. Uses the identical Markdown and YAML format, allowing seamless migration to OpenSpec in the future without rewriting anything.
    - *Best suited when:*
      - You want the most lightweight and minimal setup possible.
      - Corporate security policies restrict third-party dependencies or external packages.
      - You prefer keeping the root directory clean without extra visible folders.
      - Personal projects or prototypes where you only need approval gates and task tracking without the full OpenSpec ecosystem.
- **Git Workflow:** Select the branch strategy that fits your team's collaboration model:
  - *feature-branch (Default & Recommended):* Short-lived task branches (`feature/<id>`) merged into `main` via reviewed Pull Requests.
    - *Example:* `feature/login-auth` -> Pull Request with peer review -> merge into `main`.
    - *Best suited when:* Working in small to medium teams where each change must be peer-reviewed before merging; offers the best balance of safety and velocity.
  - *gitflow:* Traditional dual-branch model with persistent `main` (production) and `develop` (integration) branches, supported by temporary `feature/*`, `release/*`, and `hotfix/*` branches.
    - *Example:* `feature/cart` -> merge into `develop` -> `release/v1.0` -> merge into `main` tagged as `v1.0`.
    - *Best suited when:* Managing scheduled milestone releases (e.g., monthly cycles), publishing mobile apps to app stores, or maintaining long-term supported legacy versions.
  - *trunk-based:* Developers merge directly into the trunk (`main`) daily, or use short-lived branches living less than 24 hours.
    - *Example:* Brief `auth-fix` branch -> merged daily into `main` upon passing automated CI checks.
    - *Best suited when:* Teams have mature CI/CD practices, comprehensive automated tests, and use feature flags instead of long-lived branches.
  - *centralized:* Direct commits to `main` without auxiliary feature branches.
    - *Example:* `git commit` directly on `main` -> `git push origin main`.
    - *Best suited when:* Solo developers, rapid prototyping, or hackathons where velocity is critical and there is no risk of team merge conflicts.
  - *forking:* Developers clone independent forks to their own accounts and submit Pull Requests to the upstream repository.
    - *Example:* `personal-fork:feature/api` -> Pull Request to `upstream:main`.
    - *Best suited when:* Open Source projects or working with external contractors who should not have direct write access to the main repository.
- **Commit Convention:** Choose the commit message format matching your project standards:
  - *conventional (Default & Recommended):* Structured `type(scope): description` format.
    - *Example:* `feat(auth): add google oauth2 login` or `fix(api): handle 500 error on payment webhook`.
    - *Best suited when:* You want industry-standard commit history compatible with automated CHANGELOG generators and Semantic Release.
  - *classic:* Concise imperative title without tags or prefixes.
    - *Example:* `Add Google OAuth2 login authentication`.
    - *Best suited when:* You prefer simple human-readable messages without technical boilerplate.
  - *gitmoji:* Semantic emoji prefixes identifying the intent of the commit.
    - *Example:* `✨ Add Google OAuth2 login authentication` or `🐛 Fix email validation bug`.
    - *Best suited when:* You prioritize quick visual recognition on GitHub or GitLab (✨ feature, 🐛 bug, ⚡ performance, 📝 docs).
  - *ticket:* Mandatory issue or ticket tracker identifier prefix.
    - *Example:* `[PROJ-123] Add Google OAuth2 login authentication`.
    - *Best suited when:* The organization uses Jira, Azure DevOps, Linear, or Trello and requires direct commit-to-ticket traceability.
  - *gitmoji-conventional (Hybrid):* Semantic emoji followed by Conventional Commits format.
    - *Example:* `✨ feat(auth): add google oauth2 login`.
    - *Best suited when:* You want visual appeal while retaining machine readability for CI/CD semantic tooling.
  - *conventional-ticket (Hybrid):* Conventional Commit type and scope with integrated ticket identifier.
    - *Example:* `feat(auth): [PROJ-123] add google oauth2 login`.
    - *Best suited when:* Corporate enterprise environments requiring Jira auditability alongside automated release pipelines.
  - *gitmoji-ticket (Hybrid):* Semantic emoji accompanied by ticket code.
    - *Example:* `✨ [PROJ-123] Add Google OAuth2 login authentication`.
    - *Best suited when:* Teams linking Jira issues who prefer a friendly visual icon over rigid technical prefixes.
  - *gitmoji-conventional-ticket (Complete Hybrid):* Combines semantic emoji, Conventional Commit type, and ticket identifier.
    - *Example:* `✨ feat(auth): [PROJ-123] add google oauth2 login`.
    - *Best suited when:* Maximum expressiveness: instant visual cues, standardized technical categorization, and project management traceability.
- **MCP & Metrics:** Choose whether to enable the context protocol and local governance telemetry:
  - *Enabled (Default & Recommended):*
    - *What it does:* Starts the local Model Context Protocol server over stdio (`specty mcp`) and records governance metrics locally in `.specty/metrics/events.jsonl` (approval rates, task durations, and emergency bypass logs with zero external telemetry).
    - *Benefits:* Allows AI assistants to inspect the project dependency graph and active specifications without hallucinating, and enables executive metrics reporting with `specty metrics`.
    - *Available Graph Providers (`graph_provider`):*
      - **codebase-memory (Default & recommended for medium/large codebases):**
        - *How it works:* Uses the dedicated `codebase-memory-mcp` server to perform deep repository indexing, mapping relational symbol graphs, multi-layer call graphs, cross-module dependency traces (`trace_path`), and architecture decision records (ADRs).
        - *Best suited when:* Medium to large repositories, monorepos, or multi-tiered architectures where understanding cross-file execution flows is critical.
      - **builtin (Lightweight embedded engine with zero dependencies):**
        - *How it works:* Specty's native engine powered by Node.js embedded SQLite (`node:sqlite`). Rapidly indexes files, top-level symbols (functions, classes, interfaces, types), and direct import/require statements without external binaries.
        - *Best suited when:* Lightweight setups, small projects, prototypes, or restricted environments where installing third-party global packages is not permitted.
  - *Disabled:*
    - *What it does:* Skips MCP server configuration in editor settings and disables metrics tracking.
    - *Best suited when:* Constrained CI environments or lightweight VMs where background indexing processes are unnecessary.
- **Hooks & CI:** Configure security guardrails locally and in cloud pipelines:
  - *Git Pre-commit Hook:*
    - *Enabled (Default & Recommended):* Installs a pre-commit check in `.git/hooks/pre-commit`. If you or the AI attempt to commit source code changes without an active approved spec (`specty approve`), Git immediately aborts the commit.
      - *Best suited when:* You want hard local governance to ensure unvetted code never enters the repository.
    - *Disabled:* Skips local hook installation.
      - *Best suited when:* Gradually onboarding legacy teams where enforcement is handled exclusively at the Pull Request level in CI.
  - *CI Platform (Continuous Integration):*
    - *github (GitHub Actions - Recommended for GitHub):* Generates `.github/workflows/specty.yml` with the official PR Gate bot (`specty gate --comment`). Posts an automated sticky comment on PRs tracking spec SHA-256 hashes, task progress, and bypass alerts.
      - *Best suited when:* The repository is hosted on GitHub.
    - *gitlab (GitLab CI):* Generates `.gitlab-ci.yml` configured to validate merge requests.
      - *Best suited when:* Using GitLab (SaaS or Self-Hosted).
    - *azure (Azure Pipelines):* Generates `azure-pipelines.yml` with specty validation steps.
      - *Best suited when:* The organization builds on Azure DevOps.
    - *bitbucket (Bitbucket Pipelines):* Generates `bitbucket-pipelines.yml` to evaluate PRs.
      - *Best suited when:* Source code is managed on Bitbucket.
    - *none (No CI):* No pipeline configuration is generated.
      - *Best suited when:* Personal or local projects, or when custom CI workflows will be configured manually.

---

### Case 2: Newly Started Project (With Official Framework / Starter Template)

Use this flow if you just created the project using an official framework tool (e.g., `npm create vite@latest`, `npx create-next-app`, `nest new api`, `dotnet new webapi`, or `flutter create app`), but have not written custom business logic yet.

```bash
# 1. Navigate to the root of the newly created project
cd my-starter-project

# 2. Run the specty onboarding command
npx @barcidev/specty init
```

#### Behavior & Variations:
- **Automatic Detection:** specty inspects manifest files such as `package.json`, `pubspec.yaml`, `*.csproj`, or `pom.xml`, automatically identifying the primary language and frameworks.
- **Project Kind:** Select `existing` (Inspects existing stack). Specty will respect the generated folder layout and only add the governance layer.
- **Verification Commands:** Open `.specty/config.yaml` and verify that the `verify` block reflects your real project scripts:

```yaml
scopes:
  - path: "."
    stack:
      language: "typescript"
      frameworks:
        - "react"
        - "vite"
    verify:
      lint: "npm run lint"
      test: "npm run test"
      build: "npm run build"
```

---

### Case 3: Long-Standing Legacy Project (Brownfield Development)

Applies to mature codebases with hundreds or thousands of commits, existing CI pipelines, and active developer teams. The guiding principle here is **zero disruption to existing workflows**.

```bash
# Step 1: Run a dry-run preview to inspect generated files without touching disk
npx @barcidev/specty init --dry-run

# Step 2: Run the actual initialization
npx @barcidev/specty init
```

#### Progressive Adoption Strategy:

1. **Incremental Adoption:** Do not attempt to reverse-engineer specifications for historical code written years ago. Specty is strictly meant to govern future features, refactors, and bug fixes.

2. **Restrict Monitored Source Paths:** In `.specty/config.yaml`, customize `source_paths` to watch only new feature folders, and add legacy code to `exempt_paths`:

```yaml
governance:
  source_paths:
    - "src/features/new-module/**" # Only this new area requires spec approval
  exempt_paths:
    - "legacy/**"                  # Historical code exempted from gates
    - "migrations/**"              # Database scripts exempted
    - "**/*.md"                    # Documentation exempted
    - "docs/**"
```

3. **Relax Initial Quality Gates:** If the legacy codebase does not currently have 100% passing tests or clean linter reports, adjust `quality_gates`:

```yaml
governance:
  quality_gates:
    lint: false        # Temporarily disabled if legacy code has lint warnings
    test: true         # Keep active test suites running
    static: false      # Disabled if legacy type errors exist
    coverage_min: 0    # Do not enforce a strict test coverage percentage initially
```

4. **Emergency Production Bypass:** If an urgent production outage occurs and you need to push a hotfix without drafting a specification first:
   - *Via Environment Variable:*
     ```bash
     SPECTY_BYPASS=1 git commit -m "fix: resolve critical production incident"
     ```
   - *Via Commit Trailer:*
     ```bash
     git commit -m "fix: emergency hotfix" -m "Specty-Bypass: critical production outage"
     ```

---

## 4. Full Configuration Reference: `.specty/config.yaml`

Specty's behavior is fully managed via `.specty/config.yaml`. Below is a complete annotated reference.

### Configuration Template

```yaml
version: 1
language: "en"
spec_engine: "openspec"

project:
  kind: "existing"
  layout: "single"
  architecture: "clean"

scopes:
  - path: "."
    stack:
      language: "typescript"
      frameworks:
        - "react"
    verify:
      lint: "npm run lint"
      test: "npm test"
      build: "npm run build"

tools:
  - "antigravity"
  - "cursor"
  - "claude"
  - "github-copilot"

git:
  workflow: "feature-branch"
  commit_convention: "conventional"

governance:
  hooks: true
  ci: "github"
  source_paths:
    - "src/**"
  exempt_paths:
    - "**/*.md"
    - "openspec/**"
    - "docs/**"
  bypass:
    env: "SPECTY_BYPASS"
    trailer: "Specty-Bypass"
  quality_gates:
    lint: true
    test: true
    static: true
    coverage_min: 0
  approval_method: "hybrid"
  required_reviewers: []
  require_codeowner_review: false

mcp:
  enabled: true
  graph_provider: "codebase-memory"
  codebase_memory:
    command: "codebase-memory-mcp"
    args: []
    auto_index: true
  graph:
    max_file_kb: 512
    exclude:
      - "dist/**"
      - "node_modules/**"
  custom_servers: {}

metrics:
  enabled: true
```

---

### Detailed Field Breakdown

#### 1. Base Configuration
- `version`: Configuration schema version. Value: `1`.
- `language`: Working language for CLI messages and AI prompt templates. Values: `'en'` (English) or `'es'` (Spanish).
- `spec_engine`: The engine managing proposal lifecycles and specs:
  - `'openspec'` (Default): Official OpenSpec 1.14.1 engine.
    - *Structure:* Stores active proposals in `openspec/changes/<id>/` (`proposal.md`, `tasks.md`, `specs/`) and consolidates versions into `openspec/specs/`.
    - *Best suited when:* Collaborative team projects requiring living architecture documentation in the repository root and AI slash command support (`/opsx:propose`).
  - `'builtin'`: Specty's native lightweight engine with zero external dependencies.
    - *Structure:* Stores changes in `.specty/changes/<id>/` and archives into `.specty/specs/`, keeping the root clean.
    - *Best suited when:* Corporate environments with strict package restrictions, minimal dependency footprints, or preferences to keep all governance files inside `.specty/`.

#### 2. `project` Block
- `project.kind`: Initial project type. Values: `'new'` or `'existing'`.
- `project.layout`: Physical layout of the codebase:
  - `'single'`: Standard single-root application.
  - `'monorepo'`: Multi-package repository (Nx, Turborepo, Melos, Cargo workspaces).
  - `'multi-repo'`: Multi-repository workspace environment.
- `project.architecture`: High-level pattern guiding AI code generators:
  - `'clean'`: Clean Architecture (Domain, Use Cases, Presentation).
  - `'modular'`: Modular feature-sliced business components.
  - `'hexagonal'`: Ports and Adapters decoupled from frameworks.
  - `'layered'`: Traditional N-Tier layers (controllers, services, repositories).
  - `'vertical-slice'`: Self-contained end-to-end feature slices.

#### 3. `scopes` Block
List of monitored workspace modules:
- `path`: Relative path of the module (e.g., `.` or `apps/backend`).
- `stack.language`: Primary language (`typescript`, `javascript`, `dart`, `csharp`, `python`, `go`, `rust`, etc.).
- `stack.frameworks`: Detected frameworks (`react`, `nestjs`, `flutter`, `angular`, `express`, etc.).
- `verify`: Actual terminal commands executed during `specty verify`:
  - `lint`: Code linter command.
  - `test`: Automated test command.
  - `build`: Build or compilation command.
  - `typecheck`: Static type checking command.

#### 4. `tools` Block
List of supported AI editors and assistants. Specty keeps their instruction files synchronized:
- `antigravity`: Generates `AGENTS.md` and `.agents/rules/`.
- `claude`: Generates `CLAUDE.md`.
- `cursor`: Generates `.cursor/rules/specty.mdc`.
- `github-copilot`: Generates `.github/copilot-instructions.md`.
- `windsurf`: Generates `.windsurfrules`.
- `codex`: Generates `.codex/instructions.md`.
- `gemini`: Generates `GEMINI.md` and `.gemini/`.
- `cline`: Generates `.clinerules`.
- `roocode`: Generates `.roomodes` and `.roorules`.
- `continue`: Generates `.continue/config.json`.
- `junie`: Generates `.junie/instructions.md`.
- `amazon-q`: Generates `.amazonq/instructions.md`.
- `aider`: Generates `.aider.conf.yml`.
- `opencode`: Generates `.opencode/instructions.md`.
- `zed`: Generates `.zed/settings.json`.
- `cody`: Generates `.cody/rules.json`.
- `chatgpt`: Generates `.specty/exports/chatgpt-instructions.md`.

*Adapter CLI commands:*
```bash
specty adapters list                 # Inspect adapter enablement status
specty adapters add cursor           # Enable and generate rules for an editor
specty adapters remove windsurf      # Disable and remove rules for an editor
```

#### 5. `git` Block
- `git.workflow`: Git branch strategy used by commands like `specty branch <id>`:
  - `'feature-branch'` (Default): Short-lived task branches (`feature/<id>`) merged into `main` via PRs.
    - *Example:* `feature/001-auth` -> PR -> merge into `main`.
    - *Best suited when:* Teams using code reviews and Pull Requests.
  - `'gitflow'`: Classic release-driven branching with `main`, `develop`, `feature/*`, `release/*`, and `hotfix/*`.
    - *Example:* `feature/001-auth` -> merge into `develop` -> `release/v1.0` -> `main`.
    - *Best suited when:* Scheduled release cycles or app store publishing.
  - `'trunk-based'`: Fast, continuous integration into `main` with branches under 24 hours.
    - *Example:* Brief `001-auth` branch -> daily merge into `main` after CI checks.
    - *Best suited when:* High-velocity CI/CD teams with automated tests.
  - `'centralized'`: Direct commits onto `main` without branches.
    - *Example:* Direct commits on `main` validated by the pre-commit hook.
    - *Best suited when:* Solo developers prioritizing speed.
  - `'forking'`: Development on personal forks with PRs to the upstream repository.
    - *Example:* `fork:feature/001-auth` -> PR to `upstream:main`.
    - *Best suited when:* Open Source projects or external contractor access.
- `git.commit_convention`: Commit message validation pattern:
  - `'conventional'` (Default): Conventional Commits standard (`type(scope): message`).
    - *Example:* `feat(auth): add google oauth2 login` or `fix(db): handle connection pool timeout`.
    - *Best suited when:* Automated SemVer releases and changelogs.
  - `'classic'`: Concise imperative title without prefixes.
    - *Example:* `Add Google OAuth2 login authentication`.
    - *Best suited when:* Traditional human-readable histories.
  - `'gitmoji'`: Semantic emoji prefixes categorizing the commit.
    - *Example:* `✨ Add Google OAuth2 login authentication` or `🐛 Fix form validation`.
    - *Best suited when:* Visual clarity on GitHub/GitLab.
  - `'ticket'`: Issue tracker ticket identifier prefix in brackets.
    - *Example:* `[PROJ-101] Add Google OAuth2 login authentication`.
    - *Best suited when:* Organizations auditing commits against Jira/Azure DevOps tickets.
  - `'gitmoji-conventional'`: Hybrid emoji with Conventional Commits.
    - *Example:* `✨ feat(auth): add google oauth2 login`.
    - *Best suited when:* Visual aesthetics combined with machine-readable release tools.
  - `'conventional-ticket'`: Conventional Commits with embedded ticket code.
    - *Example:* `feat(auth): [PROJ-101] add google oauth2 login`.
    - *Best suited when:* Formal enterprise compliance and automated pipelines.
  - `'gitmoji-ticket'`: Hybrid emoji with ticket identifier.
    - *Example:* `✨ [PROJ-101] Add Google OAuth2 login authentication`.
    - *Best suited when:* Teams tracking Jira tickets who prefer emoji aesthetics.
  - `'gitmoji-conventional-ticket'`: Complete hybrid with emoji, type, scope, and ticket.
    - *Example:* `✨ feat(auth): [PROJ-123] add google oauth2 login`.
    - *Best suited when:* Maximum expressiveness: visual icons, semantic parsing, and business issue tracking.

#### 6. `governance` Block
- `governance.hooks`: Enables or disables the `.git/hooks/pre-commit` guard (`true` or `false`). Manage via `specty hooks install` or `specty hooks uninstall`.
- `governance.ci`: Defines the continuous integration provider for the PR Gate (`specty gate`):
  - `'github'`: Generates `.github/workflows/specty.yml` with the official PR Gate bot.
  - `'gitlab'`: Generates `.gitlab-ci.yml` for GitLab merge requests.
  - `'azure'`: Generates `azure-pipelines.yml` for Azure DevOps.
  - `'bitbucket'`: Generates `bitbucket-pipelines.yml` for Bitbucket.
  - `'none'`: Disables automated CI pipeline generation.
- `governance.source_paths`: Monitored source code globs. Edits inside these paths require an active approved spec change.
- `governance.exempt_paths`: Files allowed to be edited freely without active spec approval (Markdown documents, release notes, spec folders).
- `governance.bypass.env`: Environment variable name for emergency bypasses (`SPECTY_BYPASS`).
- `governance.bypass.trailer`: Commit trailer tag for emergency bypasses (`Specty-Bypass`).
- `governance.quality_gates`: Quality gates verified before transitioning a change to done via `specty done`:
  - `lint`: Requires linter execution to pass without errors.
  - `test`: Requires automated test suites to pass.
  - `static`: Requires static type checking to succeed.
  - `coverage_min`: Minimum required test coverage percentage (e.g., `80` to require 80%).
- `governance.approval_method`: Human approval mode:
  - `'cli'`: Local terminal approval using `specty approve`.
  - `'pr_review'`: Synchronized approval from GitHub Pull Request reviews.
  - `'hybrid'`: Accepts either CLI or PR review approvals.
- `governance.required_reviewers`: List of mandatory reviewer usernames.
- `governance.require_codeowner_review`: Enforces explicit review from designated code owners (`CODEOWNERS`).

#### 7. `mcp` (Model Context Protocol) Block
- `mcp.enabled`: Enables or disables the local stdio JSON-RPC server (`specty mcp`) providing code graph context to assistants.
- `mcp.graph_provider`: Code dependency graph indexing engine:
  - `'codebase-memory'` (Default): Uses `codebase-memory-mcp` for deep semantic indexing, multi-tier call hierarchy navigation, and trace path analysis (`trace_path`).
    - *Best suited when:* Medium or large codebases, monorepos, or multi-tiered architectures where tracing complex execution flows across files is critical.
  - `'builtin'`: Specty's native lightweight engine using embedded SQLite (`node:sqlite`). Maps files, functions, classes, types, and top-level imports instantaneously with zero external dependencies.
    - *Best suited when:* Environments with strict package installation limits, small projects, or setups requiring zero additional dependencies.
- `mcp.graph.max_file_kb`: Maximum indexed file size in kilobytes (default: 512 KB).
- `mcp.graph.exclude`: Glob patterns excluded from code graph indexing (e.g., `dist/**`, `node_modules/**`).
- `mcp.custom_servers`: Allows defining additional external MCP servers (e.g., databases, Jira, Figma).

#### 8. `metrics` Block
- `metrics.enabled`: Logs governance audit events and task cycle times locally in `.specty/metrics/events.jsonl` (ensuring complete privacy with zero external telemetry). Inspect metrics via `specty metrics` or export visual reports with `specty metrics --export report.html --open`.

---

## 5. The Daily 6-Step Workflow: From Idea to Code

```text
[1. Proposal]       openspec/changes/<id>/proposal.md and tasks.md
       |
[2. Review]         specty status  /  specty ui
       |
[3. Approval]       specty approve <id>
       |
[4. Development]    specty branch <id>  ->  specty start <id>
       |
[5. Verification]   specty verify <id>
       |
[6. Closure]        specty done <id>  ->  specty archive <id>
```

### Step 1: Proposal Drafting
Ask your AI assistant to formulate a specification for your requirement, or manually create a folder in `openspec/changes/<change-name>/`:
- `proposal.md`: Outlines the problem statement, proposed architectural solution, and touched files.
- `tasks.md`: Detailed step-by-step task checklist with checkboxes (`- [ ] Task 1`).

### Step 2: Review
Inspect the plan to ensure the AI did not include speculative or out-of-scope modifications:
```bash
# Check active change status and suggested next step
specty status
specty next
```

### Step 3: Human Approval
Once satisfied with the proposal, record your formal approval:
```bash
# Computes immutable SHA-256 hash and authorizes code development
specty approve <change-name>
```

### Step 4: Branch Creation & Development
```bash
# Switch to or create the task-linked Git branch
specty branch <change-name>

# Transition change state to in-progress
specty start <change-name>
```
The AI assistant can now write application code and check off completed tasks in `tasks.md`. The Git pre-commit hook will allow commits normally.

### Step 5: Verification
Once implementation is complete and tasks are checked:
```bash
# Runs configured linters, test suites, and typechecks
specty verify <change-name>
```

### Step 6: Completion & Archival
```bash
# Verifies 100% completed tasks and passing tests before marking done
specty done <change-name>

# Moves the specification to permanent documentation in openspec/specs/
specty archive <change-name>
```

---

## 6. Visual Tools, Diagnostics & Maintenance

### Web Dashboard
If you prefer inspecting proposals, tasks, and diffs visually in your browser:
```bash
# Launches the local interactive web console
specty ui
```

### Diagnostics & Auto-Repair
If configuration files were accidentally deleted or an editor setup changed:
```bash
# Verifies repository health and repairs missing rule files automatically
specty doctor --fix
```

### Rule Synchronization
If you modified `.specty/rules/` or edited `.specty/config.yaml`:
```bash
# Propagates updated rules to all configured AI tool files
specty sync
```

### Governance Metrics
```bash
# Displays compliance and cycle time statistics in terminal
specty metrics

# Exports a full executive audit report to HTML
specty metrics --export governance-report.html --format html --open
```
