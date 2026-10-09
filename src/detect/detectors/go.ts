import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class GoDetector implements StackDetector {
  id = "go";
  name = "Go";

  async detect(dir: string): Promise<StackDetection | null> {
    const gomodPath = path.join(dir, "go.mod");
    let content: string;
    try {
      content = await fs.readFile(gomodPath, "utf8");
    } catch {
      return null;
    }

    const evidence = ["go.mod"];
    const frameworks: string[] = [];

    if (content.includes("github.com/gin-gonic/gin")) frameworks.push("gin");
    if (content.includes("github.com/labstack/echo")) frameworks.push("echo");
    if (content.includes("github.com/gofiber/fiber")) frameworks.push("fiber");

    return {
      language: "go",
      frameworks,
      confidence: 1.0,
      evidence,
      hasCustomTemplates: false,
    };
  }
}
