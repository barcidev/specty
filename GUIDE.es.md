# Guia de Inicio y Configuracion de specty

Guia practica paso a paso para adoptar y configurar `specty` en cualquier tipo de proyecto de software, pensada para desarrolladores y lideres tecnicos de todos los niveles.

---

## 1. Que es specty y que problema resuelve

Cuando utilizas asistentes de programacion con Inteligencia Artificial (como Google Antigravity, Cursor, Claude Code, GitHub Copilot, Windsurf o Cline), es comun que la IA:
- Modifique archivos que no deberia tocar.
- Tome decisiones de arquitectura sin consultarte.
- Olvide acuerdos tecnicos previos cuando la conversacion se hace larga.
- Invente soluciones o bibliotecas innecesarias.

**specty** actua como un director de orquesta y filtro de seguridad. Su principio fundamental es:
> **Ningun codigo se escribe sin aprobacion humana explicita.**

El flujo que impone es simple:
1. La IA redacta un plan con una propuesta y una lista de tareas.
2. Tu revisas el plan y lo apruebas formalmente.
3. Solo cuando el plan esta aprobado, la IA tiene permiso para programar.
4. Git incluye un candado automatico (hook de pre-commit) que bloquea cualquier commit que no cuente con una aprobacion valida.

---

## 2. Requisitos Previos e Instalacion

### Requisitos minimos
- **Node.js:** Version 22.13.0 o superior (verificar con `node -v`).
- **Git:** Instalado y configurado en el sistema (verificar con `git --version`).

### Instalacion

```bash
# Opcion A: Instalacion global en tu sistema
npm install -g @barcidev/specty

# Opcion B: Ejecucion directa sin instalacion previa (recomendada)
npx @barcidev/specty init
```

---

## 3. Como Iniciar specty segun el Estado de tu Proyecto

### Caso 1: Proyecto en Blanco (Desde Cero / Carpeta Vacia)

Utiliza este flujo cuando vas a comenzar una aplicacion desde cero y todavia no existe codigo ni repositorio Git.

```bash
# 1. Crear la carpeta del proyecto y entrar en ella
mkdir mi-nuevo-proyecto
cd mi-nuevo-proyecto

# 2. Inicializar el repositorio Git
git init

# 3. Iniciar el asistente de specty
npx @barcidev/specty init
```

#### Respuestas recomendadas en el asistente interactivo:
- **Idioma:** Selecciona `Español (es)`.
- **Tipo de proyecto:** Selecciona `new` (Estructura limpia desde cero).
- **Estructura del repositorio (Monolito, Monorepo o Workspace):**
  - *Monolito:* Repositorio con una única aplicación o servicio. Permite seleccionar un solo lenguaje y framework.
  - *Monorepo:* Repositorio gobernado por un orquestador de paquetes centralizado. Despliega la lista de orquestadores disponibles (Turborepo, Nx, pnpm workspaces, npm workspaces, Yarn workspaces, Lerna, Melos, .NET Solution, Cargo) y permite seleccionar exactamente uno junto al stack de la aplicación principal.
  - *Workspace:* Espacio de trabajo políglota o que alberga múltiples subsistemas independientes. Permite seleccionar múltiples lenguajes, frameworks y/o monorepos internos.
- **Lenguaje y Framework:** Según la estructura elegida, seleccionas tu stack. Specty adapta automáticamente las directivas en `AGENTS.md`, el archivo de arquitectura `.specty/rules/core/architecture.md`, y genera todas las reglas correspondientes en `.specty/rules/lang/` y `.specty/rules/framework/` para cada subsistema configurado.
- **Patrón arquitectural:**
  - *Clean Architecture:* Recomendado para servicios backend robustos o aplicaciones moviles en Flutter.
  - *Modular / Feature-Based:* Recomendado para aplicaciones web en React, Next.js, Angular o NestJS.
  - *Layered (N-Capas):* Recomendado para APIs tradicionales con controladores, servicios y repositorios.
  - *Hexagonal (Puertos y Adaptadores):* Recomendado cuando el dominio de negocio debe estar completamente aislado de frameworks externos.
  - *Vertical Slices:* Recomendado cuando prefieres agrupar por funcionalidades completas en lugar de capas tecnicas.
- **Interfaz Gráfica y Estilo Visual (GUI & Tokens):**
  - *Detección de Interfaz:* Specty te preguntará si el proyecto contará con interfaz gráfica (web, móvil o escritorio). Si respondes que no, se omite esta capa.
  - *Personalización vs. Estilo Neutral:* Si cuenta con interfaz, puedes usar el estilo neutral por defecto (limpio, profesional, adaptable, con soporte claro/oscuro y bordes semi-redondeados de 8px) o personalizar las 5 dimensiones del producto:
    1. *Propósito:* SaaS/Dashboard, E-commerce, Landing/Marketing, Social/Móvil, Docs/Blog, Fintech, Salud, Educación o Propósito General.
    2. *Audiencia objetivo:* Público general B2C, Profesionales B2B, Desarrolladores, Jóvenes/Estudiantes, Adultos mayores / Accesibilidad reforzada.
    3. *Geometría de bordes:* Redondos pronunciados (12-20px), Semi-redondeados (6-8px) o Rectos (0px / esquinas vivas).
    4. *Superficies y efectos:* Sombras suaves difusas, Glassmorphism con transparencias, Sombras duras proyectadas o Plano minimalista sin sombras.
    5. *Modo de color:* Ambos (claro y oscuro con selector), Solo modo oscuro o Solo modo claro.
  - *Protocolo Obligatorio de Tokens para Agentes de IA:*
    - Si es la primera vez que un agente toca o escribe interfaz, tiene la **obligación estricta de crear y centralizar el archivo de tokens visuales** antes de codificar componentes.
    - Si el proyecto ya estaba iniciado, el agente debe **priorizar y preservar los colores existentes** de la marca. Si es nuevo, deduce la paleta armónica óptima según el propósito y audiencia.
    - Queda prohibido hardcodear colores o estilos arbitrarios en componentes.
  - *Dónde y cómo declarar bibliotecas específicas:*
    - Specty genera el archivo `.specty/rules/core/ui-style.md`. En su interior encontrarás el bloque reservado `<!-- USER_LIBRARIES_START -->`.
    - Escribe allí las librerías o sistemas de componentes que deseas que los agentes usen obligatoriamente (ej: `shadcn/ui`, `Tailwind CSS`, `Radix UI`, `Lucide Icons`, `Framer Motion`, `Taiga UI`, `Ant Design`). Los agentes respetarán tanto tus librerías como los tokens del estilo visual.
- **Motor de especificaciones:** Selecciona el motor que gestionara las propuestas, tareas y el archivado de especificaciones segun las necesidades de tu proyecto:
  - *openspec (Recomendado por defecto):* Utiliza el estandar oficial OpenSpec 1.14.1. Almacena las propuestas activas en `openspec/changes/<id>/` y las especificaciones consolidadas vigentes en `openspec/specs/`.
    - *Ventajas:* Total compatibilidad con el ecosistema OpenSpec, soporte de comandos rapidos en asistentes de IA (slash commands como `/opsx:propose`), formato estandarizado interoperable y base de conocimiento documental persistente que evoluciona con cada cambio archivado.
    - *Indicada si:*
      - Trabajas en un equipo mediano o grande que necesita documentacion viva de arquitectura.
      - Quieres que la documentacion funcional del proyecto quede visible y versionada en la raiz (`openspec/`).
      - Deseas aprovechar extensiones y herramientas compatibles con la especificacion OpenSpec.
  - *builtin (Motor ligero integrado):* Motor propio nativo de specty sin dependencias externas. Almacena las propuestas en `.specty/changes/<id>/` y las especificaciones archivadas en `.specty/specs/`.
    - *Ventajas:* Cero dependencias adicionales, ejecucion ultrarrapida, maxima privacidad sin telemetria externa, y mantiene la raiz de tu repositorio limpia encapsulando toda la gobernanza dentro del directorio oculto `.specty/`. Conserva exactamente el mismo formato de Markdown y YAML, permitiendo migrar a OpenSpec en cualquier momento sin reescribir nada.
    - *Indicada si:*
      - Buscas la configuracion mas minimalista y ligera posible.
      - Tu empresa tiene politicas estrictas de seguridad o auditoria que restringen paquetes o dependencias de terceros.
      - Prefieres que la carpeta raiz del proyecto no tenga directorios adicionales visibles (todo vive dentro de `.specty/`).
      - Proyectos personales o prototipos donde solo buscas el control de aprobacion y tareas sin la infraestructura externa de OpenSpec.
- **Flujo de Git:** Selecciona la estrategia de ramas que mejor se adapte a la dinamica de tu equipo:
  - *feature-branch (Recomendado por defecto):* Ramas cortas e independientes creadas para cada tarea (`feature/<id>`), que se integran a la rama principal (`main`) mediante revision y Pull Request.
    - *Ejemplo:* `feature/login-auth` -> Pull Request con revision -> merge a `main`.
    - *Indicada si:* Trabajas en un equipo donde cada cambio debe ser revisado antes de publicarse, o en proyectos donde buscas el equilibrio ideal entre orden y agilidad.
  - *gitflow:* Estructura tradicional y rigida con dos ramas principales de larga duracion (`main` para produccion estable y `develop` para integracion activa), asistidas por ramas `feature/*`, `release/*` y `hotfix/*`.
    - *Ejemplo:* `feature/carrito` -> merge a `develop` -> `release/v1.0` -> merge a `main` con etiqueta `v1.0`.
    - *Indicada si:* Tu proyecto maneja versiones formales programadas (lanzamientos semanales o mensuales), despliegas aplicaciones moviles en tiendas (Google Play o App Store), o requieres mantener versiones antiguas de produccion con soporte.
  - *trunk-based:* Todos los desarrolladores trabajan sobre una unica rama troncal (`main`) o en ramas de vida muy corta (menos de un dia) que se fusionan constantemente.
    - *Ejemplo:* Rama breve `auth-fix` -> merge diario directo a `main` tras pasar pruebas automatizadas.
    - *Indicada si:* Cuentas con un equipo con alta disciplina en Integracion Continua (CI/CD), pruebas automaticas confiables y deseas evitar conflictos de fusion o ramas rezagadas.
  - *centralized:* Commits directos en la rama principal (`main`), sin crear ramas de funcionalidad intermedias.
    - *Ejemplo:* `git commit` directamente en `main` -> `git push origin main`.
    - *Indicada si:* Trabajas en solitario en un proyecto personal, un prototipo rapido o un hackathon donde la velocidad prima y no existe riesgo de sobreescribir el trabajo de otros desarrolladores.
  - *forking:* Cada desarrollador trabaja en un clon independiente (fork) en su propia cuenta y envia Pull Requests hacia el repositorio central (upstream).
    - *Ejemplo:* `fork-personal:feature/api` -> Pull Request hacia `upstream:main`.
    - *Indicada si:* Es un proyecto de codigo abierto (Open Source), o un entorno corporativo donde colaboran desarrolladores externos o contratistas sin permisos directos de escritura en el repositorio base.
- **Convencion de commits:** Selecciona el formato de mensajes que mejor encaje con los estandares de tu proyecto:
  - *conventional (Recomendado por defecto):* Formato estructurado estandar `tipo(alcance): descripcion`.
    - *Ejemplo:* `feat(auth): anadir inicio de sesion con google` o `fix(api): corregir error 500 en pagos`.
    - *Indicada si:* Buscas el estandar mas adoptado en la industria del software, compatible con generacion automatica de notas de version (CHANGELOG) y herramientas de Semantic Release.
  - *classic:* Titulo simple en modo imperativo, sin prefijos ni etiquetas tecnicas.
    - *Ejemplo:* `Anadir inicio de sesion con google`.
    - *Indicada si:* Prefieres mensajes naturales y directos para lectura humana sin la sobrecarga de prefijos, habitual en proyectos personales o equipos tradicionales.
  - *gitmoji:* Uso de emojis semanticos al inicio del mensaje para categorizar el proposito del commit.
    - *Ejemplo:* `✨ Anadir inicio de sesion con google` o `🐛 Corregir fallo en validacion de email`.
    - *Indicada si:* Tu equipo prioriza la identificacion visual rapida en interfaces web como GitHub o GitLab (✨ funcionalidad, 🐛 correccion, ⚡ rendimiento, 📝 documentacion).
  - *ticket:* Prefijo obligatorio con el identificador del ticket o tarea de gestion.
    - *Ejemplo:* `[PROJ-123] Anadir inicio de sesion con google`.
    - *Indicada si:* La organizacion utiliza herramientas como Jira, Azure DevOps, Linear o Trello y requiere trazabilidad directa entre cada commit y una tarjeta de gestion.
  - *gitmoji-conventional (Hibrido):* Emoji semantico seguido de la estructura de Conventional Commits.
    - *Ejemplo:* `✨ feat(auth): anadir inicio de sesion con google`.
    - *Indicada si:* Quieres un historial visualmente atractivo pero conservando la compatibilidad con analizadores automaticos de Semantic Versioning.
  - *conventional-ticket (Hibrido):* Tipo y alcance seguidos del codigo de ticket del proyecto.
    - *Ejemplo:* `feat(auth): [PROJ-123] anadir inicio de sesion con google`.
    - *Indicada si:* Trabajas en un entorno corporativo riguroso que exige trazabilidad de tickets hacia Jira y automatizacion de releases con Conventional Commits.
  - *gitmoji-ticket (Hibrido):* Emoji semantico acompanado del codigo de ticket.
    - *Ejemplo:* `✨ [PROJ-123] Anadir inicio de sesion con google`.
    - *Indicada si:* Necesitas vincular tickets pero prefieres la sencillez visual de los emojis en lugar de etiquetas como `feat:` o `fix:`.
  - *gitmoji-conventional-ticket (Hibrido completo):* Combina emoji semantico, tipo con alcance y codigo de ticket.
    - *Ejemplo:* `✨ feat(auth): [PROJ-123] anadir inicio de sesion con google`.
    - *Indicada si:* Requieres el maximo nivel de expresividad: reconocimiento visual instantaneo, clasificacion tecnica estandarizada y trazabilidad hacia el gestor de proyectos.
- **MCP y Metricas:** Determina si deseas habilitar el protocolo de contexto para la IA y la auditoria local de gobernanza:
  - *Habilitado (Recomendado por defecto):*
    - *Que hace:* Activa el servidor local MCP (Model Context Protocol) sobre stdio (`specty mcp`) y registra eventos de auditoria en `.specty/metrics/events.jsonl` (tasa de aprobacion, duracion de tareas y alertas de bypass con privacidad total y cero telemetria externa).
    - *Ventajas:* Permite que los asistentes de IA consulten el mapa arquitectural del proyecto, definiciones de clases y especificaciones activas sin alucinar, y te permite generar reportes con `specty metrics`.
    - *Motores de Grafo disponibles (`graph_provider`):*
      - **codebase-memory (Predeterminado y recomendado para proyectos medianos/grandes):**
        - *Como funciona:* Utiliza el servidor especializado `codebase-memory-mcp`. Realiza un analisis profundo del repositorio construyendo un grafo relacional de simbolos, dependencias entre modulos, trazabilidad de rutas de llamada (`trace_path`) y soporte para registros de arquitectura (ADRs).
        - *Indicada si:* Trabajas en un proyecto mediano o grande, con arquitectura en capas, microservicios o monorepo, donde los metodos se invocan a traves de multiples archivos y necesitas que la IA comprenda el flujo logico completo de la aplicacion.
      - **builtin (Motor ligero integrado sin dependencias):**
        - *Como funciona:* Es el motor nativo de specty impulsado por SQLite integrado (`node:sqlite`). Mapea rapidamente archivos, simbolos clave (funciones, clases, interfaces, tipos) y dependencias directas (`import` / `require`) de forma autocontenida sin requerir ningun binario o paquete externo.
        - *Indicada si:* Buscas una configuracion ultraligera con cero dependencias externas, trabajas en proyectos pequenos/medianos o prototipos, o tu entorno de desarrollo tiene restricciones de instalacion de paquetes adicionales.
    - *Indicada si:* Utilizas entornos compatibles con MCP (Google Antigravity, Cursor, Claude Code, Windsurf, Cline, Roo Code, etc.) y buscas que la IA tenga comprension contextual profunda de la base de codigo.
  - *Deshabilitado:*
    - *Que hace:* No genera configuraciones de servidores MCP en los editores ni crea el archivo de registro de metricas.
    - *Indicada si:* Trabajas en maquinas virtuales o entornos con recursos de hardware muy restringidos, o si tu equipo prefiere no tener procesos adicionales de indexacion en segundo plano.
- **Hooks y CI:** Configura las compuertas de seguridad para prevenir codigo no autorizado en tu maquina y en la nube:
  - *Hooks de Git (pre-commit):*
    - *Habilitado (Recomendado por defecto):* Instala un bloqueo automatico en `.git/hooks/pre-commit`. Si la IA o un desarrollador intenta hacer `git commit` sobre codigo fuente sin contar con una propuesta aprobada (`specty approve`), Git rechazara el commit en seco.
      - *Indicada si:* Deseas maxima proteccion local para garantizar que ningun cambio de codigo se escriba sin planificacion previa.
    - *Deshabilitado:* No instala el candado en el repositorio local.
      - *Indicada si:* Estas en una fase de migracion gradual en un proyecto legacy con muchos desarrolladores y prefieres que el control se ejerza unicamente en el servidor de integracion continua (en los Pull Requests) sin alterar la experiencia local del equipo.
  - *Plataforma de CI (Integracion Continua):*
    - *github (GitHub Actions - Recomendado para GitHub):* Genera `.github/workflows/specty.yml` con el bot de PRs (`specty gate --comment`). Publica un comentario interactivo en el Pull Request que audita el hash SHA-256 de la propuesta, el progreso de las tareas y alertas de bypass.
      - *Indicada si:* El proyecto esta alojado en GitHub.
    - *gitlab (GitLab CI):* Genera `.gitlab-ci.yml` configurado para ejecutar la compuerta de validacion en los Merge Requests.
      - *Indicada si:* Tu equipo utiliza repositorios de GitLab (SaaS o Self-Hosted).
    - *azure (Azure Pipelines):* Genera `azure-pipelines.yml` con los pasos de verificacion de specty.
      - *Indicada si:* Tu empresa utiliza repositorios y pipelines de Azure DevOps.
    - *bitbucket (Bitbucket Pipelines):* Genera `bitbucket-pipelines.yml` para validar pull requests en Atlassian Bitbucket.
      - *Indicada si:* Tu organizacion centraliza su codigo en Bitbucket.
    - *none (Sin CI):* No genera archivos de integracion continua.
      - *Indicada si:* Es un proyecto de caracter personal o academico sin despliegue automatizado, o si ya cuentas con pipelines corporativos complejos y prefieres integrar el comando `npx specty gate` manualmente mas adelante.

---

### Caso 2: Proyecto Recien Iniciado (Con Scaffold o Framework Oficial)

Utiliza este flujo si acabas de crear el proyecto con una herramienta oficial (por ejemplo `npm create vite@latest`, `npx create-next-app`, `nest new api`, `dotnet new webapi` o `flutter create app`), pero todavia no has escrito logica de negocio propia.

```bash
# 1. Situarse en la raiz del proyecto recien creado
cd mi-proyecto-base

# 2. Ejecutar la inicializacion de specty
npx @barcidev/specty init
```

#### Comportamiento y variantes:
- **Deteccion automatica:** specty analiza archivos como `package.json`, `pubspec.yaml`, `*.csproj` o `pom.xml`, identificando el lenguaje principal y los frameworks.
- **Tipo de proyecto:** Selecciona `existing` (Detecta stack existente). De esta manera specty respetara la estructura generada por tu framework y no intentara sobreescribirla.
- **Validacion de comandos:** Abre `.specty/config.yaml` y confirma que la seccion `verify` tenga los comandos reales de tu proyecto:

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

### Caso 3: Proyecto Existente con Anos de Desarrollo (Legacy / Brownfield)

Aplica en proyectos consolidados con cientos o miles de commits, pipelines activos y multiples programadores. La regla de oro aqui es **no interrumpir el ritmo de trabajo del equipo**.

```bash
# Paso 1: Realizar una simulacion previa para inspeccionar cambios sin escribir archivos
npx @barcidev/specty init --dry-run

# Paso 2: Ejecutar la inicializacion real
npx @barcidev/specty init
```

#### Estrategia de adopcion progresiva:

1. **Adopcion incremental:** No intentes redactar especificaciones para todo el codigo existente de anos atras. specty solo supervisara los requerimientos nuevos, refactorizaciones y correcciones de errores futuros.

2. **Limitar las rutas vigiladas:** En `.specty/config.yaml`, ajusta `source_paths` para supervisar solo las carpetas donde se escribe codigo nuevo, y utiliza `exempt_paths` para liberar el codigo historico:

```yaml
governance:
  source_paths:
    - "src/features/nuevo-modulo/**" # Solo el modulo nuevo exige aprobacion
  exempt_paths:
    - "legacy/**"                    # Codigo antiguo sin bloqueo
    - "migrations/**"                # Scripts de base de datos
    - "**/*.md"                      # Documentacion libre
    - "docs/**"
```

3. **Flexibilizar compuertas de calidad iniciales:** Si el proyecto legacy aun no cuenta con 100% de pruebas pasando, suaviza `quality_gates` para que no impida cerrar tareas:

```yaml
governance:
  quality_gates:
    lint: false        # Desactivar temporalmente si hay advertencias historicas
    test: true         # Mantener activadas las pruebas existentes
    static: false      # Desactivar si hay errores de tipos heredados
    coverage_min: 0    # No exigir un porcentaje minimo de cobertura al inicio
```

4. **Salida de emergencia para despliegues urgentes (Bypass):** Si ocurre una incidencia en produccion y debes aplicar un cambio critico sin redactar un plan previo:
   - *Mediante variable de entorno:*
     ```bash
     SPECTY_BYPASS=1 git commit -m "fix: solucionar caida critica en produccion"
     ```
   - *Mediante mensaje de commit:*
     ```bash
     git commit -m "fix: parche de emergencia" -m "Specty-Bypass: hotfix critico en produccion"
     ```

---

## 4. Referencia Completa de Configuracion: `.specty/config.yaml`

El comportamiento de specty se controla desde `.specty/config.yaml`. A continuacion se explica cada campo y sus valores posibles.

### Estructura de Ejemplo

```yaml
version: 1
language: "es"
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

### Detalle de Opciones Personalizables

#### 1. Configuracion Base
- `version`: Version del esquema de configuracion. Valor: `1`.
- `language`: Idioma de las directivas y del CLI. Valores: `'es'` (Espanol) o `'en'` (Ingles). La IA redactara especificaciones y tareas en este idioma.
- `spec_engine`: Motor que administra el ciclo de vida de las propuestas y especificaciones:
  - `'openspec'` (Predeterminado): Estandar oficial OpenSpec 1.14.1.
    - *Estructura:* Gestiona propuestas activas en `openspec/changes/<id>/` (`proposal.md`, `tasks.md`, `specs/`) y consolida las versiones finales en `openspec/specs/`.
    - *Indicada si:* Proyectos en equipo que requieren documentacion viva de arquitectura visible en la raiz, interoperabilidad con herramientas del ecosistema OpenSpec y soporte de comandos de barra (`/opsx:propose`).
  - `'builtin'`: Motor ligero integrado de specty (cero dependencias externas).
    - *Estructura:* Gestiona propuestas en `.specty/changes/<id>/` y archiva en `.specty/specs/`, manteniendo la raiz del proyecto limpia.
    - *Indicada si:* Entornos corporativos con restricciones estrictas de paquetes de terceros, proyectos que buscan minima huella de dependencias o repositorios donde se prefiere que toda la gobernanza resida dentro del directorio oculto `.specty/`.

#### 2. Seccion `project`
- `project.kind`: Tipo de proyecto inicial. Valores: `'new'` o `'existing'`.
- `project.layout`: Diseno fisico del repositorio:
  - `'single'`: Unico proyecto en la raiz.
  - `'monorepo'`: Multiples aplicaciones o paquetes (Nx, Turborepo, Melos, Cargo workspaces).
  - `'multi-repo'`: Entornos multi-repositorio coordinados.
- `project.architecture`: Patron arquitectonico de referencia para guiar a la IA:
  - `'clean'`: Clean Architecture (Dominio, Casos de Uso, Presentacion).
  - `'modular'`: Diseno modular por caracteristicas de negocio.
  - `'hexagonal'`: Puertos y adaptadores desacoplados de frameworks.
  - `'layered'`: Arquitectura tradicional por capas tecnicas (controladores, servicios, repositorios).
  - `'vertical-slice'`: Rebanadas verticales autosuficientes por caso de uso.

#### 3. Seccion `scopes`
Lista de modulos supervisados en el repositorio:
- `path`: Directorio relativo del modulo (ej. `.` o `apps/backend`).
- `stack.language`: Lenguaje detectado (`typescript`, `javascript`, `dart`, `csharp`, `python`, `go`, `rust`, etc.).
- `stack.frameworks`: Frameworks identificados (`react`, `nestjs`, `flutter`, `angular`, `express`, etc.).
- `verify`: Comandos reales ejecutados por `specty verify`:
  - `lint`: Comando de analisis estatico de estilo.
  - `test`: Comando de pruebas automatizadas.
  - `build`: Comando de compilacion o empaquetado.
  - `typecheck`: Comando de verificacion de tipos.

#### 4. Seccion `tools`
Lista de asistentes y editores de IA soportados. specty sincroniza automaticamente sus archivos de configuracion:
- `antigravity`: Genera `AGENTS.md` y `.agents/rules/`.
- `claude`: Genera `CLAUDE.md`.
- `cursor`: Genera `.cursor/rules/specty.mdc`.
- `github-copilot`: Genera `.github/copilot-instructions.md`.
- `windsurf`: Genera `.windsurfrules`.
- `codex`: Genera `.codex/instructions.md`.
- `gemini`: Genera `GEMINI.md` y `.gemini/`.
- `cline`: Genera `.clinerules`.
- `roocode`: Genera `.roomodes` y `.roorules`.
- `continue`: Genera `.continue/config.json`.
- `junie`: Genera `.junie/instructions.md`.
- `amazon-q`: Genera `.amazonq/instructions.md`.
- `aider`: Genera `.aider.conf.yml`.
- `opencode`: Genera `.opencode/instructions.md`.
- `zed`: Genera `.zed/settings.json`.
- `cody`: Genera `.cody/rules.json`.
- `chatgpt`: Genera `.specty/exports/chatgpt-instructions.md`.

*Comandos utiles de gestion de adaptadores:*
```bash
specty adapters list                 # Ver estado de cada herramienta
specty adapters add cursor           # Habilitar un nuevo editor
specty adapters remove windsurf      # Deshabilitar un editor
```

#### 5. Seccion `git`
- `git.workflow`: Define la estrategia de branching gobernada por specty (utilizada por comandos como `specty branch <id>`):
  - `'feature-branch'` (Predeterminado): Ramas aisladas por funcionalidad (`feature/<id>`) que se fusionan a `main` via Pull Request tras revision.
    - *Ejemplo de flujo:* `feature/001-auth` -> PR -> merge a `main`.
    - *Indicada si:* Equipos que utilicen revision de codigo por pares en Pull Requests; es el flujo mas equilibrado y seguro.
  - `'gitflow'`: Modelo clasico con ramas base `main` (produccion) y `develop` (desarrollo), mas ramas `feature/*`, `release/*` y `hotfix/*`.
    - *Ejemplo de flujo:* `feature/001-auth` -> merge a `develop` -> `release/v1.0` -> `main`.
    - *Indicada si:* Equipos con ciclos de lanzamiento formales (ej. versiones mensuales fijas), o publicaciones en tiendas moviles (App Store, Play Store).
  - `'trunk-based'`: Desarrollo continuo sobre el tronco principal con ramas de menos de 24 horas y CI rapido.
    - *Ejemplo de flujo:* Rama corta `001-auth` -> merge diario directo a `main` tras pasar pruebas en el pipeline.
    - *Indicada si:* Equipos maduros con CI/CD continuo automatizado y pruebas confiables que buscan evitar ramas de larga duracion.
  - `'centralized'`: Trabajo directo sobre la rama principal sin ramas secundarias.
    - *Ejemplo de flujo:* Commits directos en `main` validados por el hook de specty antes de hacer push.
    - *Indicada si:* Desarrollador individual o prototipado rapido donde se prioriza la velocidad y no hay riesgo de pisar a otros companeros.
  - `'forking'`: Desarrollo en bifurcaciones personales (forks) con envio de Pull Requests al repositorio central.
    - *Ejemplo de flujo:* `fork:feature/001-auth` -> Pull Request hacia `upstream:main`.
    - *Indicada si:* Proyectos de codigo abierto (Open Source) o colaboracion con desarrolladores externos sin permisos de escritura directa.
- `git.commit_convention`: Formato de validacion aplicado a los mensajes de commit en Git:
  - `'conventional'` (Predeterminado): Estandar Conventional Commits (`tipo(alcance): mensaje`).
    - *Ejemplo:* `feat(auth): anadir inicio de sesion con google` o `fix(db): resolver timeout en conexion`.
    - *Indicada si:* Equipos que automatizan el versionado semantico (SemVer), releases y generacion de CHANGELOG.
  - `'classic'`: Titulo imperativo conciso y directo, sin prefijos ni etiquetas tecnicas.
    - *Ejemplo:* `Anadir inicio de sesion con google`.
    - *Indicada si:* Equipos tradicionales o proyectos personales donde se busca maxima sencillez y lectura humana directa.
  - `'gitmoji'`: Prefijo con emojis semanticos que identifican la naturaleza del commit.
    - *Ejemplo:* `✨ Anadir inicio de sesion con google` o `🐛 Corregir validacion de formulario`.
    - *Indicada si:* Se prioriza la identificacion visual rapida del historial en la interfaz web de GitHub o GitLab.
  - `'ticket'`: Prefijo con codigo de ticket o historia de usuario entre corchetes.
    - *Ejemplo:* `[PROJ-101] Anadir inicio de sesion con google`.
    - *Indicada si:* Organizaciones con integraciones activas hacia Jira, Linear o Azure DevOps que auditan tareas por ticket.
  - `'gitmoji-conventional'`: Hibrido que combina emoji semantico con la estructura de Conventional Commits.
    - *Ejemplo:* `✨ feat(auth): anadir inicio de sesion con google`.
    - *Indicada si:* Equipos que buscan atractivo visual en sus repositorios sin perder compatibilidad con herramientas de release.
  - `'conventional-ticket'`: Hibrido con Conventional Commits y codigo de ticket integrado.
    - *Ejemplo:* `feat(auth): [PROJ-101] anadir inicio de sesion con google`.
    - *Indicada si:* Entornos empresariales formales con compliance estricto, vinculacion a Jira y pipelines automatizados.
  - `'gitmoji-ticket'`: Hibrido con emoji semantico y codigo de ticket.
    - *Ejemplo:* `✨ [PROJ-101] Anadir inicio de sesion con google`.
    - *Indicada si:* Equipos que asocian tickets de gestion pero prefieren un estilo visual amigable en vez de etiquetas rigidas.
  - `'gitmoji-conventional-ticket'`: Hibrido completo con emoji, Conventional Commits y ticket.
    - *Ejemplo:* `✨ feat(auth): [PROJ-123] anadir inicio de sesion con google`.
    - *Indicada si:* Se requiere el maximo nivel de expresividad posible: categorizacion visual, analisis semantico y trazabilidad de negocio.

#### 6. Seccion `governance`
- `governance.hooks`: Activa o desactiva el hook `.git/hooks/pre-commit` para impedir commits no aprobados (`true` o `false`). Se puede gestionar en cualquier momento con `specty hooks install` o `specty hooks uninstall`.
- `governance.ci`: Define la plataforma de integracion continua para evaluar el PR Gate (`specty gate`):
  - `'github'`: Genera `.github/workflows/specty.yml` con el bot oficial comentador de Pull Requests.
  - `'gitlab'`: Genera `.gitlab-ci.yml` para validar merge requests en GitLab.
  - `'azure'`: Genera `azure-pipelines.yml` para Azure DevOps Pipelines.
  - `'bitbucket'`: Genera `bitbucket-pipelines.yml` para Bitbucket Pipelines.
  - `'none'`: Sin integracion continua automatizada.
- `governance.source_paths`: Lista de patrones de archivos protegidos. Modificar codigo en estas rutas requiere un cambio formalmente aprobado.
- `governance.exempt_paths`: Archivos que se pueden editar sin necesidad de propuesta previa (documentos Markdown, notas de version, carpetas de specs).
- `governance.bypass.env`: Nombre de la variable de entorno para bypass de emergencia (`SPECTY_BYPASS`).
- `governance.bypass.trailer`: Etiqueta en el mensaje de commit para bypass de emergencia (`Specty-Bypass`).
- `governance.quality_gates`: Verificaciones necesarias antes de marcar un cambio como completado con `specty done`:
  - `lint`: Requiere que el linter termine sin errores.
  - `test`: Requiere que las pruebas automatizadas pasen.
  - `static`: Requiere que el chequeo estatico de tipos pase.
  - `coverage_min`: Porcentaje minimo de cobertura de pruebas requerido (ej. `80` para exigir 80%).
- `governance.approval_method`: Modalidad de aprobacion:
  - `'cli'`: Aprobacion local ejecutando `specty approve`.
  - `'pr_review'`: Aprobacion sincronizada desde la revision del Pull Request en GitHub.
  - `'hybrid'`: Admite aprobacion tanto por terminal como por Pull Request.
- `governance.required_reviewers`: Lista de usuarios obligatorios para validar el cambio.
- `governance.require_codeowner_review`: Exige revision explicita de los duenos de codigo (`CODEOWNERS`).

#### 7. Seccion `mcp` (Model Context Protocol)
- `mcp.enabled`: Habilita o deshabilita el servidor local JSON-RPC sobre stdio (`specty mcp`) para que la IA consulte el grafo del codigo y el estado de los cambios.
- `mcp.graph_provider`: Motor de indexacion del grafo de dependencias de codigo:
  - `'codebase-memory'` (Predeterminado): Emplea el servidor especializado `codebase-memory-mcp` para generar un grafo semantico profundo con navegacion de llamadas, dependencias cruzadas entre modulos y trazabilidad de rutas (`trace_path`).
    - *Indicada si:* Proyectos medianos o grandes, monorepos o arquitecturas multicapa donde es critico que la IA comprenda el flujo de ejecucion complejo entre modulos.
  - `'builtin'`: Motor nativo ligero de specty implementado con SQLite integrado (`node:sqlite`). Mapea archivos, funciones, clases, tipos e importaciones directas de forma instantanea sin dependencias externas.
    - *Indicada si:* Proyectos donde buscas cero dependencias adicionales, prototipos o entornos con restricciones para ejecutar paquetes auxiliares.
- `mcp.graph.max_file_kb`: Tamano maximo por archivo en kilobytes para no sobrecargar el indice (por defecto 512 KB).
- `mcp.graph.exclude`: Directorios excluidos de la indexacion de codigo (ej. `dist/**`, `node_modules/**`).
- `mcp.custom_servers`: Permite registrar servidores MCP externos adicionales (por ejemplo bases de datos relacionales, Jira, Figma).

#### 8. Seccion `metrics`
- `metrics.enabled`: Guarda eventos de auditoria y tiempos de desarrollo exclusivamente en el archivo local `.specty/metrics/events.jsonl` (respetando la privacidad y con cero telemetria externa). Puedes consultar las metricas en consola con `specty metrics` o exportar un reporte ejecutivo con `specty metrics --export informe.html --open`.

---

## 5. El Ciclo de Vida Diario: De la Idea al Codigo en 6 Pasos

```text
[1. Propuesta]       openspec/changes/<id>/proposal.md y tasks.md
       |
[2. Revision]        specty status  /  specty ui
       |
[3. Aprobacion]      specty approve <id>
       |
[4. Desarrollo]      specty branch <id>  ->  specty start <id>
       |
[5. Verificacion]    specty verify <id>
       |
[6. Cierre]          specty done <id>  ->  specty archive <id>
```

### Paso 1: Redaccion de la Propuesta
Pide a tu asistente de IA en el chat que elabore una propuesta para tu requerimiento, o crea manualmente una carpeta dentro de `openspec/changes/<nombre-del-cambio>/`:
- `proposal.md`: Explica el problema, la solucion tecnica y los archivos afectados.
- `tasks.md`: Lista detallada de tareas con casillas de verificacion (`- [ ] Tarea 1`).

### Paso 2: Revision
Revisa el plan propuesto para comprobar que no agrega codigo innecesario:
```bash
# Ver el resumen de cambios activos y la siguiente accion sugerida
specty status
specty next
```

### Paso 3: Aprobacion Humana
Una vez que estes conforme con la propuesta, apruebala formalmente:
```bash
# Registra tu aprobacion y genera un hash SHA-256 inmutable de la propuesta
specty approve <nombre-del-cambio>
```

### Paso 4: Creacion de Rama y Desarrollo
```bash
# Crea o salta a la rama de trabajo asociada
specty branch <nombre-del-cambio>

# Cambia el estado de la propuesta a en progreso
specty start <nombre-del-cambio>
```
Ahora el asistente de IA puede programar y marcar tareas completadas en `tasks.md`. El hook de Git permitira realizar commits con normalidad.

### Paso 5: Verificacion
Una vez que el codigo esta terminado y las tareas marcadas:
```bash
# Ejecuta las pruebas, linters y comprobaciones configuradas en el proyecto
specty verify <nombre-del-cambio>
```

### Paso 6: Cierre y Archivo Historico
```bash
# Confirma que el 100% de las tareas estan completadas y las pruebas aprobadas
specty done <nombre-del-cambio>

# Mueve el cambio a la documentacion definitiva en openspec/specs/
specty archive <nombre-del-cambio>
```

---

## 6. Herramientas Graficas, Diagnostico y Mantenimiento

### Panel Visual Web (Dashboard)
Si prefieres no usar la terminal para revisar propuestas, tareas y diferencias de codigo:
```bash
# Abre la interfaz web local interactiva en tu navegador
specty ui
```

### Diagnostico y Reparacion Automatica
Si se borro accidentalmente algun archivo de configuracion o cambiaste de IDE:
```bash
# Inspecciona el estado del repositorio y repara archivos faltantes de forma automatica
specty doctor --fix
```

### Sincronizacion de Reglas
Si editaste `.specty/rules/` o modificaste `.specty/config.yaml`:
```bash
# Propaga los cambios hacia todos los archivos de reglas de los editores configurados
specty sync
```

### Metricas y Auditoria de Gobernanza
```bash
# Muestra el resumen de cumplimiento en consola
specty metrics

# Exporta un informe ejecutivo completo a formato HTML
specty metrics --export informe-gobernanza.html --format html --open
```
