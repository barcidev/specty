import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeGate } from "../../../src/cli/commands/gate.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import { approveChange } from "../../../src/governance/approvals.js";
import { PR_GATE_COMMENT_MARKER } from "../../../src/governance/pr-reporter.js";

describe("cli gate command", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-gate-cli-"));
    await initGitRepo(tmpDir);

    const config = createDefaultConfig({
      spec_engine: "builtin",
      governance: {
        hooks: true,
        ci: "github",
        source_paths: ["src/**"],
        exempt_paths: ["**/*.md", "openspec/**", ".specty/**"],
        bypass: { env: "SPECTY_BYPASS", trailer: "Specty-Bypass" },
        quality_gates: { lint: true, test: true, static: true, coverage_min: 0 },
      },
    });
    await saveConfig(tmpDir, config);

    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const a = 1;\n");
    await execa("git", ["config", "user.name", "Specty Tester"], { cwd: tmpDir });
    await execa("git", ["config", "user.email", "tester@specty.local"], { cwd: tmpDir });
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "initial commit"], { cwd: tmpDir });

    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_EVENT_PATH;
    delete process.env.GITHUB_REF;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("fails gate when modifying source code without active approved change", async () => {
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const a = 2;\n");

    const passed = await executeGate({ cwd: tmpDir, comment: false });
    expect(passed).toBe(false);
  });

  it("passes gate and exports report to file with --output-comment", async () => {
    await engine.createChange(tmpDir, "login-flow", { title: "User Login Flow" });
    await approveChange(tmpDir, "login-flow");

    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const login = true;\n");

    const outputFile = "pr-report.md";
    const passed = await executeGate({
      cwd: tmpDir,
      outputComment: outputFile,
      comment: false,
      lang: "es",
    });

    expect(passed).toBe(true);

    const generated = await fs.readFile(path.join(tmpDir, outputFile), "utf8");
    expect(generated).toContain(PR_GATE_COMMENT_MARKER);
    expect(generated).toContain("User Login Flow");
    expect(generated).toContain("🟢 **APROBADO**");
  });

  it("outputs JSON report when --json is passed", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await fs.writeFile(path.join(tmpDir, "README.md"), "# Exempt update\n");

    const passed = await executeGate({ cwd: tmpDir, json: true, comment: false });
    expect(passed).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();

    const loggedOutput = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedOutput);
    expect(parsed.passed).toBe(true);
    expect(parsed.report).toContain(PR_GATE_COMMENT_MARKER);
  });

  it("attempts to post PR comment when token, repo, and pr are provided", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 555,
        html_url: "https://github.com/foo/bar/pull/1#issuecomment-555",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    process.env.GITHUB_REPOSITORY = "foo/bar";

    await engine.createChange(tmpDir, "test-change", { title: "Test Change" });
    await approveChange(tmpDir, "test-change");
    await fs.writeFile(path.join(tmpDir, "src/index.ts"), "export const ok = true;\n");

    const passed = await executeGate({
      cwd: tmpDir,
      comment: true,
      token: "test-token",
      pr: 1,
    });

    expect(passed).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
  });
});
