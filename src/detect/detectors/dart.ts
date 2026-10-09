import fs from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class DartDetector implements StackDetector {
  id = "dart";
  name = "Dart / Flutter";

  async detect(dir: string): Promise<StackDetection | null> {
    const pubspecPath = path.join(dir, "pubspec.yaml");
    let raw: string;
    try {
      raw = await fs.readFile(pubspecPath, "utf8");
    } catch {
      return null;
    }

    const evidence: string[] = ["pubspec.yaml"];
    const frameworks: string[] = [];

    let parsed: Record<string, unknown> = {};
    try {
      parsed = yaml.parse(raw) || {};
    } catch {
      // malformed yaml
    }

    const deps = (parsed.dependencies as Record<string, unknown>) || {};
    const devDeps = (parsed.dev_dependencies as Record<string, unknown>) || {};

    const isFlutter = "flutter" in parsed || "flutter" in deps || "flutter_test" in devDeps;
    if (isFlutter) {
      frameworks.push("flutter");
      evidence.push("flutter");
    }

    return {
      language: "dart",
      frameworks,
      confidence: 1.0,
      evidence,
      hasCustomTemplates: true,
    };
  }
}
