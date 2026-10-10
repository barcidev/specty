import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class ElixirDetector implements StackDetector {
  id = "elixir";
  name = "Elixir";

  async detect(dir: string): Promise<StackDetection | null> {
    const mixPath = path.join(dir, "mix.exs");
    let content: string;
    try {
      content = await fs.readFile(mixPath, "utf8");
    } catch {
      return null;
    }

    const evidence: string[] = ["mix.exs"];
    const frameworks: string[] = [];

    if (content.includes(":phoenix")) {
      frameworks.push("phoenix");
    }
    if (content.includes(":ecto")) {
      frameworks.push("ecto");
    }

    try {
      await fs.access(path.join(dir, "mix.lock"));
      evidence.push("mix.lock");
    } catch {
      // mix.lock optional
    }

    return {
      language: "elixir",
      frameworks,
      confidence: 1.0,
      evidence,
      hasCustomTemplates: false,
    };
  }
}
