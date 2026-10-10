import fs from "node:fs/promises";
import path from "node:path";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class RustDetector implements StackDetector {
  id = "rust";
  name = "Rust";

  async detect(dir: string): Promise<StackDetection | null> {
    const cargoPath = path.join(dir, "Cargo.toml");
    let content: string;
    try {
      content = await fs.readFile(cargoPath, "utf8");
    } catch {
      return null;
    }

    const evidence: string[] = ["Cargo.toml"];

    try {
      await fs.access(path.join(dir, "Cargo.lock"));
      evidence.push("Cargo.lock");
    } catch {
      // Cargo.lock optional
    }

    const frameworks: string[] = [];
    if (content.includes("actix-web")) frameworks.push("actix-web");
    if (content.includes("axum")) frameworks.push("axum");
    if (content.includes("rocket")) frameworks.push("rocket");
    if (content.includes("tauri")) frameworks.push("tauri");
    if (content.includes("tokio")) frameworks.push("tokio");
    if (content.includes("yew")) frameworks.push("yew");

    return {
      language: "rust",
      frameworks: [...new Set(frameworks)],
      confidence: 1.0,
      evidence,
      hasCustomTemplates: false,
    };
  }
}
