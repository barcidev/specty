import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class PhpDetector implements StackDetector {
  id = "php";
  name = "PHP";

  async detect(dir: string): Promise<StackDetection | null> {
    const composerPath = path.join(dir, "composer.json");
    let content: string;
    try {
      content = await fs.readFile(composerPath, "utf8");
    } catch {
      return null;
    }

    const evidence = ["composer.json"];
    const frameworks: string[] = [];

    try {
      await fs.access(path.join(dir, "artisan"));
      frameworks.push("laravel");
      evidence.push("artisan");
    } catch {
      if (content.includes("laravel/framework")) frameworks.push("laravel");
    }

    try {
      await fs.access(path.join(dir, "symfony.lock"));
      frameworks.push("symfony");
      evidence.push("symfony.lock");
    } catch {
      if (content.includes("symfony/framework-bundle")) frameworks.push("symfony");
    }

    return {
      language: "php",
      frameworks: [...new Set(frameworks)],
      confidence: 1.0,
      evidence,
      hasCustomTemplates: false,
    };
  }
}
