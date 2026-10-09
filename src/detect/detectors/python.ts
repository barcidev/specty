import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class PythonDetector implements StackDetector {
  id = "python";
  name = "Python";

  async detect(dir: string): Promise<StackDetection | null> {
    const indicators = ["pyproject.toml", "requirements.txt", "manage.py", "Pipfile", "setup.py"];

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
