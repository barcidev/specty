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

  it("resolves default commands for Rust", () => {
    const cmds = getDefaultVerificationCommands({
      language: "rust",
      frameworks: ["actix-web"],
      confidence: 1.0,
      evidence: ["Cargo.toml"],
      hasCustomTemplates: false,
    });

    expect(cmds.format).toBe("cargo fmt --check");
    expect(cmds.lint).toBe("cargo clippy -- -D warnings");
    expect(cmds.test).toBe("cargo test");
  });

  it("resolves default commands for Swift", () => {
    const cmds = getDefaultVerificationCommands({
      language: "swift",
      frameworks: ["vapor"],
      confidence: 1.0,
      evidence: ["Package.swift"],
      hasCustomTemplates: false,
    });

    expect(cmds.lint).toBe("swift-format lint -s");
    expect(cmds.test).toBe("swift test");
  });

  it("resolves default commands for C / C++", () => {
    const cmds = getDefaultVerificationCommands({
      language: "cpp",
      frameworks: ["cmake"],
      confidence: 1.0,
      evidence: ["CMakeLists.txt"],
      hasCustomTemplates: false,
    });

    expect(cmds.build).toBe("cmake --build build");
    expect(cmds.test).toBe("ctest --test-dir build");
    expect(cmds.format).toBe("clang-format --dry-run");
  });

  it("resolves default commands for Elixir", () => {
    const cmds = getDefaultVerificationCommands({
      language: "elixir",
      frameworks: ["phoenix"],
      confidence: 1.0,
      evidence: ["mix.exs"],
      hasCustomTemplates: false,
    });

    expect(cmds.format).toBe("mix format --check-formatted");
    expect(cmds.test).toBe("mix test");
    expect(cmds.lint).toBe("mix credo");
  });

  it("resolves default commands for Expo, Svelte and Astro", () => {
    const expoCmds = getDefaultVerificationCommands({
      language: "typescript",
      frameworks: ["expo", "react-native"],
      confidence: 1.0,
      evidence: ["app.json"],
      hasCustomTemplates: true,
    });
    expect(expoCmds.lint).toBe("npx expo-doctor");

    const svelteCmds = getDefaultVerificationCommands({
      language: "typescript",
      frameworks: ["sveltekit"],
      confidence: 1.0,
      evidence: ["svelte.config.js"],
      hasCustomTemplates: true,
    });
    expect(svelteCmds.lint).toBe("npx svelte-check");

    const astroCmds = getDefaultVerificationCommands({
      language: "typescript",
      frameworks: ["astro"],
      confidence: 1.0,
      evidence: ["astro.config.mjs"],
      hasCustomTemplates: true,
    });
    expect(astroCmds.lint).toBe("npx astro check");
  });

  it("resolves default commands for Python with uv and poetry", () => {
    const uvCmds = getDefaultVerificationCommands({
      language: "python",
      frameworks: ["uv", "fastapi"],
      confidence: 1.0,
      evidence: ["uv.lock"],
      hasCustomTemplates: false,
    });
    expect(uvCmds.lint).toBe("uv run ruff check");
    expect(uvCmds.test).toBe("uv run pytest");

    const poetryCmds = getDefaultVerificationCommands({
      language: "python",
      frameworks: ["poetry", "django"],
      confidence: 1.0,
      evidence: ["poetry.lock"],
      hasCustomTemplates: false,
    });
    expect(poetryCmds.lint).toBe("poetry run ruff check");
    expect(poetryCmds.test).toBe("poetry run python manage.py test");
  });
});
