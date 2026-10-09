import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class JavaKotlinDetector implements StackDetector {
  id = "java-kotlin";
  name = "Java / Kotlin";

  async detect(dir: string): Promise<StackDetection | null> {
    const hasPom = await this.fileExists(path.join(dir, "pom.xml"));
    const hasGradle = await this.fileExists(path.join(dir, "build.gradle"));
    const hasGradleKts = await this.fileExists(path.join(dir, "build.gradle.kts"));

    if (!hasPom && !hasGradle && !hasGradleKts) {
      return null;
    }

    const evidence: string[] = [];
    if (hasPom) evidence.push("pom.xml");
    if (hasGradle) evidence.push("build.gradle");
    if (hasGradleKts) evidence.push("build.gradle.kts");

    const frameworks: string[] = [];

    // Check for Kotlin
    let isKotlin = hasGradleKts;
    const kotlinFiles = await fg("**/*.kt", { cwd: dir, deep: 3, onlyFiles: true });
    if (kotlinFiles.length > 0) {
      isKotlin = true;
      evidence.push("*.kt");
    }

    // Framework hints
    const manifestFiles = [
      hasPom ? path.join(dir, "pom.xml") : null,
      hasGradle ? path.join(dir, "build.gradle") : null,
      hasGradleKts ? path.join(dir, "build.gradle.kts") : null,
    ].filter(Boolean) as string[];

    for (const f of manifestFiles) {
      try {
        const content = await fs.readFile(f, "utf8");
        if (content.includes("spring-boot") || content.includes("org.springframework.boot")) {
          frameworks.push("spring-boot");
        }
        if (content.includes("io.quarkus")) {
          frameworks.push("quarkus");
        }
        if (content.includes("io.micronaut")) {
          frameworks.push("micronaut");
        }
        if (content.includes("io.ktor")) {
          frameworks.push("ktor");
        }
      } catch {
        // ignore
      }
    }

    return {
      language: isKotlin ? "kotlin" : "java",
      frameworks: [...new Set(frameworks)],
      confidence: 0.9,
      evidence,
      hasCustomTemplates: false,
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
