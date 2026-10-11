import { describe, expect, it } from "vitest";
import {
  getMonorepoToolOptions,
  getStructureOptions,
  getWorkspaceComponentOptions,
} from "../../../src/cli/commands/structure-options.js";

describe("cli/commands/structure-options", () => {
  it("provides structure options for monolith, monorepo, and workspace in es and en", () => {
    const esStructures = getStructureOptions("es");
    const enStructures = getStructureOptions("en");

    expect(esStructures.map((s) => s.value)).toEqual(["single", "monorepo", "workspace"]);
    expect(enStructures.map((s) => s.value)).toEqual(["single", "monorepo", "workspace"]);

    const esMono = esStructures.find((s) => s.value === "single");
    expect(esMono?.label).toContain("Monolito");

    const enMono = enStructures.find((s) => s.value === "single");
    expect(enMono?.label).toContain("Monolith");

    const esWorkspace = esStructures.find((s) => s.value === "workspace");
    expect(esWorkspace?.hint).toContain("híbrido");

    const enWorkspace = enStructures.find((s) => s.value === "workspace");
    expect(enWorkspace?.hint).toContain("Hybrid");
  });

  it("provides available monorepo tools with defaults", () => {
    const monorepos = getMonorepoToolOptions("es");
    const values = monorepos.map((m) => m.value);

    expect(values).toEqual([
      "turbo",
      "nx",
      "pnpm",
      "npm",
      "yarn",
      "lerna",
      "melos",
      "dotnet-sln",
      "cargo",
    ]);

    const melos = monorepos.find((m) => m.value === "melos");
    expect(melos?.defaultLanguage).toBe("dart");
    expect(melos?.defaultFrameworks).toContain("flutter");

    const dotnet = monorepos.find((m) => m.value === "dotnet-sln");
    expect(dotnet?.defaultLanguage).toBe("csharp");
    expect(dotnet?.defaultFrameworks).toContain("aspnet");

    const cargo = monorepos.find((m) => m.value === "cargo");
    expect(cargo?.defaultLanguage).toBe("rust");
    expect(cargo?.scopes.length).toBeGreaterThanOrEqual(2);
  });

  it("provides multi-component workspace options", () => {
    const components = getWorkspaceComponentOptions("es");
    expect(components.length).toBeGreaterThanOrEqual(10);

    const reactComp = components.find((c) => c.value === "web-react");
    expect(reactComp?.path).toBe("apps/web");
    expect(reactComp?.language).toBe("typescript");
    expect(reactComp?.frameworks).toContain("react");

    const pyComp = components.find((c) => c.value === "api-fastapi");
    expect(pyComp?.path).toBe("services/ai-service");
    expect(pyComp?.language).toBe("python");
    expect(pyComp?.frameworks).toContain("fastapi");

    const cargoComp = components.find((c) => c.value === "cargo-monorepo");
    expect(cargoComp?.isMonorepo).toBe(true);
    expect(cargoComp?.monorepoKind).toBe("cargo");
  });
});
