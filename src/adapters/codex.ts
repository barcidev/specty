import type { GeneratedFile } from "../generate/types.js";
import type { ToolAdapter } from "./types.js";

export const codexAdapter: ToolAdapter = {
  id: "codex",
  name: "Codex CLI",

  async generateFiles(): Promise<GeneratedFile[]> {
    // Codex CLI natively reads AGENTS.md directly from the repo root
    return [];
  },

  getExpectedFilePaths(): string[] {
    return [];
  },
};
