import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CCppDetector,
  DartDetector,
  DotNetDetector,
  ElixirDetector,
  GoDetector,
  JavaKotlinDetector,
  JavaScriptDetector,
  PhpDetector,
  PythonDetector,
  RubyDetector,
  RustDetector,
  SwiftDetector,
} from "../../../src/detect/index.js";

describe("detect/detectors", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-detect-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("detects Angular web project", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { "@angular/core": "^19.0.0" } }),
    );
    await fs.writeFile(path.join(tempDir, "angular.json"), "{}");
    await fs.writeFile(path.join(tempDir, "tsconfig.json"), "{}");

    const detector = new JavaScriptDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.language).toBe("typescript");
    expect(result?.frameworks).toContain("angular");
    expect(result?.hasCustomTemplates).toBe(true);
  });

  it("detects Next.js with React", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { next: "^15.0.0", react: "^19.0.0" } }),
    );

    const detector = new JavaScriptDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("javascript");
    expect(result?.frameworks).toContain("next");
  });

  it("detects NestJS with Prisma", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { "@nestjs/core": "^10.0.0", "@prisma/client": "^5.0.0" },
        devDependencies: { typescript: "^5.0.0" },
      }),
    );
    await fs.writeFile(path.join(tempDir, "nest-cli.json"), "{}");

    const detector = new JavaScriptDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("typescript");
    expect(result?.frameworks).toContain("nest");
    expect(result?.frameworks).toContain("prisma");
  });

  it("detects Dart / Flutter", async () => {
    await fs.writeFile(
      path.join(tempDir, "pubspec.yaml"),
      "name: flutter_app\ndependencies:\n  flutter:\n    sdk: flutter\n",
    );

    const detector = new DartDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("dart");
    expect(result?.frameworks).toContain("flutter");
    expect(result?.hasCustomTemplates).toBe(true);
  });

  it("detects .NET ASP.NET Core and Blazor", async () => {
    await fs.writeFile(
      path.join(tempDir, "app.csproj"),
      '<Project Sdk="Microsoft.NET.Sdk.Web">\n<ItemGroup>\n<PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly" />\n</ItemGroup>\n</Project>',
    );

    const detector = new DotNetDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("csharp");
    expect(result?.frameworks).toContain("aspnet-core");
    expect(result?.frameworks).toContain("blazor");
    expect(result?.hasCustomTemplates).toBe(true);
  });

  it("detects Java Spring Boot with pom.xml", async () => {
    await fs.writeFile(
      path.join(tempDir, "pom.xml"),
      "<project><dependencies><dependency><groupId>org.springframework.boot</groupId></dependency></dependencies></project>",
    );

    const detector = new JavaKotlinDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("java");
    expect(result?.frameworks).toContain("spring-boot");
    expect(result?.hasCustomTemplates).toBe(false);
  });

  it("detects Kotlin Ktor with build.gradle.kts", async () => {
    await fs.writeFile(
      path.join(tempDir, "build.gradle.kts"),
      'dependencies { implementation("io.ktor:ktor-server-core") }',
    );

    const detector = new JavaKotlinDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("kotlin");
    expect(result?.frameworks).toContain("ktor");
  });

  it("detects Python Django and FastAPI", async () => {
    await fs.writeFile(path.join(tempDir, "manage.py"), "# django");
    await fs.writeFile(path.join(tempDir, "requirements.txt"), "django>=4.0\nfastapi>=0.100\n");

    const detector = new PythonDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("python");
    expect(result?.frameworks).toContain("django");
    expect(result?.frameworks).toContain("fastapi");
  });

  it("detects Go Gin via go.mod", async () => {
    await fs.writeFile(
      path.join(tempDir, "go.mod"),
      "module mygo\nrequire github.com/gin-gonic/gin v1.9.0\n",
    );

    const detector = new GoDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("go");
    expect(result?.frameworks).toContain("gin");
  });

  it("detects Ruby Rails via Gemfile and config", async () => {
    await fs.writeFile(path.join(tempDir, "Gemfile"), "gem 'rails', '~> 7.0'\n");
    await fs.mkdir(path.join(tempDir, "config"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "config", "application.rb"), "module App; end\n");

    const detector = new RubyDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("ruby");
    expect(result?.frameworks).toContain("rails");
  });

  it("detects PHP Laravel via composer.json and artisan", async () => {
    await fs.writeFile(
      path.join(tempDir, "composer.json"),
      JSON.stringify({ require: { "laravel/framework": "^10.0" } }),
    );
    await fs.writeFile(path.join(tempDir, "artisan"), "#!/usr/bin/env php\n");

    const detector = new PhpDetector();
    const result = await detector.detect(tempDir);

    expect(result?.language).toBe("php");
    expect(result?.frameworks).toContain("laravel");
  });

  it("detects Rust with Cargo.toml and actix-web", async () => {
    await fs.writeFile(
      path.join(tempDir, "Cargo.toml"),
      '[package]\nname = "rust-app"\nversion = "0.1.0"\n\n[dependencies]\nactix-web = "4"\naxum = "0.7"\n',
    );
    await fs.writeFile(path.join(tempDir, "Cargo.lock"), "# lockfile\n");

    const detector = new RustDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.language).toBe("rust");
    expect(result?.frameworks).toContain("actix-web");
    expect(result?.frameworks).toContain("axum");
    expect(result?.evidence).toContain("Cargo.toml");
    expect(result?.evidence).toContain("Cargo.lock");
  });

  it("detects Swift with Package.swift and vapor", async () => {
    await fs.writeFile(
      path.join(tempDir, "Package.swift"),
      '// swift-tools-version: 5.9\nimport PackageDescription\nlet package = Package(name: "VaporApp", dependencies: [.package(url: "https://github.com/vapor/vapor.git", from: "4.0.0")])\n',
    );
    await fs.mkdir(path.join(tempDir, "VaporApp.xcodeproj"), { recursive: true });

    const detector = new SwiftDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.language).toBe("swift");
    expect(result?.frameworks).toContain("vapor");
    expect(result?.evidence).toContain("Package.swift");
    expect(result?.evidence).toContain("*.xcodeproj");
  });

  it("detects C++ with CMakeLists.txt and .cpp files", async () => {
    await fs.writeFile(
      path.join(tempDir, "CMakeLists.txt"),
      "cmake_minimum_required(VERSION 3.20)\nproject(MyCppApp LANGUAGES CXX)\n",
    );
    await fs.writeFile(
      path.join(tempDir, "main.cpp"),
      "#include <iostream>\nint main() { return 0; }\n",
    );

    const detector = new CCppDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.language).toBe("cpp");
    expect(result?.frameworks).toContain("cmake");
    expect(result?.evidence).toContain("CMakeLists.txt");
    expect(result?.evidence).toContain("*.cpp");
  });

  it("detects C with Makefile and .c files", async () => {
    await fs.writeFile(path.join(tempDir, "Makefile"), "all:\n\tgcc main.c -o app\n");
    await fs.writeFile(
      path.join(tempDir, "main.c"),
      "#include <stdio.h>\nint main() { return 0; }\n",
    );

    const detector = new CCppDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.language).toBe("c");
    expect(result?.frameworks).toContain("make");
    expect(result?.evidence).toContain("Makefile");
  });

  it("detects Elixir with mix.exs and phoenix", async () => {
    await fs.writeFile(
      path.join(tempDir, "mix.exs"),
      'defmodule MyApp.MixProject do\n  def project do\n    [deps: [{:phoenix, "~> 1.7"}]]\n  end\nend\n',
    );
    await fs.writeFile(path.join(tempDir, "mix.lock"), "%{}\n");

    const detector = new ElixirDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.language).toBe("elixir");
    expect(result?.frameworks).toContain("phoenix");
    expect(result?.evidence).toContain("mix.exs");
    expect(result?.evidence).toContain("mix.lock");
  });

  it("detects React Native / Expo in JS detector", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { expo: "~51.0.0", "react-native": "0.74.0" } }),
    );
    await fs.writeFile(
      path.join(tempDir, "app.json"),
      JSON.stringify({ expo: { name: "my-expo-app" } }),
    );

    const detector = new JavaScriptDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.frameworks).toContain("expo");
    expect(result?.frameworks).toContain("react-native");
    expect(result?.evidence).toContain("app.json");
  });

  it("detects SvelteKit in JS detector", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ devDependencies: { "@sveltejs/kit": "^2.0.0", svelte: "^5.0.0" } }),
    );
    await fs.writeFile(path.join(tempDir, "svelte.config.js"), "export default {};\n");

    const detector = new JavaScriptDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.frameworks).toContain("sveltekit");
    expect(result?.evidence).toContain("svelte.config.js");
  });

  it("detects Astro and Hono in JS detector", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { astro: "^4.0.0", hono: "^4.0.0" } }),
    );
    await fs.writeFile(path.join(tempDir, "astro.config.mjs"), "export default {};\n");

    const detector = new JavaScriptDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.frameworks).toContain("astro");
    expect(result?.frameworks).toContain("hono");
    expect(result?.evidence).toContain("astro.config.mjs");
  });

  it("detects Kotlin Multiplatform (KMP)", async () => {
    await fs.writeFile(
      path.join(tempDir, "build.gradle.kts"),
      'plugins { kotlin("multiplatform") version "2.0.0" }\n',
    );
    await fs.mkdir(path.join(tempDir, "src", "commonMain"), { recursive: true });

    const detector = new JavaKotlinDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.language).toBe("kotlin");
    expect(result?.frameworks).toContain("kmp");
  });

  it("detects Python modern package managers: uv, poetry, pdm", async () => {
    await fs.writeFile(
      path.join(tempDir, "pyproject.toml"),
      "[tool.uv]\n[project]\nname = 'test'\n",
    );
    await fs.writeFile(path.join(tempDir, "uv.lock"), "version = 1\n");

    const detector = new PythonDetector();
    const result = await detector.detect(tempDir);

    expect(result).not.toBeNull();
    expect(result?.language).toBe("python");
    expect(result?.frameworks).toContain("uv");
    expect(result?.evidence).toContain("uv.lock");
  });
});
