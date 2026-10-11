import type { StackDetection } from "../../detect/types.js";

export interface ArchitectureOption {
  value: string;
  label: string;
  description: string;
}

export function getRecommendedArchitectures(stack?: StackDetection): {
  recommended: string;
  options: ArchitectureOption[];
} {
  const commonOptions: ArchitectureOption[] = [
    {
      value: "clean",
      label: "Clean Architecture",
      description:
        "Separation of concerns in Domain, Use Cases, Repositories, Presentation (Ej: src/domain, src/usecases, src/presentation)",
    },
    {
      value: "hexagonal",
      label: "Hexagonal / Ports & Adapters",
      description:
        "Core domain decoupled from external frameworks via ports (Ej: src/domain, src/ports, src/adapters)",
    },
    {
      value: "modular",
      label: "Modular / Feature-Based",
      description:
        "Encapsulation by cohesive business modules (Ej: src/modules/auth, src/modules/billing)",
    },
    {
      value: "layered",
      label: "Layered (N-Capas)",
      description:
        "Traditional presentation, application, domain, infrastructure layers (Ej: src/controllers, src/services, src/repositories)",
    },
    {
      value: "vertical-slice",
      label: "Vertical Slices",
      description:
        "Self-contained feature slices instead of technical layers (Ej: src/features/checkout, src/features/login)",
    },
  ];

  if (!stack) {
    return { recommended: "clean", options: commonOptions };
  }

  if (stack.language === "dart" || stack.frameworks.includes("flutter")) {
    return {
      recommended: "clean",
      options: [
        {
          value: "clean",
          label: "Clean Architecture (Flutter + BLoC/Riverpod)",
          description:
            "Data, Domain, Presentation with state management separation (Ej: lib/data, lib/domain, lib/presentation)",
        },
        ...commonOptions.filter((o) => o.value !== "clean"),
      ],
    };
  }

  if (stack.frameworks.includes("nest") || stack.frameworks.includes("nestjs")) {
    return {
      recommended: "modular",
      options: [
        {
          value: "modular",
          label: "Modular Architecture (NestJS Modules)",
          description:
            "Feature modules with controllers, services, and DI (Ej: src/users/users.module.ts, src/auth/auth.service.ts)",
        },
        ...commonOptions.filter((o) => o.value !== "modular"),
      ],
    };
  }

  if (stack.frameworks.includes("angular")) {
    return {
      recommended: "modular",
      options: [
        {
          value: "modular",
          label: "Feature-Based Architecture (Angular Standalone)",
          description:
            "Feature-sliced routes, smart/dumb components, and signals/stores (Ej: src/app/features/dashboard, src/app/shared)",
        },
        ...commonOptions.filter((o) => o.value !== "modular"),
      ],
    };
  }

  if (
    stack.frameworks.includes("react") ||
    stack.frameworks.includes("next") ||
    stack.frameworks.includes("nextjs") ||
    stack.frameworks.includes("vue")
  ) {
    return {
      recommended: "modular",
      options: [
        {
          value: "modular",
          label: "Feature-Based Architecture (Frontend Components / Modules)",
          description:
            "Feature-sliced structure with components, hooks, stores and pages (Ej: src/features/auth, src/components, src/pages)",
        },
        ...commonOptions.filter((o) => o.value !== "modular"),
      ],
    };
  }

  if (stack.language === "csharp") {
    return {
      recommended: "clean",
      options: [
        {
          value: "clean",
          label: "Clean Architecture (.NET Solution)",
          description:
            "Domain, Application (CQRS/MediatR), Infrastructure, API projects (Ej: src/Domain, src/Application, src/Infrastructure, src/Api)",
        },
        {
          value: "vertical-slice",
          label: "Vertical Slices (.NET Minimal APIs)",
          description:
            "Feature-driven endpoints and request handlers (Ej: Features/Orders/CreateOrder.cs)",
        },
        ...commonOptions.filter((o) => o.value !== "clean" && o.value !== "vertical-slice"),
      ],
    };
  }

  return { recommended: "clean", options: commonOptions };
}
