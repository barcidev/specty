# specty: descripción completa del producto

Nombre: `specty` · Licencia: GPL · Documento base para generar el prompt de construcción · Versión 1.1 · 9 de octubre de 2026

## 1. Visión y propósito

Construir **specty**, una herramienta de línea de comandos (CLI) de licencia GPL, publicada en npm, que se instala con `npm install -g specty` y se inicia con `specty init` (también se puede ejecutar sin instalar con `npx specty init`). Prepara cualquier repositorio para que el asistente de IA del IDE (Antigravity, Claude Code, Cursor, GitHub Copilot, Windsurf u otros), con el modelo y el proveedor que el equipo elija, trabaje bajo un flujo de desarrollo guiado por especificaciones con intervención humana obligatoria: primero se planifica, una persona aprueba y solo entonces se escribe código.

specty no llama a modelos de lenguaje ni gestiona claves de API, tokens o timeouts. Su trabajo es instalar y mantener la infraestructura documental y de control (reglas, roles, plantillas, compuertas, hooks y CI) que condiciona al asistente nativo del IDE, y servir un servidor MCP de grafo de código y métricas. Es un producto independiente. El ciclo de vida de los specs (proponer, aplicar, archivar) lo aporta **OpenSpec 1.14.1**, incluido como dependencia directa con versión fija; specty construye por encima lo que OpenSpec no cubre: detección de stack, reglas por tecnología, roles de sub-agentes, compuertas verificables, gobernanza y contexto de código. Quien no quiera OpenSpec dispone de un motor de specs propio y ligero.

## 2. Problema que resuelve

- Los asistentes generan código de inmediato a partir de prompts vagos y los requisitos quedan en el historial del chat.
- Cada desarrollador usa su asistente de forma aislada y se ignoran las convenciones de arquitectura del equipo.
- Los equipos alternan entre modelos y proveedores durante el desarrollo, y cada herramienta espera sus propios archivos de reglas, que acaban desactualizados o contradictorios.
- Un system prompt es obediencia blanda: el modelo puede saltarse la planificación, sobre todo en conversaciones largas.
- Escribir «Aprobado» en el chat no es verificable, no queda en git y no sobrevive al cierre de la conversación.
- Los sub-agentes simulados comparten un solo contexto, sin aislamiento ni alcance por tarea.
- La verificación final suele ser el propio modelo revisándose a sí mismo.
- Si el chat se interrumpe a mitad de una implementación, no hay forma ordenada de reanudar.

## 3. Principios de diseño

1. **Agnóstico:** `AGENTS.md` es la fuente única de verdad; los archivos propios de cada herramienta se generan o enlazan desde él.
2. **Sin dependencias en producción:** solo Markdown, YAML y scripts opcionales; nada se añade al código de la aplicación.
3. **El spec es el artefacto persistente,** no la conversación.
4. **La aprobación es un estado en un archivo,** versionado en git.
5. **Obediencia dura donde sea posible** (hooks, CI) y blanda (reglas) donde no.
6. **Idempotente y no destructivo:** nunca sobrescribe contenido del usuario sin confirmación; todo bloque gestionado va delimitado con marcadores.
7. **Reutilizar antes de construir:** OpenSpec 1.14.1, como dependencia directa con versión fija, gestiona el ciclo del spec; un motor propio ligero queda como alternativa.
8. **Verificación ejecutable:** los criterios de aceptación incluyen comandos reales.
9. **Multi-modelo y multi-herramienta:** `specty init` genera por defecto los archivos de todas las herramientas soportadas, para poder cambiar de modelo o de proveedor sin reconfigurar el repositorio.
10. **Idioma a elección:** los archivos de configuración y los specs se generan en inglés o español y la persona puede modificarlos.

## 4. Alcance

**Dentro:** CLI de onboarding con elección de idioma (inglés o español); detección de stack y frameworks (TypeScript y JavaScript, Dart, .NET, Java, Kotlin, Python, Go, Ruby y PHP); generación de reglas, roles y plantillas para todas las herramientas de IA soportadas; integración con OpenSpec 1.14.1 y motor propio alternativo; compuertas de aprobación y verificación; hooks y plantillas de CI; servidor MCP de grafo de código y métricas; comandos de estado y diagnóstico.

**Fuera:** ejecutar o intermediar llamadas a LLMs; ser un runtime de agentes (no reemplaza a LangGraph ni a CrewAI); reemplazar el CI existente; modificar el código de la aplicación; garantizar obediencia en IDEs que no ofrecen hooks (ahí se aplica el mejor esfuerzo con reglas).

## 5. Usuarios y escenarios

**Usuarios:** desarrollador individual, equipo que necesita un estándar común y tech lead que audita decisiones.

**Escenarios:** (1) proyecto nuevo; (2) proyecto existente (brownfield); (3) monorepo o workspace multi-repo, por ejemplo app móvil, web y backend; (4) añadir una funcionalidad; (5) reanudar una tarea interrumpida; (6) actualizar la herramienta sin perder personalizaciones.

## 6. Arquitectura por capas

| Capa | Responsabilidad | Quién la aporta |
| --- | --- | --- |
| 1. CLI | onboarding, detección, scaffolding, sync, doctor, status, verify, approve | specty (Node.js + TypeScript) |
| 2. Motor de specs | proponer, revisar, aplicar y archivar cambios; specs vigentes | OpenSpec 1.14.1 (por defecto) o motor propio ligero |
| 3. Reglas y roles | AGENTS.md, reglas modulares, catálogo de sub-agentes, enrutamiento por tarea, archivos de todas las herramientas de IA | specty |
| 4. Gobernanza | estado de aprobación, hooks, CI, verificación con comandos | specty |
| 5. Servidor MCP | grafo de código local y métricas del flujo, disponibles para cualquier agente | specty |

## 7. Comandos del CLI

Instalación: `npm install -g specty` y luego `specty init`; sin instalar, `npx specty init`.

| Comando | Función |
| --- | --- |
| `specty init` | onboarding interactivo y scaffolding completo. Banderas: `--yes`, `--dry-run`, `--lang` (en o es), `--tool` (por defecto todas las herramientas soportadas), `--stack`, `--spec-engine` (openspec por defecto, o builtin), `--no-hooks`, `--no-ci`, `--no-mcp` |
| `specty doctor` | diagnostica la instalación: versión de OpenSpec, archivos faltantes o desincronizados, hooks y configuración |
| `specty status` | lista los changes con estado, progreso de tareas y siguiente tarea pendiente |
| `specty approve <change>` | marca un change como aprobado registrando persona, fecha y hash del contenido |
| `specty verify <change>` | ejecuta los comandos de verificación del stack y de los criterios del spec y guarda el resultado |
| `specty check-approval` | lo usan hooks y CI; sale con error si hay cambios de código sin un change aprobado |
| `specty sync` | regenera los archivos de todas las herramientas desde AGENTS.md y las reglas, sin pisar las ediciones de la persona |
| `specty adapters add / remove <tool>` | agrega o quita los archivos de una herramienta de IA |
| `specty lang set <en o es>` | cambia el idioma de los archivos generados y regenera solo los bloques gestionados que no fueron modificados |
| `specty mcp` | inicia el servidor MCP (stdio) con grafo de código, ciclo de specs y métricas |
| `specty index` | construye o actualiza el grafo de código; `--full` fuerza la reindexación completa |
| `specty metrics` | muestra o exporta (`--json`, `--csv`) las métricas del flujo |
| `specty update` | refresca plantillas y reglas respetando personalizaciones (diff y confirmación) |

## 8. Fase de inicialización

### 8.0 Orden del onboarding e idioma

El onboarding de `specty init` sigue este orden: (1) idioma, (2) detección o selección de stack y frameworks, (3) proyecto nuevo o existente, (4) herramientas de IA (todas preseleccionadas), (5) motor de specs (OpenSpec por defecto o motor propio), (6) servidor MCP y métricas (activados por defecto), (7) hooks y CI y (8) resumen editable y confirmación.

La primera pregunta es el idioma en que se generarán los archivos de configuración y los specs: inglés o español. La respuesta se guarda en `.specty/config.yaml` (`language: en` o `language: es`) y determina:

- Las partes de `AGENTS.md` gestionadas por specty, las reglas modulares, los roles y las plantillas de spec.
- Una instrucción en `AGENTS.md`, fuera del bloque de OpenSpec, para que el agente redacte proposals, tasks, specs, informes y verificaciones en ese idioma.
- Los mensajes del CLI.

Todos los archivos generados son Markdown o YAML editables por la persona. `specty sync` y `specty lang set` solo regeneran los bloques gestionados que no fueron modificados y muestran un diff de los demás. Las plantillas existen en ambos idiomas con las mismas claves y una prueba automática verifica que no falte ninguna. Las palabras clave estructurales que OpenSpec 1.14.1 exige para validar un spec se mantienen tal como las define esa versión; solo se traduce el contenido libre (verificar en la Fase 0).

### 8.1 Detección del entorno

Los indicadores de cada lenguaje y framework están en la tabla de la sección 15 (por ejemplo `pubspec.yaml`, `angular.json`, `pom.xml`, `build.gradle` o `build.gradle.kts`, `Gemfile` y `composer.json`). Si detecta varios, pregunta si es monorepo, workspace multi-repo o repo único y configura el alcance por carpeta. Respeta `.gitignore` y excluye código autogenerado (`*.g.dart`, `*.freezed.dart`, `bin/`, `obj/`, `dist/`, `build/`, `target/`, `vendor/` y `node_modules/`).

### 8.2 Proyecto nuevo

Preguntas guiadas: de qué trata el proyecto, repo único o multi-repo, herramientas de IA que usará el equipo, arquitectura mediante un selector con una recomendación según el alcance (por ejemplo Clean Architecture, hexagonal, MVVM o capas) y convenciones de ramas y commits. Antes de generar, muestra un resumen editable con stack, buenas prácticas, patrones y arquitectura; la persona lo ajusta y confirma.

### 8.3 Proyecto existente

Analiza estructura, dependencias, linters, pruebas y patrones, y con eso propone el contenido de `AGENTS.md` y de las reglas. Si detecta malas prácticas o ausencia de arquitectura, patrones o pruebas, sugiere incluirlos como propuestas que la persona acepta o rechaza una por una. Para OpenSpec sigue la adopción brownfield: siembra specs de las capacidades principales de forma incremental, no exhaustiva.

## 9. Integración con OpenSpec

1. **Dependencia directa y versión fija.** specty declara `@fission-ai/openspec` en su `package.json` con la versión exacta 1.14.1 (sin rangos) y lo invoca desde sus propias dependencias, sin exigir instalación global. Es el único motor de specs externo. Antes de implementar hay que verificar que esa versión existe (por ejemplo con `npm view @fission-ai/openspec@1.14.1`) y qué comandos y carpetas define, porque han cambiado entre versiones (por ejemplo, los comandos slash de propuesta). specty ejecuta la inicialización de OpenSpec seleccionando las herramientas de IA elegidas.
2. **Uso del ciclo.** Propuesta, revisión, aplicación y archivado se delegan a OpenSpec: cada change vive en `openspec/changes/<nombre>/` con `proposal.md`, `tasks.md` y los deltas de spec; al archivar, los deltas actualizan `openspec/specs/`, que pasa a ser la fuente de verdad vigente.
3. **Convivencia con AGENTS.md.** OpenSpec escribe y refresca instrucciones en `AGENTS.md`. specty no toca su bloque; las reglas propias viven en `.specty/` y se referencian desde `AGENTS.md` fuera de la zona gestionada por OpenSpec. `specty update` debe sobrevivir a la ejecución de `openspec update`.
4. **Extensiones propias sobre OpenSpec:** etiqueta de agente y alcance de archivos en cada tarea, estado de aprobación y verificación ejecutable.
5. **Motor propio alternativo.** `--spec-engine builtin` genera y gestiona sin OpenSpec una estructura mínima con el mismo formato (proposal, tasks, deltas y archivo), con validación básica propia y los mismos comandos de specty. El formato es compatible para poder migrar a OpenSpec después sin reescribir los changes.
6. **Riesgos a documentar:** cambios frecuentes en los comandos; telemetría anónima de uso (el repositorio de OpenSpec indica que recoge estadísticas anónimas), de la que hay que documentar cómo desactivarla; y licencia (fuentes de terceros la describen como MIT, a confirmar en el paquete 1.14.1; una licencia MIT es compatible con publicar specty bajo GPL).

## 10. Ciclo de vida de cada petición

Estados: `draft` → `approved` → `in-progress` → `verifying` → `done` (más `blocked` y `rejected`).

**Fase 1. Análisis y planificación (draft).** El orquestador lee `AGENTS.md`, el catálogo de roles y los specs vigentes. No escribe código fuente. Crea el change con proposal, tasks y deltas; cada tarea indica agente, archivos permitidos y verificación. Se detiene.

**Fase 2. Pausa y aprobación.** La persona revisa y edita. Aprueba con `approve` o editando el estado en el archivo; se registra quién, cuándo y el hash del contenido. El «Aprobado» en el chat solo dispara la comprobación: el agente debe leer el archivo y confirmar el estado. Si el spec cambia después de aprobarse (hash distinto), exige una nueva aprobación.

**Fase 3. Ejecución (in-progress).** Solo si el estado es approved. Sigue las tareas en orden marcando cada checkbox y respeta el alcance de archivos de cada una. Si el IDE soporta sub-agentes reales, delega cada tarea al rol correspondiente. Si no los soporta, el agente **simula cada rol ejecutando en orden lo que haría ese agente**, con este protocolo:

1. Agrupa las tareas por rol respetando las dependencias (por ejemplo: datos, backend, frontend, pruebas y revisión).
2. Para cada rol declara `[rol: <nombre>]`, carga solo las reglas y el alcance de archivos de ese rol y ejecuta todas sus tareas en secuencia antes de pasar al siguiente.
3. Al cerrar el rol escribe un resumen de entrega (qué hizo, archivos tocados y pendientes) y lo guarda en el change; el rol siguiente parte de ese resumen y no de toda la conversación.
4. Marca cada tarea en `tasks.md` al terminarla y actualiza `last_task`.
5. Si necesita salirse del alcance, se detiene y pide una enmienda al spec.

**Fase 4. Verificación y cierre (verifying → done).** Ejecuta los comandos del stack y de los criterios, adjunta la salida real y la compara con los criterios de aceptación. Si algo falla, vuelve a la tarea correspondiente; si todo pasa, archiva con OpenSpec e informa a la persona.

## 11. Formato del spec y del estado

El estado va en un archivo aparte para no alterar el formato de OpenSpec: `openspec/changes/<change>/specty.yaml`. Si OpenSpec no tolera archivos extra en la carpeta del change, se mueve a `.specty/state/`.

```yaml
status: draft        # draft | approved | in-progress | verifying | done | blocked | rejected
approved_by: null
approved_at: null
content_hash: null   # hash de proposal.md + tasks.md + deltas al momento de aprobar
last_task: null
```

Convención en `tasks.md`:

```markdown
- [ ] 1.1 Crear entidad y migración  [agent: data] [files: prisma/**, src/auth/**]
      verify: npx prisma validate
- [ ] 1.2 Implementar servicio JWT  [agent: backend] [files: src/auth/**]
      verify: npm test -- auth
```

El `proposal.md` incluye objetivo, arquitectura propuesta, impacto, criterios de aceptación con comandos y riesgos.

## 12. Roles de sub-agentes

Catálogo inicial: orquestador (planifica y no escribe código), frontend/UI, backend/lógica de negocio, datos, pruebas, y revisión y seguridad. Cada rol vive en `.specty/agents/<rol>.md` y define responsabilidad, archivos permitidos y prohibidos, reglas que debe cargar, comandos permitidos, orden típico dentro del flujo (lo usa la simulación de la Fase 3) y formato de salida.

Una matriz de enrutamiento (`.specty/routing.md`) indica qué rol y qué reglas aplican según el tipo de tarea, con carga progresiva para no saturar el contexto. Donde el IDE soporte sub-agentes reales (por ejemplo Claude Code con `.claude/agents/`) specty los genera; en el resto, el agente simula cada rol siguiendo el protocolo de la Fase 3.

## 13. Reglas y archivos por herramienta

`AGENTS.md` es corto y contiene el protocolo del orquestador con las reglas duras (nunca escribir código sin un change aprobado, nunca salir del alcance de la tarea, siempre verificar con comandos), el stack, la arquitectura, las convenciones y enlaces a las reglas modulares. Como en la fase de desarrollo se pueden usar distintos modelos de distintos proveedores, `specty init` genera por defecto los archivos de **todas** las herramientas soportadas (la persona puede desmarcar las que no use). Son archivos delgados que apuntan a `AGENTS.md` y a `.specty/rules/`, de modo que no divergen; `specty sync` los regenera y `specty doctor` detecta desfases.

| Herramienta | Archivos |
| --- | --- |
| Antigravity | `AGENTS.md` y `.agent/` |
| Claude Code | `CLAUDE.md` que importa `AGENTS.md`, `.claude/agents/`, hooks en `.claude/settings.json` y `.mcp.json` |
| Cursor | `.cursor/rules/*.mdc` y `.cursor/mcp.json` (`.cursorrules` solo como opción heredada) |
| GitHub Copilot | `.github/copilot-instructions.md` y `.vscode/mcp.json` |
| Windsurf | `.windsurf/rules/` |
| Codex CLI | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` que referencia `AGENTS.md` |
| Cline | `.clinerules/` |
| Roo Code | `.roo/rules/` |
| Continue | `.continue/rules/` |
| Junie (JetBrains) | `.junie/guidelines.md` |
| Amazon Q Developer | `.amazonq/rules/` |
| Aider | `CONVENTIONS.md` y referencia en `.aider.conf.yml` |
| OpenCode | `opencode.json` (con servidor MCP specty) y `AGENTS.md` |
| Zed Editor | `.zed/settings.json` (con context_servers MCP specty) |
| Sourcegraph Cody | `.cody/project.json` y `.cody/rules.json` |
| OpenAI Canvas / ChatGPT Projects | `.specty/exports/chatgpt-instructions.md` y `.specty/exports/openai-context.md` |

Las convenciones de cada herramienta, incluida la ubicación de su configuración MCP, cambian; el implementador debe verificarlas todas antes de generar. Una herramienta nueva se agrega con un adaptador (`specty adapters add`).

## 14. Gobernanza y compuertas

- **check-approval:** falla si hay cambios en código fuente sin un change approved, in-progress o done asociado.
- **Hook pre-commit:** ejecuta check-approval y permite una salida de emergencia explícita (variable de entorno o trailer en el commit) que queda registrada para auditoría, pensada para hotfixes.
- **Hook de IDE:** donde exista (por ejemplo PreToolUse en Claude Code), bloquea escrituras en rutas de código fuente si no hay un change aprobado activo.
- **CI:** plantillas para GitHub Actions, GitLab CI y Azure Pipelines que validan los changes abiertos con OpenSpec, ejecutan check-approval y los comandos de verificación, y fallan si el PR toca código sin change asociado.
- **Quality gates configurables:** lint, pruebas, análisis estático y cobertura mínima.
- **Auditoría:** los changes archivados y los registros de aprobación forman el historial de decisiones.

## 15. Lenguajes, frameworks y verificación por stack

Lenguajes y frameworks soportados, con sus indicadores de detección y los comandos de verificación por defecto, editables en `.specty/config.yaml`. Si el proyecto ya define scripts (`package.json`, `composer.json`, `Makefile` o tareas de Gradle), tienen prioridad. Cada fila tiene plantillas de reglas propias en `templates/`; un framework sin plantilla usa las de su lenguaje.

| Lenguaje | Frameworks populares | Indicadores | Verificación por defecto |
| --- | --- | --- | --- |
| TypeScript / JavaScript (web) | Angular, React, Next.js, Vue, Nuxt, Svelte, Astro | `angular.json`, `svelte.config.js`, `astro.config.mjs`; dependencias en `package.json` | `npm run lint`, `ng test --watch=false` (Angular), `npx svelte-check` (Svelte), `npx astro check` (Astro) o `npm test`, `npm run build` |
| TypeScript / JavaScript (backend & edge) | NestJS, Express, Fastify, Hono | `nest-cli.json`, `@nestjs/core`, `express`, `fastify`, `hono` en `package.json` | `npm run lint`, `npm test`, `npm run build`, `npx prisma validate` si usa Prisma |
| TypeScript / JavaScript (mobile) | React Native, Expo | `app.json`, dependencias `expo` o `react-native` en `package.json` | `npx expo-doctor`, `npm test` |
| Dart | Flutter | `pubspec.yaml` | `dart format --set-exit-if-changed .`, `flutter analyze`, `flutter test` |
| C# / .NET | ASP.NET Core (Web API, MVC, Minimal APIs), Blazor, .NET MAUI | `.csproj`, `.sln` | `dotnet build`, `dotnet test`, `dotnet format --verify-no-changes` |
| Java | Spring Boot, Quarkus, Micronaut | `pom.xml`, `build.gradle` | Maven: `mvn verify`; Gradle: `./gradlew check` |
| Kotlin | Spring Boot, Ktor, Android con Jetpack Compose, Kotlin Multiplatform (KMP) | `build.gradle.kts` con el plugin de Kotlin, `commonMain`, `AndroidManifest.xml` | `./gradlew check` (incluye ktlint o detekt si están configurados) |
| Python | Django, FastAPI, Flask (con gestores `uv`, `poetry`, `pdm` o `pip`) | `pyproject.toml`, `uv.lock`, `poetry.lock`, `pdm.lock`, `requirements.txt`, `manage.py` | `uv run ruff check` / `poetry run ruff check` / `ruff check`, `uv run pytest` / `poetry run pytest` / `pytest` (o `manage.py test` en Django) |
| Go | Gin, Echo, Fiber | `go.mod` | `go vet ./...`, `go test ./...` |
| Ruby | Rails, Sinatra | `Gemfile`, `config/application.rb` | `bundle exec rubocop`, `bundle exec rspec` (o `bin/rails test`) |
| PHP | Laravel, Symfony | `composer.json`, `artisan`, `symfony.lock` | `composer validate`, `vendor/bin/phpunit` o `php artisan test`, y `vendor/bin/pint --test` o `vendor/bin/phpstan` si están instalados |
| Rust | Actix-web, Axum, Rocket, Tauri | `Cargo.toml`, `Cargo.lock` | `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` |
| Swift | SwiftUI, Vapor, Hummingbird | `Package.swift`, `*.xcodeproj`, `*.xcworkspace` | `swift-format lint -s`, `swift test` |
| C / C++ | CMake, Make | `CMakeLists.txt`, `Makefile`, `compile_commands.json` | `cmake --build build`, `ctest --test-dir build`, `clang-format --dry-run` |
| Elixir | Phoenix, Ecto | `mix.exs`, `mix.lock` | `mix format --check-formatted`, `mix test`, `mix credo` |

## 16. Reanudación y estado

Al iniciar cualquier sesión el agente lee `specty.yaml` y `tasks.md` y continúa en la primera tarea sin marcar; `status` muestra el mismo resumen a la persona, y la herramienta MCP `get_active_change` devuelve el mismo estado. Con varios changes abiertos, el agente pregunta cuál retomar.

## 17. Servidor MCP de grafo de código y métricas

specty incluye un servidor MCP local (`specty mcp`, transporte stdio) que puede usar cualquier agente de cualquier herramienta. Da contexto estructural del código sin explorar el repositorio a ciegas, expone el estado del flujo de specs y registra métricas. No llama a modelos, no usa red y es de solo lectura salvo el registro de eventos de métricas.

### 17.1 Motor Dual de Grafo de Código

- **Proveedor `codebase-memory` (Predeterminado):** Integra y andamia automáticamente `codebase-memory-mcp` en los clientes MCP de las herramientas configuradas. Ofrece análisis de grafo avanzado con AST, llamadas, dependencias, `trace_path`, `get_architecture`, `detect_changes` y `manage_adr`.
- **Proveedor `builtin` (Ligero / Fallback):** Motor SQLite local (`node:sqlite`) in-process sin dependencias externas (`.specty/graph/graph.db` o en memoria), ideal para entornos mínimos, CI o ejecución aislada.
- **Graceful Fallback:** Si `codebase-memory` está configurado pero el binario no está instalado en el sistema, Specty degrada automáticamente a `builtin` sin fallos en tiempo de ejecución.

### 17.2 Herramientas MCP

| Herramienta MCP | Qué devuelve |
| --- | --- |
| `search_graph` | símbolos por nombre o patrón (clases, funciones, rutas) con archivo, línea y firma |
| `get_symbol` | definición de un símbolo con sus llamadores y llamados |
| `trace_path` | ruta de dependencias o llamadas entre dos símbolos o archivos |
| `detect_changes` | archivos y símbolos modificados respecto a una referencia de git, y los que dependen de ellos |
| `index_status` | estado del índice: commit indexado, archivos y antigüedad |
| `get_active_change` | change activo, estado, siguiente tarea, rol, archivos permitidos y comandos de verificación |
| `check_scope` | si una ruta está permitida para la tarea actual |
| `get_rules` | reglas modulares aplicables a un rol o tipo de tarea (carga progresiva) |
| `get_metrics` | métricas agregadas de un change o de un rango de fechas |
| `record_event` | registra un evento de métricas (solo añade líneas) |

### 17.3 Métricas

- Los eventos se guardan en local, en `.specty/metrics/events.jsonl` (solo se añaden líneas); `specty metrics` los agrega y los exporta con `--json` o `--csv`. Nada sale de la máquina y no hay telemetría.
- **Flujo:** changes por estado, tiempo en cada fase, espera de aprobación, tareas completadas sobre el total, reaprobaciones (spec modificado tras aprobar) y usos de la salida de emergencia.
- **Calidad:** resultado de cada verificación, tasa de aprobación a la primera, ciclos de retrabajo y comandos que fallaron.
- **Agentes:** tareas por rol y por herramienta y, si el agente lo informa, por modelo y proveedor; sirve para comparar modelos en la misma fase de desarrollo.
- **Grafo:** tamaño del índice, tiempo de indexación y consultas al grafo frente a lecturas de archivos, como indicador del ahorro de exploración.
- Los eventos no incluyen código ni el contenido de los specs.

### 17.4 Configuración en cada herramienta

`specty init` genera la configuración MCP de cada herramienta seleccionada (por ejemplo `.mcp.json`, `.cursor/mcp.json` o `.vscode/mcp.json`) apuntando a `specty mcp`. Donde la herramienta solo admite configuración global (verificarlo en cada caso, por ejemplo en Antigravity o Windsurf), muestra las instrucciones exactas en lugar de modificar archivos fuera del repositorio. El servidor es opcional: `--no-mcp` lo omite.

## 18. Estructura de archivos resultante

```
# Por defecto se generan los archivos de todas las herramientas; la persona puede quitar las que no use
AGENTS.md                          # fuente única de reglas
CLAUDE.md                          # Claude Code
GEMINI.md                          # Gemini CLI
CONVENTIONS.md                     # Aider
.agent/                            # Antigravity
.cursor/rules/ y .cursor/mcp.json  # Cursor
.github/copilot-instructions.md    # GitHub Copilot
.vscode/mcp.json                   # VS Code y Copilot (MCP)
.windsurf/rules/                   # Windsurf
.clinerules/  .roo/rules/  .continue/rules/  .junie/  .amazonq/rules/
.claude/agents/ y settings.json    # Claude Code (sub-agentes reales y hooks)
.mcp.json                          # Claude Code (MCP)
openspec/
  specs/                           # fuente de verdad vigente
  changes/<change>/                # proposal.md, tasks.md, deltas, specty.yaml
  changes/archive/
.specty/
  config.yaml                      # idioma, stack, herramientas, verificación, alcance
  agents/<rol>.md
  routing.md
  rules/*.md                       # reglas modulares por tecnología y tarea
  templates/
  hooks/
  graph/                           # grafo de código (fuera de git)
  metrics/                         # eventos de métricas (fuera de git)
.github/workflows/specty.yml
```

## 19. Requisitos técnicos del CLI

- Node.js LTS y TypeScript, módulos ESM, publicación en npm con el paquete `specty` (verificar que el nombre esté disponible) y el binario `specty`; se ejecuta con `npx specty init` o instalado de forma global.
- Licencia GPL declarada en el archivo `LICENSE` y en el campo `license` de `package.json`.
- Dependencias: `@fission-ai/openspec` 1.14.1 fija y directa. Para el CLI se sugieren commander (o cac), @clack/prompts, zod para validar la configuración, yaml, fast-glob, execa y vitest; para el servidor MCP, el SDK oficial de MCP para TypeScript, Tree-sitter y SQLite. Conviene preferir variantes WASM o binarios precompilados para que `npx` funcione en Windows, macOS y Linux sin toolchain de compilación.
- Plantillas por stack, por framework, por herramienta y por idioma (inglés y español) en `templates/`, con variables.
- Idempotencia, `--dry-run`, copias de respaldo antes de modificar, bloques gestionados con marcadores y soporte multiplataforma (rutas y finales de línea).
- Modo no interactivo (`--yes` con `--lang`) para automatización, códigos de salida claros y logs detallados con `--verbose`.
- Sin telemetría propia y funcionamiento sin red salvo para instalar dependencias.
- Seguridad: mostrar cualquier comando del repo antes de ejecutarlo, hooks legibles, servidor MCP local y de solo lectura (salvo el registro de métricas) y no tocar secretos ni archivos fuera del repositorio.
- Pruebas: unitarias de detección con fixtures (Angular, React, Next.js, NestJS, Flutter, .NET, Spring Boot, Ktor, Django, FastAPI, Go, Rails, Laravel y monorepo), snapshots de la generación por idioma y por herramienta, pruebas del indexador y de las herramientas MCP, y e2e en un directorio temporal.

## 20. Casos borde

- Monorepos y workspaces multi-repo con stacks distintos.
- Archivos preexistentes (`AGENTS.md`, `CLAUDE.md`, reglas de Cursor): fusión no destructiva.
- Git sin inicializar y proyectos sin pruebas ni linter.
- OpenSpec 1.14.1 no instalable (sin red o detrás de un proxy) o incompatible con la versión de Node del equipo: degradar a `--spec-engine builtin` con aviso.
- Spec editado después de aprobar, varios changes simultáneos y conflictos de merge en specs.
- Hotfix urgente sin spec.
- Archivos grandes o autogenerados excluidos del análisis y caché invalidada tras un `git checkout`.
- Cambio de idioma después de que la persona editó los archivos generados: regenerar solo los bloques sin modificar y mostrar un diff de los demás.
- Herramientas con configuración MCP solo global: mostrar instrucciones sin tocar archivos fuera del repositorio.
- Lenguajes o frameworks sin parser o sin plantilla propia: usar los del lenguaje base y avisar.
- Proyectos con varios lenguajes (por ejemplo backend en Java y web en Angular).
- IDE sin sub-agentes reales: simulación secuencial de roles con resúmenes de entrega.
- Archivos de varias herramientas desfasados respecto de `AGENTS.md`: `doctor` los detecta y `sync` los regenera.

## 21. Criterios de aceptación del MVP

1. `specty init` en un proyecto de prueba de cada stack soportado (Angular, React, Next.js, NestJS, Flutter, .NET, Spring Boot, Ktor, Django, FastAPI, Go, Rails y Laravel) detecta el stack y genera todos los archivos sin errores.
2. El onboarding pregunta el idioma (inglés o español) y todos los archivos de configuración y specs generados salen en ese idioma; `specty lang set` lo cambia sin pisar ediciones de la persona.
3. Ejecutarlo dos veces no cambia nada (idempotencia) y no pisa contenido del usuario.
4. OpenSpec 1.14.1 corre como dependencia directa con versión fija y `openspec update` no rompe el contenido propio; con `--spec-engine builtin` el flujo completo funciona sin OpenSpec.
5. Por defecto se generan los archivos de todas las herramientas soportadas y `doctor` detecta cuando alguno se desincroniza de `AGENTS.md`.
6. Un agente en un IDE soportado puede proponer, esperar aprobación, aplicar y archivar un change de ejemplo; en un IDE sin sub-agentes reales completa el change simulando los roles en orden y dejando un resumen de entrega por rol.
7. `check-approval` falla con cambios de código sin change aprobado y pasa con uno aprobado; modificar el spec tras aprobar exige nueva aprobación.
8. `verify` ejecuta los comandos del stack y registra la salida.
9. `specty mcp` arranca, indexa un proyecto de prueba, responde `search_graph`, `trace_path` y `detect_changes`, reindexa solo lo modificado tras un cambio de rama y registra eventos que `specty metrics` agrega.
10. `doctor` detecta archivos faltantes o desincronizados.
11. Las pruebas automatizadas con fixtures pasan en Windows, macOS y Linux.

## 22. Roadmap

- **Hito 1 (MVP):** `specty init` con elección de idioma, detección y plantillas para TypeScript y JavaScript, Dart y .NET; proyecto nuevo y existente; `AGENTS.md` y reglas modulares; OpenSpec 1.14.1 y motor propio; adaptadores de todas las herramientas soportadas; `specty.yaml` con `approve`; `status`, `sync` y `doctor`.
- **Hito 2:** `check-approval`, hook pre-commit y hooks de IDE, plantillas de CI, `verify`, simulación de roles y sub-agentes reales donde existan, análisis brownfield con propuestas de mejora, servidor MCP con las herramientas del ciclo de specs (`get_active_change`, `check_scope`, `get_rules`) y soporte de Java, Kotlin, Python, Go, Ruby y PHP con sus frameworks.
- **Hito 3:** grafo de código con indexación incremental, métricas, `lang set`, `update` seguro con diff y monorepos avanzados.

## 23. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Cambios frecuentes en OpenSpec o en las convenciones de los IDE | Versión fija 1.14.1, pruebas de compatibilidad y capa de adaptadores |
| La versión 1.14.1 no existe, está retirada o difiere de lo documentado | Verificarla en la Fase 0 con `npm view`; si falla, pedir la versión correcta antes de seguir |
| El modelo ignora las reglas | Compuertas duras (hooks, CI) y aprobación en archivo |
| Conflicto de AGENTS.md con OpenSpec | Bloques delimitados y archivos propios en `.specty/` |
| Archivos de varias herramientas que se desincronizan | Fuente única en `AGENTS.md`, `sync` y `doctor` |
| Fricción excesiva en cambios triviales | Salida de emergencia registrada y modo de cambios pequeños con spec mínimo |
| Telemetría y licencia de OpenSpec | Documentar, ofrecer desactivarla y verificar la licencia y su compatibilidad con la GPL |
| La GPL alcanza las plantillas que se copian a los repositorios de los usuarios | Definir una excepción explícita o licenciar las plantillas aparte, con asesoría legal |
| Dependencias nativas (Tree-sitter, SQLite) que rompen `npx` en algunas plataformas | Preferir WASM o binarios precompilados y probar en CI en los tres sistemas |
| La simulación de roles degrada la calidad por compartir contexto | Resúmenes de entrega por rol, carga de reglas por rol y sub-agentes reales donde existan |

## 24. Decisiones abiertas

**Decididas:** producto independiente llamado specty, licencia GPL, OpenSpec 1.14.1 como dependencia directa por defecto con un motor propio ligero como alternativa, e idioma elegible (inglés o español).

**Abiertas:**

1. Versión exacta de la GPL (por ejemplo GPL-3.0-or-later) y licencia de las plantillas que se copian a los repositorios de los usuarios.
2. Disponibilidad del nombre `specty` en npm y como binario.
3. ¿Estado en archivo aparte o en el frontmatter del proposal? Depende de lo que tolere OpenSpec 1.14.1.
4. Herramientas de IA que entran en el MVP frente a las que quedan como adaptadores posteriores.

## 25. Instrucciones para el agente constructor

Este documento puede usarse directamente como prompt de construcción. Estructura recomendada de las instrucciones al agente constructor:

1. **Rol:** ingeniero senior de herramientas CLI en TypeScript que construye specty por hitos.
2. **Contexto y objetivo:** secciones 1 a 5.
3. **Fase 0 obligatoria, antes de escribir código:** verificar que `@fission-ai/openspec@1.14.1` existe y leer su documentación para esa versión (comandos, carpetas, formato de spec, telemetría y licencia); comprobar las convenciones vigentes de cada herramienta de IA y de su configuración MCP; confirmar la disponibilidad del nombre `specty` en npm. No inventar comandos; si algo no coincide con este documento, detenerse y preguntar.
4. **Requisitos funcionales:** secciones 6 a 18.
5. **Requisitos técnicos y casos borde:** secciones 19 y 20.
6. **Entregables por hito:** sección 22, con pausa y aprobación entre hitos.
7. **Reglas de trabajo:** pruebas primero para detección, plantillas y servidor MCP; cambios pequeños; reportar progreso con la salida real de los comandos; todo texto generado existe en inglés y español con las mismas claves.
8. **Criterios de aceptación:** sección 21 y formato del reporte final.
