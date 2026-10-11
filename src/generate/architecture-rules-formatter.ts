import type { SupportedLanguage } from "../core/i18n.js";
export interface ArchitectureRuleScope {
  path: string;
  stack: {
    language: string;
    frameworks?: string[];
  };
}

export interface ArchitectureRuleOptions {
  lang: SupportedLanguage;
  layout: "single" | "monorepo" | "multi-repo" | "workspace";
  architecture?: string;
  scopes: ArchitectureRuleScope[];
}

export function formatArchitectureRuleContent(options: ArchitectureRuleOptions): string {
  const { lang, layout, architecture = "clean", scopes } = options;
  const isEn = lang === "en";

  const scopesTable =
    scopes.length > 0
      ? scopes
          .map(
            (s) =>
              `- \`${s.path}\`: ${s.stack.language}${
                s.stack.frameworks && s.stack.frameworks.length > 0
                  ? ` (${s.stack.frameworks.join(", ")})`
                  : ""
              }`,
          )
          .join("\n")
      : isEn
        ? "- `.` (Root repository scope)"
        : "- `.` (Scope raíz del repositorio)";

  if (layout === "monorepo") {
    if (isEn) {
      return `# Core Rule: Monorepo Architecture

## 1. Monorepo Organization
This repository is configured as an orchestrated multi-package monorepo.

### Configured Packages and Scopes:
${scopesTable}

## 2. Hard Governance Directives
1. **Unidirectional Dependency Flow:** Applications (\`apps/*\`) may depend on shared libraries (\`packages/*\`), but shared libraries MUST NEVER depend on applications or circular sibling libraries.
2. **Task Scope Boundaries:** Each task in \`tasks.md\` MUST explicitly declare affected packages in \`[files: ...]\` (e.g. \`[files: apps/web/**]\` or \`[files: packages/ui/**]\`). Never modify multiple packages in a single task unless explicitly designed as a cross-cutting contract update.
3. **Isolated Builds & Tests:** Run checks and tests filtered by package using the root orchestrator (e.g. \`turbo run test --filter=...\` or package-level verification commands).
4. **Public Package Interfaces:** Packages must expose a well-defined public contract (via \`index\` or exports maps). Internal private structures must not be imported directly from external packages.
`;
    }

    return `# Regla Core: Arquitectura de Monorepo

## 1. Organización del Monorepo
Este repositorio está estructurado como un Monorepo multi-paquete orquestado.

### Paquetes y Scopes Configurados:
${scopesTable}

## 2. Directrices Duras de Gobernanza
1. **Flujo de Dependencias Unidireccional:** Las aplicaciones (\`apps/*\`) pueden importar librerías compartidas (\`packages/*\`), pero las librerías NUNCA deben importar aplicaciones ni generar dependencias circulares entre paquetes hermanos.
2. **Límites de Alcance por Tarea:** Cada tarea en \`tasks.md\` DEBE declarar explícitamente los paquetes afectados en \`[files: ...]\` (ej: \`[files: apps/web/**]\` o \`[files: packages/ui/**]\`). Nunca modifiques múltiples paquetes en una sola tarea salvo cambios transversales de contrato justificados.
3. **Pruebas y Verificación Aisladas:** Ejecuta validaciones y pruebas filtradas por paquete a través del orquestador (ej: \`turbo run test --filter=...\` o comandos de verificación de cada scope).
4. **Interfaces Públicas de Paquete:** Cada paquete expone un contrato público estricto (mediante \`index\` o mapa de exportaciones). Nunca importes archivos internos privados directamente desde otro paquete.
`;
  }

  if (layout === "workspace" || layout === "multi-repo") {
    if (isEn) {
      return `# Core Rule: Polyglot Workspace Architecture

## 1. Workspace Organization
This repository is structured as a polyglot workspace housing multiple independent applications, services, and modules.

### Configured Workspace Subsystems:
${scopesTable}

## 2. Hard Governance Directives
1. **Strict Dependency Isolation:** Each subsystem (\`apps/*\`, \`services/*\`) maintains its own language, framework, dependencies, and execution runtime completely decoupled.
2. **Inter-Service Communication via Explicit Contracts:** Communication between services must follow formalized contracts (OpenAPI REST specifications, gRPC definitions, or shared DTO schemas). Direct filesystem coupling between disparate services is prohibited.
3. **Task Boundary Containment:** A task assigned to a specific subsystem MUST NOT modify files in sibling subsystems unless explicitly defined in an approved cross-service change proposal.
4. **Autonomous Quality Gates:** Each subsystem defines its own independent linting, build, and test verification commands in \`verify\`.
`;
    }

    return `# Regla Core: Arquitectura de Workspace Políglota

## 1. Organización del Workspace
Este repositorio está estructurado como un Workspace Políglota / Multi-stack que alberga múltiples aplicaciones, microservicios y módulos independientes.

### Subsistemas y Scopes del Workspace:
${scopesTable}

## 2. Directrices Duras de Gobernanza
1. **Aislamiento Estricto de Dependencias:** Cada subsistema (\`apps/*\`, \`services/*\`) gestiona su propio lenguaje, framework, dependencias y entorno de ejecución de forma completamente desacoplada.
2. **Comunicación Inter-servicio mediante Contratos:** La interacción entre servicios debe regirse estrictamente por contratos formalizados (OpenAPI REST, gRPC o DTOs compartidos). Queda prohibido el acoplamiento directo por sistema de archivos entre servicios dispares.
3. **Contención de Alcance por Tarea:** Una tarea asignada a un subsistema específico NUNCA debe alterar archivos de otros subsistemas salvo que se trate de un cambio transversal aprobado.
4. **Compuertas de Calidad Autónomas:** Cada componente cuenta con sus propios comandos de verificación, formateo y pruebas independientes en \`verify\`.
`;
  }

  // Monolith (single project)
  if (isEn) {
    return `# Core Rule: Monolith Architecture (${architecture})

## 1. Project Organization
This repository is configured as a single centralized application (Monolith) under the \`${architecture}\` architectural pattern.

### Governed Root Scope:
${scopesTable}

## 2. Hard Governance Directives
1. **Cohesive Layering:** Strictly respect domain, application, and infrastructure/presentation boundaries according to the \`${architecture}\` pattern.
2. **Zero Circular Dependencies:** Modules must maintain acyclic dependencies. Domain models must never import from external layers.
3. **Scope Discipline:** File modifications must remain strictly confined to the paths specified in \`[files: ...]\` for each active task in \`tasks.md\`.
4. **Unified Verification:** Run verification commands across the entire application to ensure complete regression safety.
`;
  }

  return `# Regla Core: Arquitectura de Monolito (${architecture})

## 1. Organización del Proyecto
Este repositorio está estructurado como una única aplicación centralizada (Monolito) bajo el patrón arquitectural \`${architecture}\`.

### Scope Raíz Gobernado:
${scopesTable}

## 2. Directrices Duras de Gobernanza
1. **Separación Cohesiva de Capas:** Respeta estrictamente los límites entre dominio, aplicación e infraestructura/presentación según el patrón \`${architecture}\`.
2. **Cero Dependencias Circulares:** Los módulos deben mantener dependencias acíclicas. Los modelos de dominio nunca deben depender de capas externas.
3. **Disciplina de Alcance:** Las modificaciones de código deben mantenerse estrictamente dentro de las rutas indicadas en \`[files: ...]\` para cada tarea en \`tasks.md\`.
4. **Verificación Unificada:** Ejecuta comandos de verificación completos en la raíz para garantizar la no-regresión de todo el sistema.
`;
}
