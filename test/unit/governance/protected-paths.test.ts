import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { checkApprovalGate } from "../../../src/governance/check-approval.js";

describe("protected governance paths (A4)", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-protected-test-"));
    await initGitRepo(tmpDir, "main");

    const config = createDefaultConfig({
      spec_engine: "builtin",
      governance: {
        hooks: true,
        ci: "github",
        source_paths: ["src/**"],
        exempt_paths: ["**/*.md", "openspec/**", "docs/**"],
        bypass: { env: "SPECTY_BYPASS", trailer: "Specty-Bypass" },
        quality_gates: { lint: true, test: true, static: true, coverage_min: 0 },
      },
    });
    await saveConfig(tmpDir, config);

    await fs.mkdir(path.join(tmpDir, ".husky"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".husky/pre-commit"), "npx specty check-approval\n");

    await execa("git", ["config", "user.name", "Tester"], { cwd: tmpDir });
    await execa("git", ["config", "user.email", "tester@specty.local"], { cwd: tmpDir });
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "initial commit"], { cwd: tmpDir });

    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
  });

  afterEach(async () => {
    delete process.env.SPECTY_BYPASS;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("blocks modifications to specty configuration files without bypass", async () => {
    const configPath = path.join(tmpDir, ".specty/config.yaml");
    const content = await fs.readFile(configPath, "utf8");
    await fs.writeFile(configPath, content.replace("src/**", "altered/**"), "utf8");
    await execa("git", ["add", ".specty/config.yaml"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("protected_config_tampered");
    expect(result.protectedFilesModified).toContain(".specty/config.yaml");
    expect(result.reason).toContain("protected from unauthorized modification");
  });

  it("blocks modifications to .husky hooks without bypass", async () => {
    await fs.writeFile(path.join(tmpDir, ".husky/pre-commit"), "# disabled hook\n");
    await execa("git", ["add", ".husky/pre-commit"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, { stagedOnly: true });
    expect(result.passed).toBe(false);
    expect(result.errorCode).toBe("protected_config_tampered");
    expect(result.protectedFilesModified).toContain(".husky/pre-commit");
  });

  it("allows modifications to protected paths when emergency bypass is present", async () => {
    process.env.SPECTY_BYPASS = "1";

    const configPath = path.join(tmpDir, ".specty/config.yaml");
    const content = await fs.readFile(configPath, "utf8");
    await fs.writeFile(configPath, `${content}\n# admin maintenance\n`, "utf8");
    await execa("git", ["add", ".specty/config.yaml"], { cwd: tmpDir });

    const result = await checkApprovalGate(tmpDir, {
      stagedOnly: true,
      bypassReason: "Upgrading governance configuration",
    });

    expect(result.passed).toBe(true);
    expect(result.bypassed).toBe(true);
  });
});
