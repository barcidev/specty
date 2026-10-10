import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../test/fixtures");

const fixtures = [
  {
    name: "angular-app",
    files: {
      "package.json": JSON.stringify(
        {
          name: "fixture-angular-app",
          version: "1.0.0",
          dependencies: {
            "@angular/core": "^19.0.0",
            "@angular/common": "^19.0.0",
            rxjs: "^7.8.0",
          },
          devDependencies: {
            typescript: "^5.6.0",
          },
          scripts: {
            build: "echo 'building angular'",
            test: "echo 'testing angular'",
          },
        },
        null,
        2,
      ),
      "angular.json": JSON.stringify(
        {
          $schema: "./node_modules/@angular/cli/lib/config/schema.json",
          version: 1,
          newProjectRoot: "projects",
          projects: {
            "fixture-angular-app": {
              projectType: "application",
              root: "",
              sourceRoot: "src",
            },
          },
        },
        null,
        2,
      ),
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "preserve",
          },
        },
        null,
        2,
      ),
      "src/app/app.component.ts":
        "export class AppComponent {\n  title = 'fixture-angular-app';\n}\n",
    },
  },
  {
    name: "react-vite",
    files: {
      "package.json": JSON.stringify(
        {
          name: "fixture-react-vite",
          version: "1.0.0",
          dependencies: {
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
          devDependencies: {
            vite: "^6.0.0",
            typescript: "^5.6.0",
          },
          scripts: {
            build: "vite build",
            test: "echo 'testing react'",
          },
        },
        null,
        2,
      ),
      "vite.config.ts": "export default {\n  plugins: [],\n};\n",
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
          },
        },
        null,
        2,
      ),
      "src/App.tsx":
        "export function App() {\n  return <h1>Hello React</h1>;\n}\n",
    },
  },
  {
    name: "nextjs-app",
    files: {
      "package.json": JSON.stringify(
        {
          name: "fixture-nextjs-app",
          version: "1.0.0",
          dependencies: {
            next: "^15.0.0",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
          devDependencies: {
            typescript: "^5.6.0",
          },
          scripts: {
            build: "next build",
            lint: "next lint",
          },
        },
        null,
        2,
      ),
      "next.config.js": "module.exports = {};\n",
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
          },
        },
        null,
        2,
      ),
      "app/page.tsx":
        "export default function Page() {\n  return <div>Next.js Page</div>;\n}\n",
    },
  },
  {
    name: "nestjs-prisma",
    files: {
      "package.json": JSON.stringify(
        {
          name: "fixture-nestjs-prisma",
          version: "1.0.0",
          dependencies: {
            "@nestjs/core": "^10.0.0",
            "@nestjs/common": "^10.0.0",
            "@prisma/client": "^5.0.0",
          },
          devDependencies: {
            typescript: "^5.6.0",
            prisma: "^5.0.0",
          },
          scripts: {
            build: "nest build",
            test: "echo 'testing nest'",
          },
        },
        null,
        2,
      ),
      "nest-cli.json": JSON.stringify(
        {
          language: "ts",
          collection: "@nestjs/schematics",
        },
        null,
        2,
      ),
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
          },
        },
        null,
        2,
      ),
      "prisma/schema.prisma":
        'datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\nmodel User {\n  id   Int    @id @default(autoincrement())\n  name String\n}\n',
      "src/main.ts": "export async function bootstrap() {}\n",
    },
  },
  {
    name: "django-app",
    files: {
      "manage.py":
        "#!/usr/bin/env python\nimport os\nimport sys\n\ndef main():\n    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')\n\nif __name__ == '__main__':\n    main()\n",
      "pyproject.toml":
        '[project]\nname = "fixture-django-app"\nversion = "0.1.0"\ndependencies = ["django>=5.0"]\n',
      "requirements.txt": "django>=5.0\n",
      "app/views.py":
        'def index(request):\n    return "Hello Django"\n',
    },
  },
  {
    name: "fastapi-app",
    files: {
      "pyproject.toml":
        '[project]\nname = "fixture-fastapi-app"\nversion = "0.1.0"\ndependencies = ["fastapi>=0.110.0", "uvicorn>=0.28.0"]\n',
      "requirements.txt": "fastapi>=0.110.0\nuvicorn>=0.28.0\n",
      "app/main.py":
        'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef read_root():\n    return {"message": "Hello FastAPI"}\n',
    },
  },
  {
    name: "go-service",
    files: {
      "go.mod":
        "module example.com/goservice\n\ngo 1.23\n\nrequire github.com/gin-gonic/gin v1.9.1\n",
      "main.go":
        'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello Go Service")\n}\n',
    },
  },
  {
    name: "dotnet-webapi",
    files: {
      "WebApi.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n    <Nullable>enable</Nullable>\n    <ImplicitUsings>enable</ImplicitUsings>\n  </PropertyGroup>\n  <ItemGroup>\n    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.0" />\n  </ItemGroup>\n</Project>\n',
      "Program.cs":
        'var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\napp.MapGet("/", () => "Hello .NET WebAPI");\napp.Run();\n',
    },
  },
  {
    name: "flutter-app",
    files: {
      "pubspec.yaml":
        'name: flutter_app\ndescription: "A fixture Flutter project."\nversion: 1.0.0+1\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  flutter:\n    sdk: flutter\n',
      "lib/main.dart":
        "void main() {\n  print('Hello Flutter');\n}\n",
    },
  },
  {
    name: "spring-boot-maven",
    files: {
      "pom.xml":
        '<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.example</groupId>\n  <artifactId>demo</artifactId>\n  <version>0.0.1-SNAPSHOT</version>\n  <dependencies>\n    <dependency>\n      <groupId>org.springframework.boot</groupId>\n      <artifactId>spring-boot-starter-web</artifactId>\n      <version>3.2.0</version>\n    </dependency>\n  </dependencies>\n</project>\n',
      "src/main/java/com/example/demo/Application.java":
        "package com.example.demo;\n\npublic class Application {\n    public static void main(String[] args) {}\n}\n",
    },
  },
  {
    name: "ktor-gradle",
    files: {
      "build.gradle.kts":
        'plugins {\n    kotlin("jvm") version "2.0.0"\n}\ndependencies {\n    implementation("io.ktor:ktor-server-core:2.3.0")\n}\n',
      "settings.gradle.kts":
        'rootProject.name = "fixture-ktor-gradle"\n',
      "src/main/kotlin/com/example/Application.kt":
        'package com.example\n\nfun main() {\n    println("Hello Ktor")\n}\n',
    },
  },
  {
    name: "rails-app",
    files: {
      Gemfile:
        "source 'https://rubygems.org'\ngem 'rails', '~> 7.1'\n",
      "config/application.rb":
        "module RailsApp\n  class Application\n  end\nend\n",
    },
  },
  {
    name: "laravel-app",
    files: {
      "composer.json": JSON.stringify(
        {
          name: "fixture/laravel-app",
          type: "project",
          require: {
            php: "^8.2",
            "laravel/framework": "^11.0",
          },
        },
        null,
        2,
      ),
      artisan:
        "#!/usr/bin/env php\n<?php\ndefine('LARAVEL_START', microtime(true));\n",
    },
  },
  {
    name: "rust-cli",
    files: {
      "Cargo.toml":
        '[package]\nname = "fixture-rust-cli"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nactix-web = "4"\n',
      "src/main.rs":
        'fn main() {\n    println!("Hello Rust CLI");\n}\n',
    },
  },
  {
    name: "cpp-cmake",
    files: {
      "CMakeLists.txt":
        "cmake_minimum_required(VERSION 3.20)\nproject(FixtureCppApp LANGUAGES CXX)\nadd_executable(app src/main.cpp)\n",
      "src/main.cpp":
        '#include <iostream>\n\nint main() {\n    std::cout << "Hello C++ App" << std::endl;\n    return 0;\n}\n',
    },
  },
  {
    name: "monorepo-polyglot",
    files: {
      "pnpm-workspace.yaml":
        "packages:\n  - 'apps/*'\n  - 'services/*'\n",
      "apps/web/package.json": JSON.stringify(
        {
          name: "@monorepo/web",
          dependencies: {
            next: "^15.0.0",
            react: "^19.0.0",
          },
          devDependencies: {
            typescript: "^5.6.0",
          },
        },
        null,
        2,
      ),
      "apps/web/tsconfig.json": "{\n  \"compilerOptions\": { \"target\": \"ES2022\" }\n}\n",
      "apps/web/next.config.js": "module.exports = {};\n",
      "services/api/go.mod":
        "module example.com/api\n\ngo 1.23\n\nrequire github.com/gin-gonic/gin v1.9.1\n",
      "services/api/main.go": "package main\n\nfunc main() {}\n",
      "services/worker/manage.py": "# django worker\n",
      "services/worker/requirements.txt": "django>=5.0\n",
    },
  },
];

export async function generateFixtures() {
  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  for (const fixture of fixtures) {
    const fixtureRoot = path.join(FIXTURES_DIR, fixture.name);
    await fs.mkdir(fixtureRoot, { recursive: true });

    for (const [relPath, content] of Object.entries(fixture.files)) {
      const fullPath = path.join(fixtureRoot, relPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf8");
    }
  }

  console.log(`Generated ${fixtures.length} fixtures in ${FIXTURES_DIR}`);
}

generateFixtures().catch((err) => {
  console.error(err);
  process.exit(1);
});
