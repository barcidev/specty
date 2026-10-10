import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { StackDetection } from "../types.js";
import type { StackDetector } from "./base.js";

export class CCppDetector implements StackDetector {
  id = "c-cpp";
  name = "C / C++";

  async detect(dir: string): Promise<StackDetection | null> {
    const evidence: string[] = [];
    const frameworks: string[] = [];

    const cmakePath = path.join(dir, "CMakeLists.txt");
    let hasCMake = false;
    let cmakeContent = "";
    try {
      cmakeContent = await fs.readFile(cmakePath, "utf8");
      hasCMake = true;
      evidence.push("CMakeLists.txt");
      frameworks.push("cmake");
    } catch {
      // no CMakeLists.txt
    }

    const makefilePath = path.join(dir, "Makefile");
    try {
      await fs.access(makefilePath);
      evidence.push("Makefile");
      if (!frameworks.includes("cmake")) {
        frameworks.push("make");
      }
    } catch {
      // no Makefile
    }

    const compileCommandsPath = path.join(dir, "compile_commands.json");
    try {
      await fs.access(compileCommandsPath);
      evidence.push("compile_commands.json");
    } catch {
      // no compile_commands.json
    }

    if (evidence.length === 0) {
      return null;
    }

    // Inspect files to differentiate C and C++
    const cppFiles = await fg("**/*.{cpp,cc,cxx,hpp,hxx}", {
      cwd: dir,
      deep: 3,
      onlyFiles: true,
      ignore: ["**/build/**", "**/bin/**", "**/dist/**"],
    });

    const isCpp =
      cppFiles.length > 0 ||
      cmakeContent.toUpperCase().includes("CXX") ||
      cmakeContent.toUpperCase().includes("CMAKE_CXX_STANDARD");

    if (isCpp && cppFiles.length > 0) {
      evidence.push("*.cpp");
    }

    return {
      language: isCpp ? "cpp" : "c",
      frameworks: [...new Set(frameworks)],
      confidence: hasCMake || evidence.includes("compile_commands.json") ? 1.0 : 0.85,
      evidence,
      hasCustomTemplates: false,
    };
  }
}
