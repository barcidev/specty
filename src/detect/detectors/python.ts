import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class PythonDetector implements StackDetector {
  id = "python";
  name = "Python";

  async detect(dir: string): Promise<StackDetection | null> {
    const indicators = [
      "uv.lock",
      "poetry.lock",
      "pdm.lock",
      "pyproject.toml",
      "requirements.txt",
      "manage.py",
      "Pipfile",
      "setup.py",
    ];

    const evidence: string[] = [];
    for (const item of indicators) {
      try {
        await fs.access(path.join(dir, item));
        evidence.push(item);
      } catch {
        // ignore
      }
    }

    if (evidence.length === 0) {
      return null;
    }

    const frameworks: string[] = [];

    // Modern package managers
    if (evidence.includes("uv.lock")) {
      frameworks.push("uv");
    }
    if (evidence.includes("poetry.lock")) {
      frameworks.push("poetry");
    }
    if (evidence.includes("pdm.lock")) {
      frameworks.push("pdm");
    }

    if (evidence.includes("manage.py")) {
      frameworks.push("django");
    }

    for (const f of ["requirements.txt", "pyproject.toml", "Pipfile"]) {
      if (evidence.includes(f)) {
        try {
          const content = await fs.readFile(path.join(dir, f), "utf8");
          if (content.toLowerCase().includes("django")) frameworks.push("django");
          if (content.toLowerCase().includes("fastapi")) frameworks.push("fastapi");
          if (content.toLowerCase().includes("flask")) frameworks.push("flask");
          if (f === "pyproject.toml") {
            if (content.includes("[tool.uv]") && !frameworks.includes("uv")) frameworks.push("uv");
            if (content.includes("[tool.poetry]") && !frameworks.includes("poetry"))
              frameworks.push("poetry");
            if (content.includes("[tool.pdm]") && !frameworks.includes("pdm"))
              frameworks.push("pdm");
          }
        } catch {
          // ignore
        }
      }
    }

    return {
      language: "python",
      frameworks: [...new Set(frameworks)],
      confidence: 0.9,
      evidence,
      hasCustomTemplates: false,
    };
  }
}
