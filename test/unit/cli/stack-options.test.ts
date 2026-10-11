import { describe, expect, it } from "vitest";
import {
  getFrameworkOptions,
  getLanguageOptions,
} from "../../../src/cli/commands/stack-options.js";

describe("cli/commands/stack-options", () => {
  it("provides complete language options for es and en", () => {
    const esLangs = getLanguageOptions("es");
    const enLangs = getLanguageOptions("en");

    expect(esLangs.length).toBeGreaterThanOrEqual(14);
    expect(enLangs.length).toBe(esLangs.length);

    const esTs = esLangs.find((l) => l.value === "typescript");
    const enTs = enLangs.find((l) => l.value === "typescript");
    expect(esTs).toBeDefined();
    expect(enTs).toBeDefined();
    expect(esTs?.label).toBe("TypeScript");
    expect(enTs?.label).toBe("TypeScript");

    const esPython = esLangs.find((l) => l.value === "python");
    expect(esPython?.hint).toContain("IA/ML");
    const enPython = enLangs.find((l) => l.value === "python");
    expect(enPython?.hint).toContain("AI/ML");
  });

  it("provides tailored frameworks per language", () => {
    const tsFws = getFrameworkOptions("typescript", "es");
    expect(tsFws.map((f) => f.value)).toEqual(
      expect.arrayContaining(["none", "react", "next", "nest", "angular", "vue", "express"]),
    );

    const pyFws = getFrameworkOptions("python", "es");
    expect(pyFws.map((f) => f.value)).toEqual(
      expect.arrayContaining(["fastapi", "django", "flask", "none"]),
    );

    const dartFws = getFrameworkOptions("dart", "es");
    expect(dartFws.map((f) => f.value)).toEqual(expect.arrayContaining(["flutter", "none"]));

    const csharpFws = getFrameworkOptions("csharp", "es");
    expect(csharpFws.map((f) => f.value)).toEqual(
      expect.arrayContaining(["aspnet", "blazor", "none"]),
    );

    const goFws = getFrameworkOptions("go", "en");
    expect(goFws.map((f) => f.value)).toEqual(
      expect.arrayContaining(["gin", "fiber", "echo", "none"]),
    );

    const rustFws = getFrameworkOptions("rust", "en");
    expect(rustFws.map((f) => f.value)).toEqual(expect.arrayContaining(["axum", "actix", "none"]));
  });

  it("returns empty array for languages without framework selector", () => {
    expect(getFrameworkOptions("c", "es")).toEqual([]);
    expect(getFrameworkOptions("cpp", "en")).toEqual([]);
  });
});
