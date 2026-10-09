import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class RubyDetector implements StackDetector {
  id = "ruby";
  name = "Ruby";

  async detect(dir: string): Promise<StackDetection | null> {
    const gemfilePath = path.join(dir, "Gemfile");
    let content: string;
    try {
      content = await fs.readFile(gemfilePath, "utf8");
    } catch {
      return null;
    }

    const evidence = ["Gemfile"];
    const frameworks: string[] = [];

    try {
      await fs.access(path.join(dir, "config", "application.rb"));
      frameworks.push("rails");
      evidence.push("config/application.rb");
    } catch {
      if (content.includes("rails")) frameworks.push("rails");
    }

    if (content.includes("sinatra")) frameworks.push("sinatra");

    return {
      language: "ruby",
      frameworks: [...new Set(frameworks)],
      confidence: 1.0,
      evidence,
      hasCustomTemplates: false,
    };
  }
}
