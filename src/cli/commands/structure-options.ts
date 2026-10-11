import type { SupportedLanguage } from "../../core/i18n.js";
import type { MonorepoKind, SupportedLanguageId } from "../../detect/types.js";

export type StructureType = "single" | "monorepo" | "workspace";

export interface StructureOption {
  value: StructureType;
  label: string;
  hint: string;
}

export interface MonorepoToolOption {
  value: MonorepoKind;
  label: string;
  hint: string;
  defaultLanguage: SupportedLanguageId;
  defaultFrameworks: string[];
  packageGlobs: string[];
  scopes: Array<{
    path: string;
    language: SupportedLanguageId;
    frameworks: string[];
  }>;
}

export interface WorkspaceComponentOption {
  value: string;
  label: string;
  hint: string;
  path: string;
  language: SupportedLanguageId;
  frameworks: string[];
  isMonorepo?: boolean;
  monorepoKind?: MonorepoKind;
}

export function getStructureOptions(lang: SupportedLanguage = "es"): StructureOption[] {
  if (lang === "en") {
    return [
      {
        value: "single",
        label: "Monolith (Single Project)",
        hint: "A single application or service with one centralized language and framework",
      },
      {
        value: "monorepo",
        label: "Monorepo (Multi-package / Orchestrated)",
        hint: "Multiple packages and applications managed by a single monorepo orchestrator",
      },
      {
        value: "workspace",
        label: "Workspace (Polyglot / Multi-stack)",
        hint: "Hybrid workspace hosting multiple independent languages, frameworks, or sub-monorepos",
      },
    ];
  }

  return [
    {
      value: "single",
      label: "Monolito (Single Project)",
      hint: "Un único proyecto o aplicación con un lenguaje y framework centralizado",
    },
    {
      value: "monorepo",
      label: "Monorepo (Multi-paquete / Orquestado)",
      hint: "Múltiples paquetes y aplicaciones gestionados por una herramienta orquestadora",
    },
    {
      value: "workspace",
      label: "Workspace (Políglota / Multi-stack)",
      hint: "Entorno híbrido donde conviven múltiples lenguajes, frameworks o monorepos independientes",
    },
  ];
}

export function getMonorepoToolOptions(lang: SupportedLanguage = "es"): MonorepoToolOption[] {
  const isEn = lang === "en";

  return [
    {
      value: "turbo",
      label: "Turborepo",
      hint: isEn
        ? "High-performance build system for TypeScript/JavaScript monorepos (Vercel)"
        : "Orquestador de alto rendimiento para monorepos JavaScript y TypeScript (Vercel)",
      defaultLanguage: "typescript",
      defaultFrameworks: ["next"],
      packageGlobs: ["apps/*", "packages/*"],
      scopes: [
        { path: "apps/web", language: "typescript", frameworks: ["next"] },
        { path: "packages/ui", language: "typescript", frameworks: ["react"] },
        { path: "packages/core", language: "typescript", frameworks: [] },
      ],
    },
    {
      value: "nx",
      label: "Nx",
      hint: isEn
        ? "Smart, fast and extensible build system supporting TS, Node, Python, Go, Rust"
        : "Monorepo empresarial extensible (soporta TypeScript, Node, Python, Go, Rust)",
      defaultLanguage: "typescript",
      defaultFrameworks: ["react"],
      packageGlobs: ["apps/*", "packages/*"],
      scopes: [
        { path: "apps/web", language: "typescript", frameworks: ["react"] },
        { path: "packages/shared", language: "typescript", frameworks: [] },
      ],
    },
    {
      value: "pnpm",
      label: "pnpm Workspaces",
      hint: isEn
        ? "Fast, disk space efficient package manager with workspaces (pnpm-workspace.yaml)"
        : "Workspaces eficientes y compartidos con enlaces duros (pnpm-workspace.yaml)",
      defaultLanguage: "typescript",
      defaultFrameworks: [],
      packageGlobs: ["apps/*", "packages/*"],
      scopes: [
        { path: "apps/web", language: "typescript", frameworks: [] },
        { path: "packages/core", language: "typescript", frameworks: [] },
      ],
    },
    {
      value: "npm",
      label: "npm Workspaces",
      hint: isEn
        ? "Native npm workspaces managed in root package.json"
        : "Workspaces nativos integrados en Node.js y npm en package.json",
      defaultLanguage: "typescript",
      defaultFrameworks: [],
      packageGlobs: ["packages/*"],
      scopes: [
        { path: "packages/app", language: "typescript", frameworks: [] },
        { path: "packages/core", language: "typescript", frameworks: [] },
      ],
    },
    {
      value: "yarn",
      label: "Yarn Workspaces",
      hint: isEn
        ? "Modern workspaces managed by Yarn Berry / Yarn v1"
        : "Workspaces modernos con Yarn Berry y Zero-installs",
      defaultLanguage: "typescript",
      defaultFrameworks: [],
      packageGlobs: ["packages/*"],
      scopes: [
        { path: "packages/app", language: "typescript", frameworks: [] },
        { path: "packages/core", language: "typescript", frameworks: [] },
      ],
    },
    {
      value: "lerna",
      label: "Lerna",
      hint: isEn
        ? "Original multi-package manager for publishing, versioning, and running scripts"
        : "Gestión, versionado y publicación de paquetes multi-repositorio",
      defaultLanguage: "typescript",
      defaultFrameworks: [],
      packageGlobs: ["packages/*"],
      scopes: [
        { path: "packages/app", language: "typescript", frameworks: [] },
        { path: "packages/core", language: "typescript", frameworks: [] },
      ],
    },
    {
      value: "melos",
      label: "Melos",
      hint: isEn
        ? "Official monorepo tool for Dart and Flutter multi-package repos (melos.yaml)"
        : "Monorepo oficial para paquetes y apps en Dart y Flutter (melos.yaml)",
      defaultLanguage: "dart",
      defaultFrameworks: ["flutter"],
      packageGlobs: ["packages/*"],
      scopes: [
        { path: "packages/app", language: "dart", frameworks: ["flutter"] },
        { path: "packages/core", language: "dart", frameworks: [] },
      ],
    },
    {
      value: "dotnet-sln",
      label: ".NET Solution",
      hint: isEn
        ? "Multi-project C# .NET solution with .sln orchestration"
        : "Solución multi-proyecto .sln para C# y .NET (Domain, Application, Api)",
      defaultLanguage: "csharp",
      defaultFrameworks: ["aspnet"],
      packageGlobs: ["src/*"],
      scopes: [
        { path: "src/Api", language: "csharp", frameworks: ["aspnet"] },
        { path: "src/Application", language: "csharp", frameworks: [] },
        { path: "src/Domain", language: "csharp", frameworks: [] },
      ],
    },
    {
      value: "cargo",
      label: "Cargo Workspaces",
      hint: isEn
        ? "Multi-crate Rust workspace managed in root Cargo.toml"
        : "Workspace multi-crate para Rust en Cargo.toml ([workspace] members)",
      defaultLanguage: "rust",
      defaultFrameworks: ["axum"],
      packageGlobs: ["crates/*"],
      scopes: [
        { path: "crates/server", language: "rust", frameworks: ["axum"] },
        { path: "crates/core", language: "rust", frameworks: [] },
      ],
    },
  ];
}

export function getWorkspaceComponentOptions(
  lang: SupportedLanguage = "es",
): WorkspaceComponentOption[] {
  const isEn = lang === "en";

  return [
    {
      value: "web-react",
      label: "Frontend Web (TypeScript + React / Vite)",
      hint: isEn ? "Single Page Application in apps/web" : "Single Page Application en apps/web",
      path: "apps/web",
      language: "typescript",
      frameworks: ["react"],
    },
    {
      value: "web-next",
      label: "Frontend Fullstack (TypeScript + Next.js)",
      hint: isEn
        ? "SSR / App Router web application in apps/web"
        : "Aplicación web SSR / App Router en apps/web",
      path: "apps/web",
      language: "typescript",
      frameworks: ["next"],
    },
    {
      value: "web-angular",
      label: "Frontend Enterprise (TypeScript + Angular)",
      hint: isEn ? "Standalone component UI in apps/web" : "Frontend corporativo en apps/web",
      path: "apps/web",
      language: "typescript",
      frameworks: ["angular"],
    },
    {
      value: "web-vue",
      label: "Frontend Reactivo (TypeScript + Vue / Nuxt)",
      hint: isEn ? "Reactive UI application in apps/web" : "Frontend reactivo en apps/web",
      path: "apps/web",
      language: "typescript",
      frameworks: ["vue"],
    },
    {
      value: "api-nest",
      label: "Backend Modular (TypeScript + NestJS)",
      hint: isEn
        ? "Enterprise modular backend in services/api"
        : "Backend modular empresarial en services/api",
      path: "services/api",
      language: "typescript",
      frameworks: ["nest"],
    },
    {
      value: "api-express",
      label: "Microservicios REST (TypeScript + Express)",
      hint: isEn
        ? "Lightweight API gateway or service in services/gateway"
        : "Gateway o servicio HTTP en services/gateway",
      path: "services/gateway",
      language: "typescript",
      frameworks: ["express"],
    },
    {
      value: "api-fastapi",
      label: "Backend API / IA (Python + FastAPI)",
      hint: isEn
        ? "Async Python OpenAPI service in services/ai-service"
        : "Servicio Python asíncrono para IA/APIs en services/ai-service",
      path: "services/ai-service",
      language: "python",
      frameworks: ["fastapi"],
    },
    {
      value: "api-django",
      label: "Backend Web (Python + Django)",
      hint: isEn
        ? "Fullstack Python administration and ORM in services/backend"
        : "Backend completo en services/backend",
      path: "services/backend",
      language: "python",
      frameworks: ["django"],
    },
    {
      value: "mobile-flutter",
      label: "App Móvil Multiplataforma (Dart + Flutter)",
      hint: isEn
        ? "Cross-platform mobile client in apps/mobile"
        : "Cliente móvil iOS/Android en apps/mobile",
      path: "apps/mobile",
      language: "dart",
      frameworks: ["flutter"],
    },
    {
      value: "api-aspnet",
      label: "Backend Empresarial (C# + ASP.NET Core)",
      hint: isEn
        ? "High-performance .NET Web API in services/dotnet-api"
        : "API robusta en services/dotnet-api",
      path: "services/dotnet-api",
      language: "csharp",
      frameworks: ["aspnet"],
    },
    {
      value: "api-go",
      label: "Microservicios de Alto Rendimiento (Go + Gin)",
      hint: isEn
        ? "Ultra-fast Go microservice in services/core-engine"
        : "Microservicio en Go en services/core-engine",
      path: "services/core-engine",
      language: "go",
      frameworks: ["gin"],
    },
    {
      value: "api-rust",
      label: "Servicios de Bajo Nivel (Rust + Axum)",
      hint: isEn
        ? "Memory-safe high-throughput service in services/rust-service"
        : "Servicio de alto rendimiento en services/rust-service",
      path: "services/rust-service",
      language: "rust",
      frameworks: ["axum"],
    },
    {
      value: "api-spring",
      label: "Backend Enterprise (Java + Spring Boot)",
      hint: isEn
        ? "Enterprise JVM service in services/enterprise-api"
        : "Servicio Java empresarial en services/enterprise-api",
      path: "services/enterprise-api",
      language: "java",
      frameworks: ["spring"],
    },
    {
      value: "turbo-monorepo",
      label: "Monorepo Web Interno (Turborepo)",
      hint: isEn
        ? "Nested Turborepo for web packages in packages/web-monorepo"
        : "Monorepo Turborepo interno en packages/web-monorepo",
      path: "packages/web-monorepo",
      language: "typescript",
      frameworks: ["next"],
      isMonorepo: true,
      monorepoKind: "turbo",
    },
    {
      value: "cargo-monorepo",
      label: "Monorepo Rust Interno (Cargo Workspace)",
      hint: isEn
        ? "Nested Cargo workspace for native crates in packages/rust-crates"
        : "Workspace Cargo interno para crates nativos en packages/rust-crates",
      path: "packages/rust-crates",
      language: "rust",
      frameworks: ["axum"],
      isMonorepo: true,
      monorepoKind: "cargo",
    },
    {
      value: "melos-monorepo",
      label: "Monorepo Flutter Interno (Melos Workspace)",
      hint: isEn
        ? "Nested Melos monorepo for Flutter modules in packages/flutter-modules"
        : "Monorepo Melos interno para módulos Flutter en packages/flutter-modules",
      path: "packages/flutter-modules",
      language: "dart",
      frameworks: ["flutter"],
      isMonorepo: true,
      monorepoKind: "melos",
    },
  ];
}
