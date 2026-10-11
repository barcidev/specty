import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "../../../src/core/config.js";
import type { ExecResult } from "../../../src/core/exec.js";
import { ensureGlobalDependencies, isBinaryAvailable } from "../../../src/core/global-deps.js";

describe("core/global-deps", () => {
  it("detects binary availability using runner", async () => {
    const mockRunner = async (cmd: string): Promise<ExecResult> => {
      const success = cmd.includes("existing-bin");
      return {
        command: cmd,
        exitCode: success ? 0 : 1,
        stdout: success ? "/usr/local/bin/existing-bin" : "",
        stderr: "",
        durationMs: 1,
        success,
      };
    };

    expect(await isBinaryAvailable("existing-bin", mockRunner)).toBe(true);
    expect(await isBinaryAvailable("missing-bin", mockRunner)).toBe(false);
  });

  it("installs @fission-ai/openspec globally when binary is missing", async () => {
    const executedCommands: string[] = [];

    const mockRunner = async (cmd: string): Promise<ExecResult> => {
      executedCommands.push(cmd);
      // Binary checks return false
      if (cmd.startsWith("which ") || cmd.startsWith("where ")) {
        return {
          command: cmd,
          exitCode: 1,
          stdout: "",
          stderr: "not found",
          durationMs: 1,
          success: false,
        };
      }
      // Installs return success
      return {
        command: cmd,
        exitCode: 0,
        stdout: "installed",
        stderr: "",
        durationMs: 1,
        success: true,
      };
    };

    const config = createDefaultConfig({
      spec_engine: "openspec",
      mcp: {
        enabled: true,
        graph_provider: "codebase-memory",
      },
    });

    const result = await ensureGlobalDependencies(config, {
      commandRunner: mockRunner,
      silent: true,
      skipGlobalInstall: false,
    });

    expect(result.openspec.required).toBe(true);
    expect(result.openspec.action).toBe("installed");
    expect(result.openspec.installed).toBe(true);

    expect(result.codebaseMemory.required).toBe(true);
    expect(result.codebaseMemory.action).toBe("installed");
    expect(result.codebaseMemory.installed).toBe(true);

    expect(executedCommands).toContain("npm install -g @fission-ai/openspec");
    expect(executedCommands).toContain("npm install -g codebase-memory-mcp");
  });

  it("skips installation when binaries are already available", async () => {
    const executedCommands: string[] = [];

    const mockRunner = async (cmd: string): Promise<ExecResult> => {
      executedCommands.push(cmd);
      return {
        command: cmd,
        exitCode: 0,
        stdout: "/bin/found",
        stderr: "",
        durationMs: 1,
        success: true,
      };
    };

    const config = createDefaultConfig({
      spec_engine: "openspec",
      mcp: {
        enabled: true,
        graph_provider: "codebase-memory",
      },
    });

    const result = await ensureGlobalDependencies(config, {
      commandRunner: mockRunner,
      silent: true,
      skipGlobalInstall: false,
    });

    expect(result.openspec.action).toBe("already_installed");
    expect(result.openspec.installed).toBe(true);
    expect(result.codebaseMemory.action).toBe("already_installed");
    expect(result.codebaseMemory.installed).toBe(true);

    expect(executedCommands.some((c) => c.startsWith("npm install"))).toBe(false);
  });

  it("does not install codebase-memory if graph_provider is builtin SQLite", async () => {
    const executedCommands: string[] = [];

    const mockRunner = async (cmd: string): Promise<ExecResult> => {
      executedCommands.push(cmd);
      return {
        command: cmd,
        exitCode: 0,
        stdout: "/bin/found",
        stderr: "",
        durationMs: 1,
        success: true,
      };
    };

    const config = createDefaultConfig({
      spec_engine: "openspec",
      mcp: {
        enabled: true,
        graph_provider: "builtin",
      },
    });

    const result = await ensureGlobalDependencies(config, {
      commandRunner: mockRunner,
      silent: true,
      skipGlobalInstall: false,
    });

    expect(result.codebaseMemory.required).toBe(false);
    expect(result.codebaseMemory.action).toBe("skipped");
  });

  it("gracefully records failure when npm install command fails", async () => {
    const mockRunner = async (cmd: string): Promise<ExecResult> => {
      if (cmd.startsWith("which ") || cmd.startsWith("where ")) {
        return {
          command: cmd,
          exitCode: 1,
          stdout: "",
          stderr: "not found",
          durationMs: 1,
          success: false,
        };
      }
      return {
        command: cmd,
        exitCode: 1,
        stdout: "",
        stderr: "EACCES: permission denied",
        durationMs: 1,
        success: false,
      };
    };

    const config = createDefaultConfig({
      spec_engine: "openspec",
      mcp: {
        enabled: false,
      },
    });

    const result = await ensureGlobalDependencies(config, {
      commandRunner: mockRunner,
      silent: true,
      skipGlobalInstall: false,
    });

    expect(result.openspec.action).toBe("failed");
    expect(result.openspec.installed).toBe(false);
  });
});
