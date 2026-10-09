import path from "node:path";
import type { StackDetector } from "./detectors/base.js";
import { DartDetector } from "./detectors/dart.js";
import { DotNetDetector } from "./detectors/dotnet.js";
import { GoDetector } from "./detectors/go.js";
import { JavaKotlinDetector } from "./detectors/java-kotlin.js";
import { JavaScriptDetector } from "./detectors/javascript.js";
import { PhpDetector } from "./detectors/php.js";
import { PythonDetector } from "./detectors/python.js";
import { RubyDetector } from "./detectors/ruby.js";
import { detectMonorepo } from "./monorepo.js";
import type { DetectedScope, RepositoryDetectionResult, StackDetection } from "./types.js";
import { resolveVerificationCommands } from "./verify-resolver.js";

export class DetectorRegistry {
  private detectors: StackDetector[];

  constructor(customDetectors?: StackDetector[]) {
    this.detectors = customDetectors ?? [
      new JavaScriptDetector(),
      new DartDetector(),
      new DotNetDetector(),
      new JavaKotlinDetector(),
      new PythonDetector(),
      new GoDetector(),
      new RubyDetector(),
      new PhpDetector(),
    ];
  }

  /**
   * Detects the stack for a single directory.
   */
  async detectDirectory(dir: string): Promise<StackDetection | null> {
    const results: StackDetection[] = [];

    for (const detector of this.detectors) {
      try {
        const detection = await detector.detect(dir);
        if (detection) {
          results.push(detection);
        }
      } catch {
        // continue
      }
    }

    if (results.length === 0) {
      return null;
    }

    // Sort by: hasCustomTemplates (Hito 1 priority) > confidence > number of frameworks
    results.sort((a, b) => {
      if (a.hasCustomTemplates !== b.hasCustomTemplates) {
        return a.hasCustomTemplates ? -1 : 1;
      }
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.frameworks.length - a.frameworks.length;
    });

    return results[0] ?? null;
  }

  /**
   * Detects the entire repository layout, monorepo packages, and scopes.
   */
  async detectRepository(repoRoot: string): Promise<RepositoryDetectionResult> {
    const monorepo = await detectMonorepo(repoRoot);
    const scopes: DetectedScope[] = [];

    if (monorepo.isMonorepo && monorepo.packagePaths.length > 0) {
      for (const relPath of monorepo.packagePaths) {
        const fullPath = path.join(repoRoot, relPath);
        const stack = await this.detectDirectory(fullPath);

        if (stack) {
          const verify = await resolveVerificationCommands(fullPath, stack);
          scopes.push({
            path: relPath,
            stack,
            verify,
          });
        }
      }
    }

    // If no scopes found in packages or not a monorepo, check root directory
    if (scopes.length === 0) {
      const rootStack = await this.detectDirectory(repoRoot);
      if (rootStack) {
        const verify = await resolveVerificationCommands(repoRoot, rootStack);
        scopes.push({
          path: ".",
          stack: rootStack,
          verify,
        });
      }
    }

    return {
      layout: monorepo.isMonorepo ? "monorepo" : "single",
      monorepo: monorepo.isMonorepo ? monorepo : undefined,
      scopes,
      primaryLanguage: scopes[0]?.stack.language,
    };
  }
}

export const defaultDetectorRegistry = new DetectorRegistry();
