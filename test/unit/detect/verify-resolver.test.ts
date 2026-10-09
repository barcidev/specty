import { describe, expect, it } from "vitest";
import {
  getDefaultVerificationCommands,
  resolveVerificationCommands,
} from "../../../src/detect/verify-resolver.js";

describe("detect/verify-resolver", () => {
  it("resolves default commands for Angular", () => {
    const cmds = getDefaultVerificationCommands({
      language: "typescript",
      frameworks: ["angular"],
      confidence: 1.0,
      evidence: ["angular.json"],
      hasCustomTemplates: true,
    });

    expect(cmds.lint).toBe("npm run lint");
    expect(cmds.test).toContain("ng test");
    expect(cmds.build).toBe("npm run build");
  });

  it("resolves default commands for Flutter", () => {
    const cmds = getDefaultVerificationCommands({
      language: "dart",
      frameworks: ["flutter"],
      confidence: 1.0,
      evidence: ["pubspec.yaml"],
      hasCustomTemplates: true,
    });

    expect(cmds.format).toContain("dart format");
    expect(cmds.lint).toBe("flutter analyze");
    expect(cmds.test).toBe("flutter test");
  });

  it("resolves default commands for .NET", () => {
    const cmds = getDefaultVerificationCommands({
      language: "csharp",
      frameworks: ["aspnet-core"],
      confidence: 1.0,
      evidence: ["api.csproj"],
      hasCustomTemplates: true,
    });

    expect(cmds.build).toBe("dotnet build");
    expect(cmds.test).toBe("dotnet test");
    expect(cmds.format).toContain("dotnet format");
  });

  it("applies config overrides over defaults", async () => {
    const stack = {
      language: "typescript" as const,
      frameworks: ["angular"],
      confidence: 1.0,
      evidence: [],
      hasCustomTemplates: true,
    };

    const resolved = await resolveVerificationCommands(".", stack, {
      test: "custom-test-command",
    });

    expect(resolved.test).toBe("custom-test-command");
    expect(resolved.lint).toBe("npm run lint");
  });
});
