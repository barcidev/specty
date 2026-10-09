import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class JavaScriptDetector implements StackDetector {
  id = "javascript";
  name = "TypeScript / JavaScript";

  async detect(dir: string): Promise<StackDetection | null> {
    const pkgPath = path.join(dir, "package.json");
    let pkgRaw: string;
    try {
      pkgRaw = await fs.readFile(pkgPath, "utf8");
    } catch {
      return null;
    }

    let pkg: Record<string, unknown> = {};
    try {
      pkg = JSON.parse(pkgRaw);
    } catch {
      // malformed package.json
    }

    const deps = {
      ...((pkg.dependencies as Record<string, string>) || {}),
      ...((pkg.devDependencies as Record<string, string>) || {}),
    };

    const evidence: string[] = ["package.json"];
    const frameworks: string[] = [];

    // TS check
    let isTypeScript = "typescript" in deps;
    try {
      await fs.access(path.join(dir, "tsconfig.json"));
      isTypeScript = true;
      evidence.push("tsconfig.json");
    } catch {
      // not tsconfig
    }

    // Angular check
    try {
      await fs.access(path.join(dir, "angular.json"));
      frameworks.push("angular");
      evidence.push("angular.json");
    } catch {
      if ("@angular/core" in deps) {
        frameworks.push("angular");
        evidence.push("@angular/core");
      }
    }

    // NestJS check
    try {
      await fs.access(path.join(dir, "nest-cli.json"));
      frameworks.push("nest");
      evidence.push("nest-cli.json");
    } catch {
      if ("@nestjs/core" in deps) {
        frameworks.push("nest");
        evidence.push("@nestjs/core");
      }
    }

    if ("next" in deps) {
      frameworks.push("next");
      evidence.push("next");
    } else if ("react" in deps) {
      frameworks.push("react");
      evidence.push("react");
    }

    if ("nuxt" in deps) {
      frameworks.push("nuxt");
      evidence.push("nuxt");
    } else if ("vue" in deps) {
      frameworks.push("vue");
      evidence.push("vue");
    }

    if ("express" in deps) {
      frameworks.push("express");
      evidence.push("express");
    }

    if ("fastify" in deps) {
      frameworks.push("fastify");
      evidence.push("fastify");
    }

    if ("prisma" in deps || "@prisma/client" in deps) {
      frameworks.push("prisma");
      evidence.push("prisma");
    } else {
      try {
        await fs.access(path.join(dir, "prisma", "schema.prisma"));
        frameworks.push("prisma");
        evidence.push("prisma/schema.prisma");
      } catch {
        // no prisma
      }
    }

    return {
      language: isTypeScript ? "typescript" : "javascript",
      frameworks: [...new Set(frameworks)],
      confidence: 1.0,
      evidence,
      hasCustomTemplates: true,
    };
  }
}
