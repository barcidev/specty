import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class SwiftDetector implements StackDetector {
  id = "swift";
  name = "Swift";

  async detect(dir: string): Promise<StackDetection | null> {
    const evidence: string[] = [];
    const frameworks: string[] = [];

    const packageSwiftPath = path.join(dir, "Package.swift");
    let hasPackageSwift = false;
    try {
      const content = await fs.readFile(packageSwiftPath, "utf8");
      hasPackageSwift = true;
      evidence.push("Package.swift");
      if (content.toLowerCase().includes("vapor")) frameworks.push("vapor");
      if (content.toLowerCase().includes("hummingbird")) frameworks.push("hummingbird");
    } catch {
      // no Package.swift
    }

    const xcodeProjects = await fg("*.xcodeproj", { cwd: dir, deep: 2, onlyDirectories: true });
    if (xcodeProjects.length > 0) {
      evidence.push("*.xcodeproj");
    }

    const xcodeWorkspaces = await fg("*.xcworkspace", { cwd: dir, deep: 2, onlyDirectories: true });
    if (xcodeWorkspaces.length > 0) {
      evidence.push("*.xcworkspace");
    }

    const swiftFiles = await fg("**/*.swift", { cwd: dir, deep: 3, onlyFiles: true });
    if (swiftFiles.length > 0 && evidence.length === 0) {
      evidence.push("*.swift");
    }

    if (evidence.length === 0) {
      return null;
    }

    return {
      language: "swift",
      frameworks: [...new Set(frameworks)],
      confidence:
        hasPackageSwift || xcodeProjects.length > 0 || xcodeWorkspaces.length > 0 ? 1.0 : 0.8,
      evidence,
      hasCustomTemplates: false,
    };
  }
}
