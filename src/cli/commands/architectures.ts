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
      description: "Separation of concerns in Domain, Use Cases, Repositories, Presentation",
    },
    {
      value: "hexagonal",
      label: "Hexagonal / Ports & Adapters",
      description: "Core domain decoupled from external frameworks via input/output ports",
    },
    {
      value: "modular",
      label: "Modular / Feature-Based",
      description: "Encapsulation by business capabilities and cohesive modules",
    },
    {
      value: "layered",
      label: "Layered (N-Capas)",
      description: "Traditional presentation, application, domain, infrastructure layers",
    },
    {
      value: "vertical-slice",
      label: "Vertical Slices",
      description: "Self-contained feature slices instead of horizontal technical layers",
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
          description: "Data, Domain, Presentation layers with state management separation",
        },
        ...commonOptions.filter((o) => o.value !== "clean"),
      ],
    };
  }

  if (stack.frameworks.includes("nest")) {
    return {
      recommended: "modular",
      options: [
        {
          value: "modular",
          label: "Modular Architecture (NestJS Modules)",
          description: "Feature modules with controllers, services, and dependency injection",
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
          description: "Feature-sliced routes, smart/dumb components, and signals/stores",
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
          description: "Domain, Application (CQRS/MediatR), Infrastructure, API projects",
        },
        {
          value: "vertical-slice",
          label: "Vertical Slices (.NET Minimal APIs)",
          description: "Feature-driven endpoints and request handlers",
        },
        ...commonOptions.filter((o) => o.value !== "clean" && o.value !== "vertical-slice"),
      ],
    };
  }

  return { recommended: "clean", options: commonOptions };
}
