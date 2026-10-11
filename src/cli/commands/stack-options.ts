import type { SupportedLanguage } from "../../core/i18n.js";
import type { SupportedLanguageId } from "../../detect/types.js";

export interface LanguageOption {
  value: SupportedLanguageId;
  label: string;
  hint: string;
}

export interface FrameworkOption {
  value: string;
  label: string;
  hint: string;
}

export function getLanguageOptions(lang: SupportedLanguage = "es"): LanguageOption[] {
  if (lang === "en") {
    return [
      {
        value: "typescript",
        label: "TypeScript",
        hint: "Node.js, Web, React, Next.js, NestJS, Angular",
      },
      {
        value: "javascript",
        label: "JavaScript",
        hint: "Node.js, Web, React, Vue, Express, Vanilla",
      },
      {
        value: "python",
        label: "Python",
        hint: "FastAPI, Django, Flask, Data Science, AI/ML",
      },
      {
        value: "dart",
        label: "Dart",
        hint: "Flutter (Cross-platform Mobile, Web, Desktop), Dart CLI",
      },
      {
        value: "csharp",
        label: "C# / .NET",
        hint: "ASP.NET Core, Minimal APIs, Blazor, Clean Arch",
      },
      {
        value: "go",
        label: "Go (Golang)",
        hint: "Microservices, Gin, Fiber, Cloud Native APIs",
      },
      {
        value: "rust",
        label: "Rust",
        hint: "Axum, Actix, CLI, high-performance systems",
      },
      {
        value: "java",
        label: "Java",
        hint: "Spring Boot, Quarkus, Enterprise JVM",
      },
      {
        value: "kotlin",
        label: "Kotlin",
        hint: "Android Jetpack Compose, Spring Boot, Ktor",
      },
      {
        value: "php",
        label: "PHP",
        hint: "Laravel, Symfony, WordPress, Modern Web",
      },
      {
        value: "ruby",
        label: "Ruby",
        hint: "Ruby on Rails, Sinatra, Web APIs",
      },
      {
        value: "swift",
        label: "Swift",
        hint: "iOS, macOS, SwiftUI, Vapor",
      },
      {
        value: "cpp",
        label: "C++",
        hint: "Game engines, systems programming, high performance",
      },
      {
        value: "c",
        label: "C",
        hint: "Embedded systems, low-level OS/kernels",
      },
      {
        value: "elixir",
        label: "Elixir",
        hint: "Phoenix, fault-tolerant distributed systems (BEAM)",
      },
    ];
  }

  return [
    {
      value: "typescript",
      label: "TypeScript",
      hint: "Node.js, Web, React, Next.js, NestJS, Angular",
    },
    {
      value: "javascript",
      label: "JavaScript",
      hint: "Node.js, Web, React, Vue, Express, Vanilla",
    },
    {
      value: "python",
      label: "Python",
      hint: "FastAPI, Django, Flask, Data Science, IA/ML",
    },
    {
      value: "dart",
      label: "Dart",
      hint: "Flutter (Mobile, Web, Desktop multiplataforma), Dart CLI",
    },
    {
      value: "csharp",
      label: "C# / .NET",
      hint: "ASP.NET Core, Minimal APIs, Blazor, Clean Architecture",
    },
    {
      value: "go",
      label: "Go (Golang)",
      hint: "Microservicios, Gin, Fiber, APIs Cloud Native",
    },
    {
      value: "rust",
      label: "Rust",
      hint: "Axum, Actix, CLI, sistemas de alto rendimiento",
    },
    {
      value: "java",
      label: "Java",
      hint: "Spring Boot, Quarkus, Enterprise JVM",
    },
    {
      value: "kotlin",
      label: "Kotlin",
      hint: "Android Jetpack Compose, Spring Boot, Ktor",
    },
    {
      value: "php",
      label: "PHP",
      hint: "Laravel, Symfony, WordPress, Web moderna",
    },
    {
      value: "ruby",
      label: "Ruby",
      hint: "Ruby on Rails, Sinatra, APIs Web",
    },
    {
      value: "swift",
      label: "Swift",
      hint: "iOS, macOS, SwiftUI, Vapor",
    },
    {
      value: "cpp",
      label: "C++",
      hint: "Motores gráficos, sistemas, alto rendimiento",
    },
    {
      value: "c",
      label: "C",
      hint: "Sistemas embebidos, bajo nivel, kernels",
    },
    {
      value: "elixir",
      label: "Elixir",
      hint: "Phoenix, sistemas distribuidos tolerantes a fallos",
    },
  ];
}

export function getFrameworkOptions(
  language: SupportedLanguageId,
  lang: SupportedLanguage = "es",
): FrameworkOption[] {
  const isEn = lang === "en";

  switch (language) {
    case "typescript":
      return [
        {
          value: "none",
          label: isEn ? "Core / Vanilla TypeScript" : "Core / TypeScript puro",
          hint: isEn
            ? "Node.js or TypeScript without external web framework"
            : "Node.js o scripts TypeScript sin framework web específico",
        },
        {
          value: "react",
          label: "React / Vite",
          hint: isEn
            ? "Modern SPA (Single Page Application) with React"
            : "Single Page Application (SPA) moderna con React",
        },
        {
          value: "next",
          label: "Next.js",
          hint: isEn
            ? "Fullstack React framework with SSR and App Router"
            : "Framework fullstack React con SSR, SSG y App Router",
        },
        {
          value: "nest",
          label: "NestJS",
          hint: isEn
            ? "Modular enterprise backend with dependency injection"
            : "Backend empresarial modular y escalable con inyección de dependencias",
        },
        {
          value: "angular",
          label: "Angular",
          hint: isEn
            ? "Enterprise frontend with standalone components and signals"
            : "Frontend corporativo con componentes standalone y signals",
        },
        {
          value: "vue",
          label: "Vue / Nuxt",
          hint: isEn
            ? "Progressive reactive frontend framework"
            : "Ecosistema reactivo progresivo (Vue / Nuxt)",
        },
        {
          value: "express",
          label: "Express / Fastify",
          hint: isEn
            ? "Lightweight HTTP REST APIs and microservices"
            : "Microframeworks HTTP rápidos para APIs REST",
        },
      ];

    case "javascript":
      return [
        {
          value: "none",
          label: isEn ? "Core / Vanilla JavaScript" : "Core / JavaScript puro",
          hint: isEn
            ? "Node.js or JavaScript scripts without web framework"
            : "Node.js o scripts sin framework específico",
        },
        {
          value: "react",
          label: "React",
          hint: isEn ? "Interactive SPA with JavaScript" : "SPA interactiva con JavaScript",
        },
        {
          value: "vue",
          label: "Vue",
          hint: isEn ? "Progressive UI framework" : "Framework UI progresivo",
        },
        {
          value: "express",
          label: "Express",
          hint: isEn ? "Lightweight web server for Node.js" : "Servidor web ligero para Node.js",
        },
      ];

    case "python":
      return [
        {
          value: "fastapi",
          label: "FastAPI",
          hint: isEn
            ? "High-performance async REST APIs with automatic OpenAPI docs"
            : "APIs REST modernas, asíncronas con tipado y documentación automática OpenAPI",
        },
        {
          value: "django",
          label: "Django",
          hint: isEn
            ? "Fullstack web framework with ORM, auth, and admin"
            : "Framework web fullstack con ORM, autenticación y panel de administración",
        },
        {
          value: "flask",
          label: "Flask",
          hint: isEn
            ? "Lightweight and extensible Python microframework"
            : "Microframework web simple, flexible y extensible",
        },
        {
          value: "none",
          label: isEn ? "Python Core / CLI / Data" : "Python Core / CLI / Datos",
          hint: isEn
            ? "Scripts, data processing, machine learning or CLI utilities"
            : "Scripts, data science, librerías o herramientas de terminal",
        },
      ];

    case "dart":
      return [
        {
          value: "flutter",
          label: "Flutter",
          hint: isEn
            ? "Cross-platform apps for Mobile (iOS/Android), Web and Desktop"
            : "Desarrollo multiplataforma para Mobile, Web y Escritorio",
        },
        {
          value: "none",
          label: isEn ? "Dart Core / CLI" : "Dart Core / CLI",
          hint: isEn
            ? "Console apps, server-side Dart or shared packages"
            : "Aplicaciones de consola o paquetes Dart sin Flutter",
        },
      ];

    case "csharp":
      return [
        {
          value: "aspnet",
          label: "ASP.NET Core / Web API",
          hint: isEn
            ? "REST APIs, Minimal APIs and cloud microservices"
            : "APIs REST, Minimal APIs y microservicios en la nube",
        },
        {
          value: "blazor",
          label: "Blazor",
          hint: isEn
            ? "Interactive web UIs built with C# and WebAssembly"
            : "Aplicaciones web interactivas con C# y WebAssembly",
        },
        {
          value: "none",
          label: isEn ? ".NET Solution / Console" : "Solución .NET / Consola",
          hint: isEn
            ? "Clean class libraries, background workers or console apps"
            : "Librerías de clases limpias, workers o apps de consola",
        },
      ];

    case "go":
      return [
        {
          value: "none",
          label: isEn ? "Standard Library (net/http)" : "Librería estándar (net/http)",
          hint: isEn
            ? "Native Go HTTP server without external dependencies"
            : "Servidor HTTP nativo de Go sin dependencias externas",
        },
        {
          value: "gin",
          label: "Gin",
          hint: isEn
            ? "High-performance HTTP web framework"
            : "Framework HTTP rápido y popular para microservicios",
        },
        {
          value: "fiber",
          label: "Fiber",
          hint: isEn
            ? "Express-inspired web framework built on Fasthttp"
            : "Framework web inspirado en Express optimizado sobre Fasthttp",
        },
        {
          value: "echo",
          label: "Echo",
          hint: isEn
            ? "High performance, extensible, minimalist Go web framework"
            : "Framework web REST minimalista y de alto rendimiento",
        },
      ];

    case "rust":
      return [
        {
          value: "none",
          label: isEn ? "Rust Core / Cargo CLI" : "Rust Core / Cargo CLI",
          hint: isEn
            ? "Standard binary or library crate without web framework"
            : "Binario o biblioteca Cargo estándar sin framework web",
        },
        {
          value: "axum",
          label: "Axum",
          hint: isEn
            ? "Ergonomic and modular web application framework in Tokio"
            : "Framework web ergonómico y modular del ecosistema Tokio",
        },
        {
          value: "actix",
          label: "Actix Web",
          hint: isEn
            ? "Extremely fast, powerful and concurrent web framework"
            : "Framework web de ultra alto rendimiento y concurrencia",
        },
      ];

    case "java":
      return [
        {
          value: "spring",
          label: "Spring Boot",
          hint: isEn
            ? "Industry standard enterprise framework for microservices"
            : "Estándar corporativo para microservicios y APIs robustas",
        },
        {
          value: "quarkus",
          label: "Quarkus",
          hint: isEn
            ? "Supersonic subatomic Java framework tailored for GraalVM"
            : "Java supersónico y subatómico optimizado para Kubernetes",
        },
        {
          value: "none",
          label: isEn ? "Java Core (Maven / Gradle)" : "Java Core (Maven / Gradle)",
          hint: isEn
            ? "Standard Java application or library"
            : "Aplicación o biblioteca estándar de Java",
        },
      ];

    case "kotlin":
      return [
        {
          value: "spring",
          label: "Spring Boot (Kotlin)",
          hint: isEn
            ? "Enterprise backend with coroutines and Spring Boot"
            : "Backend empresarial con corrutinas y Spring Boot",
        },
        {
          value: "android",
          label: "Android (Jetpack Compose)",
          hint: isEn
            ? "Modern native Android mobile development"
            : "Desarrollo móvil nativo moderno con Jetpack Compose",
        },
        {
          value: "none",
          label: isEn ? "Kotlin Core / CLI" : "Kotlin Core / CLI",
          hint: isEn
            ? "Standard Kotlin application or multiplatform module"
            : "Aplicación de consola o módulo estándar en Kotlin",
        },
      ];

    case "php":
      return [
        {
          value: "laravel",
          label: "Laravel",
          hint: isEn
            ? "Elegant and expressive web framework with Eloquent ORM"
            : "Framework web elegante y expresivo con Eloquent ORM",
        },
        {
          value: "symfony",
          label: "Symfony",
          hint: isEn
            ? "Decoupled enterprise PHP components and framework"
            : "Componentes y arquitectura desacoplada empresarial",
        },
        {
          value: "none",
          label: isEn ? "PHP Core" : "PHP Core",
          hint: isEn ? "Vanilla PHP or custom structure" : "PHP nativo o estructura propia",
        },
      ];

    case "ruby":
      return [
        {
          value: "rails",
          label: "Ruby on Rails",
          hint: isEn
            ? "Convention-over-configuration web framework"
            : "Framework web fullstack con convención sobre configuración",
        },
        {
          value: "sinatra",
          label: "Sinatra",
          hint: isEn
            ? "Lightweight DSL for quickly creating web applications"
            : "DSL ligero para crear APIs y aplicaciones web rápidamente",
        },
        {
          value: "none",
          label: isEn ? "Ruby Core / Gem" : "Ruby Core / Gema",
          hint: isEn ? "Standard Ruby scripts or gem development" : "Scripts o desarrollo de gemas",
        },
      ];

    case "swift":
      return [
        {
          value: "swiftui",
          label: "SwiftUI / iOS",
          hint: isEn
            ? "Native Apple UI framework for iOS, macOS, watchOS"
            : "Framework UI nativo de Apple para iOS, macOS y watchOS",
        },
        {
          value: "vapor",
          label: "Vapor",
          hint: isEn
            ? "Server-side Swift web and API framework"
            : "Framework web y de microservicios backend en Swift",
        },
        {
          value: "none",
          label: isEn ? "Swift Core / CLI" : "Swift Core / CLI",
          hint: isEn
            ? "Command-line utilities or Swift packages"
            : "Herramientas de línea de comandos o paquetes Swift",
        },
      ];

    case "elixir":
      return [
        {
          value: "phoenix",
          label: "Phoenix Framework",
          hint: isEn
            ? "High-performance real-time web framework with LiveView"
            : "Framework web de alto rendimiento y tiempo real con LiveView",
        },
        {
          value: "none",
          label: isEn ? "Elixir / OTP Core" : "Elixir / OTP Core",
          hint: isEn
            ? "Standard Mix project / OTP application"
            : "Aplicación Mix / OTP concurrente estándar",
        },
      ];

    default:
      return [];
  }
}
