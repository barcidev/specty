import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class DotNetDetector implements StackDetector {
  id = "dotnet";
  name = "C# / .NET";

  async detect(dir: string): Promise<StackDetection | null> {
    const csprojFiles = await fg("*.csproj", { cwd: dir, onlyFiles: true });
    const slnFiles = await fg("*.sln", { cwd: dir, onlyFiles: true });

    if (csprojFiles.length === 0 && slnFiles.length === 0) {
      return null;
    }

    const evidence: string[] = [...csprojFiles, ...slnFiles];
    const frameworks: string[] = [];

    for (const file of csprojFiles) {
      try {
        const content = await fs.readFile(path.join(dir, file), "utf8");

        if (content.includes("Microsoft.NET.Sdk.Web")) {
          frameworks.push("aspnet-core");
        }
        if (
          content.includes("Microsoft.NET.Sdk.BlazorWebAssembly") ||
          content.includes("Microsoft.AspNetCore.Components.WebAssembly")
        ) {
          frameworks.push("blazor");
        }
        if (content.includes("UseMaui") || content.includes("Microsoft.Maui.Controls")) {
          frameworks.push("maui");
        }
      } catch {
        // read error
      }
    }

    return {
      language: "csharp",
      frameworks: [...new Set(frameworks)],
      confidence: 1.0,
      evidence,
      hasCustomTemplates: true,
    };
  }
}
