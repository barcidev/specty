import { describe, expect, it } from "vitest";
import { resolveDefaultSourcePaths } from "../../../src/detect/source-paths-resolver.js";
import type { RepositoryDetectionResult } from "../../../src/detect/types.js";

describe("source paths resolver by stack (A6)", () => {
  it("resolves Flutter / Dart source paths correctly", () => {
    const detection: RepositoryDetectionResult = {
      layout: "single",
      primaryLanguage: "dart",
      scopes: [
        {
          path: ".",
          stack: {
            language: "dart",
            frameworks: ["flutter"],
            confidence: 0.9,
            evidence: ["pubspec.yaml"],
            hasCustomTemplates: true,
          },
          verify: { test: "flutter test" },
        },
      ],
    };

    const paths = resolveDefaultSourcePaths(detection);
    expect(paths).toContain("lib/**");
    expect(paths).toContain("bin/**");
    expect(paths).toContain("test/**");
  });

  it("resolves Go source paths correctly", () => {
    const detection: RepositoryDetectionResult = {
      layout: "single",
      primaryLanguage: "go",
      scopes: [
        {
          path: ".",
          stack: {
            language: "go",
            frameworks: ["gin"],
            confidence: 0.9,
            evidence: ["go.mod"],
            hasCustomTemplates: false,
          },
          verify: { test: "go test ./..." },
        },
      ],
    };

    const paths = resolveDefaultSourcePaths(detection);
    expect(paths).toContain("**/*.go");
    expect(paths).toContain("cmd/**");
    expect(paths).toContain("pkg/**");
  });

  it("resolves Ruby on Rails source paths correctly", () => {
    const detection: RepositoryDetectionResult = {
      layout: "single",
      primaryLanguage: "ruby",
      scopes: [
        {
          path: ".",
          stack: {
            language: "ruby",
            frameworks: ["rails"],
            confidence: 0.9,
            evidence: ["Gemfile"],
            hasCustomTemplates: false,
          },
          verify: { test: "bundle exec rspec" },
        },
      ],
    };

    const paths = resolveDefaultSourcePaths(detection);
    expect(paths).toContain("app/**");
    expect(paths).toContain("lib/**");
    expect(paths).toContain("config/**");
  });

  it("resolves multi-package scopes in monorepo layout", () => {
    const detection: RepositoryDetectionResult = {
      layout: "monorepo",
      scopes: [
        {
          path: "apps/web",
          stack: {
            language: "typescript",
            frameworks: ["next"],
            confidence: 0.9,
            evidence: ["package.json"],
            hasCustomTemplates: true,
          },
          verify: {},
        },
        {
          path: "services/api",
          stack: {
            language: "go",
            frameworks: [],
            confidence: 0.9,
            evidence: ["go.mod"],
            hasCustomTemplates: false,
          },
          verify: {},
        },
      ],
    };

    const paths = resolveDefaultSourcePaths(detection);
    expect(paths).toContain("apps/web/**");
    expect(paths).toContain("services/api/**");
  });

  it("defaults to src/** when no detection is provided", () => {
    const paths = resolveDefaultSourcePaths(null);
    expect(paths).toEqual(["src/**"]);
  });
});
