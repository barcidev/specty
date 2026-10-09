import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection, VerificationCommands } from "./types.js";

/**
 * Resolves baseline default verification commands for a detected stack based on section 15.
 */
export function getDefaultVerificationCommands(stack: StackDetection): VerificationCommands {
  switch (stack.language) {
    case "typescript":
    case "javascript": {
      const isAngular = stack.frameworks.includes("angular");
      const hasPrisma = stack.frameworks.includes("prisma");

      const cmds: VerificationCommands = {
        lint: "npm run lint",
        test: isAngular ? "npx ng test --watch=false" : "npm test",
        build: "npm run build",
      };

      if (hasPrisma) {
        cmds.validate = "npx prisma validate";
      }

      return cmds;
    }

    case "dart": {
      return {
        format: "dart format --set-exit-if-changed .",
        lint: "flutter analyze",
        test: "flutter test",
      };
    }

    case "csharp": {
      return {
        build: "dotnet build",
        test: "dotnet test",
        format: "dotnet format --verify-no-changes",
      };
    }

    case "java": {
      const isMaven = stack.evidence.includes("pom.xml");
      return {
        build: isMaven ? "mvn compile" : "./gradlew build -x test",
        test: isMaven ? "mvn verify" : "./gradlew check",
      };
    }

    case "kotlin": {
      return {
        test: "./gradlew check",
      };
    }

    case "python": {
      const isDjango = stack.frameworks.includes("django");
      return {
        lint: "ruff check",
        test: isDjango ? "python manage.py test" : "pytest",
      };
    }

    case "go": {
      return {
        lint: "go vet ./...",
        test: "go test ./...",
      };
    }

    case "ruby": {
      const isRails = stack.frameworks.includes("rails");
      return {
        lint: "bundle exec rubocop",
        test: isRails ? "bin/rails test" : "bundle exec rspec",
      };
    }

    case "php": {
      const isLaravel = stack.frameworks.includes("laravel");
      return {
        validate: "composer validate",
        test: isLaravel ? "php artisan test" : "vendor/bin/phpunit",
      };
    }

    default:
      return {};
  }
}

/**
 * Resolves verification commands respecting hierarchy:
 * default stack < project scripts < config overrides.
 */
export async function resolveVerificationCommands(
  dir: string,
  stack: StackDetection,
  configOverrides?: VerificationCommands,
): Promise<VerificationCommands> {
  const resolved = { ...getDefaultVerificationCommands(stack) };

  // Inspect package.json scripts if available
  if (stack.language === "typescript" || stack.language === "javascript") {
    try {
      const pkgPath = path.join(dir, "package.json");
      const raw = await fs.readFile(pkgPath, "utf8");
      const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
      const scripts = parsed.scripts || {};

      if (scripts.lint) resolved.lint = "npm run lint";
      if (scripts.test) resolved.test = "npm test";
      if (scripts.build) resolved.build = "npm run build";
    } catch {
      // ignore
    }
  }

  // Inspect composer.json scripts if available
  if (stack.language === "php") {
    try {
      const composerPath = path.join(dir, "composer.json");
      const raw = await fs.readFile(composerPath, "utf8");
      const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
      const scripts = parsed.scripts || {};

      if (scripts.test) resolved.test = "composer test";
      if (scripts.lint) resolved.lint = "composer lint";
    } catch {
      // ignore
    }
  }

  if (configOverrides) {
    for (const [key, value] of Object.entries(configOverrides)) {
      if (value !== undefined) {
        resolved[key] = value;
      }
    }
  }

  return resolved;
}
