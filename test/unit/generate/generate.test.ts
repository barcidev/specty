import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fg from "fast-glob";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig } from "../../../src/core/config.js";
import { loadManifest } from "../../../src/core/manifest.js";
import { generateProjectInfrastructure } from "../../../src/generate/generator.js";
import {
  getTemplatesRootDir,
  loadTemplate,
  renderTemplateString,
} from "../../../src/generate/renderer.js";

describe("templates bilingual parity", () => {
  const root = getTemplatesRootDir();

  it("should have identical template file structure between 'es' and 'en'", async () => {
    const esFiles = (
      await fg("**/*", {
        cwd: path.join(root, "es"),
        onlyFiles: true,
      })
    ).sort();

    const enFiles = (
      await fg("**/*", {
        cwd: path.join(root, "en"),
        onlyFiles: true,
      })
    ).sort();

    expect(esFiles).toEqual(enFiles);
    expect(esFiles.length).toBeGreaterThanOrEqual(30);
  });

  it("should have matching template variables in both languages", async () => {
    const files = await fg("**/*.md", {
      cwd: path.join(root, "es"),
      onlyFiles: true,
    });

    const tokenRegex = /\{\{([a-zA-Z0-9_.-]+)\}\}/g;

    for (const relPath of files) {
      const esContent = await fs.readFile(path.join(root, "es", relPath), "utf8");
      const enContent = await fs.readFile(path.join(root, "en", relPath), "utf8");

      const esTokens = new Set(Array.from(esContent.matchAll(tokenRegex)).map((m) => m[1]));
      const enTokens = new Set(Array.from(enContent.matchAll(tokenRegex)).map((m) => m[1]));

      expect(esTokens).toEqual(enTokens);
    }
  });
});

describe("template renderer", () => {
  it("renders variables into strings", () => {
    const template = "Hello {{name}}, welcome to {{project}}!";
    const rendered = renderTemplateString(template, {
      name: "Alice",
      project: "Specty",
    });
    expect(rendered).toBe("Hello Alice, welcome to Specty!");
  });

  it("preserves missing variable placeholders untouched", () => {
    const template = "Value: {{missing}}";
    const rendered = renderTemplateString(template, {});
    expect(rendered).toBe("Value: {{missing}}");
  });

  it("loads localized templates with loadTemplate", async () => {
    const contentEs = await loadTemplate("es", "routing.md");
    expect(contentEs).toContain("Matriz de Enrutamiento");

    const contentEn = await loadTemplate("en", "routing.md");
    expect(contentEn).toContain("Routing Matrix");
  });
});

describe("generator: generateProjectInfrastructure", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-gen-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("generates full project infrastructure in Spanish", async () => {
    const config = createDefaultConfig({
      language: "es",
      scopes: [
        {
          path: ".",
          stack: {
            language: "typescript",
            frameworks: ["react", "nestjs"],
          },
          verify: {},
        },
      ],
    });

    const result = await generateProjectInfrastructure({
      repoRoot: tmpDir,
      config,
      language: "es",
      primaryLanguage: "typescript",
      frameworks: ["react", "nestjs"],
      architecture: "clean",
      projectName: "my-test-app",
      dryRun: false,
    });

    expect(result.writtenCount).toBeGreaterThanOrEqual(20);
    expect(result.skippedCount).toBe(0);

    // Verify AGENTS.md
    const agentsMd = await fs.readFile(path.join(tmpDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain("my-test-app");
    expect(agentsMd).toContain("typescript");
    expect(agentsMd).toContain("react, nestjs");

    // Verify agents
    const orchestrator = await fs.readFile(
      path.join(tmpDir, ".specty/agents/orchestrator.md"),
      "utf8",
    );
    expect(orchestrator).toContain("Orchestrator");

    // Verify routing
    const routing = await fs.readFile(path.join(tmpDir, ".specty/routing.md"), "utf8");
    expect(routing).toContain("Matriz");

    // Verify core rules
    const workflow = await fs.readFile(path.join(tmpDir, ".specty/rules/core/workflow.md"), "utf8");
    expect(workflow.length).toBeGreaterThan(0);

    // Verify language & framework rules
    const tsRule = await fs.readFile(path.join(tmpDir, ".specty/rules/lang/typescript.md"), "utf8");
    expect(tsRule.length).toBeGreaterThan(0);

    const reactRule = await fs.readFile(
      path.join(tmpDir, ".specty/rules/framework/react.md"),
      "utf8",
    );
    expect(reactRule.length).toBeGreaterThan(0);

    // Verify spec templates
    const proposalTmpl = await fs.readFile(
      path.join(tmpDir, ".specty/templates/proposal.md"),
      "utf8",
    );
    expect(proposalTmpl.length).toBeGreaterThan(0);

    // Verify manifest
    const manifest = await loadManifest(tmpDir);
    expect(Object.keys(manifest.files).length).toBe(result.writtenCount);
    expect(manifest.files["AGENTS.md"]).toBeDefined();
    expect(manifest.files[".specty/agents/orchestrator.md"]).toBeDefined();
  });

  it("respects dryRun and writes no files", async () => {
    const config = createDefaultConfig({ language: "en" });

    const result = await generateProjectInfrastructure({
      repoRoot: tmpDir,
      config,
      language: "en",
      dryRun: true,
    });

    expect(result.writtenCount).toBe(0);
    expect(result.files.length).toBeGreaterThanOrEqual(15);

    // Files should NOT exist on disk
    const agentsExists = await fs
      .access(path.join(tmpDir, "AGENTS.md"))
      .then(() => true)
      .catch(() => false);
    expect(agentsExists).toBe(false);

    const manifestExists = await fs
      .access(path.join(tmpDir, ".specty/manifest.json"))
      .then(() => true)
      .catch(() => false);
    expect(manifestExists).toBe(false);
  });
});
