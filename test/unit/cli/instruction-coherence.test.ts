import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { describe, expect, it } from "vitest";
import { getRegisteredCommands } from "../../../src/cli/index.js";

describe("CLI Instruction Coherence (C4)", () => {
  it("all specty commands cited across all markdown templates must exist in the CLI", async () => {
    const registeredCommands = getRegisteredCommands();
    expect(registeredCommands).toContain("verify");
    expect(registeredCommands).toContain("openspec");
    expect(registeredCommands).toContain("status");
    expect(registeredCommands).toContain("approve");
    expect(registeredCommands).toContain("validate");
    expect(registeredCommands).toContain("doctor");
    expect(registeredCommands).toContain("gate");

    const templatesDir = path.resolve(process.cwd(), "templates");
    const templateFiles = await fg("**/*.md", { cwd: templatesDir, absolute: true });
    expect(templateFiles.length).toBeGreaterThan(0);

    const citedSubcommands = new Set<string>();
    const commandInvocations: { file: string; line: number; command: string }[] = [];

    // Regex to match backticked or bash specty command invocations: `specty <subcommand> ...`
    const commandRegex = /`specty\s+([a-zA-Z0-9_-]+)(?:\s+[^`]+)?`/g;

    for (const filePath of templateFiles) {
      const content = await fs.readFile(filePath, "utf8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        let match: RegExpExecArray | null = commandRegex.exec(line);
        while (match !== null) {
          const subcommand = match[1]?.toLowerCase();
          if (subcommand) {
            citedSubcommands.add(subcommand);
            commandInvocations.push({
              file: path.relative(process.cwd(), filePath),
              line: i + 1,
              command: match[0],
            });
          }
          match = commandRegex.exec(line);
        }
      }
    }

    expect(citedSubcommands.size).toBeGreaterThan(0);

    // Verify every cited subcommand exists in registered CLI commands
    const unknownCommands: { file: string; line: number; command: string; subcommand: string }[] =
      [];

    for (const invocation of commandInvocations) {
      const match = invocation.command.match(/`specty\s+([a-zA-Z0-9_-]+)/);
      const subcmd = match ? match[1]?.toLowerCase() : "";
      if (subcmd && !registeredCommands.includes(subcmd)) {
        unknownCommands.push({ ...invocation, subcommand: subcmd });
      }
    }

    expect(unknownCommands).toEqual([]);
  });

  it("ensures English and Spanish orchestrator instructions reference identical valid tools", async () => {
    const registeredCommands = getRegisteredCommands();
    const esOrchestrator = await fs.readFile(
      path.resolve(process.cwd(), "templates/es/agents/orchestrator.md"),
      "utf8",
    );
    const enOrchestrator = await fs.readFile(
      path.resolve(process.cwd(), "templates/en/agents/orchestrator.md"),
      "utf8",
    );

    const extractCommands = (text: string): string[] => {
      const matches = text.match(/`specty\s+([a-zA-Z0-9_-]+)/g) || [];
      return matches.map((m) => m.replace("`specty ", "").trim());
    };

    const esCommands = extractCommands(esOrchestrator);
    const enCommands = extractCommands(enOrchestrator);

    expect(esCommands).toEqual(enCommands);
    for (const cmd of esCommands) {
      expect(registeredCommands).toContain(cmd);
    }
  });
});
