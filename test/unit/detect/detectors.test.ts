import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DartDetector,
  DotNetDetector,
  GoDetector,
  JavaKotlinDetector,
  JavaScriptDetector,
  PhpDetector,
  PythonDetector,
  RubyDetector,
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
});
