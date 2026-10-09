import { describe, expect, it } from "vitest";
import { ExitCode, executeCommand } from "../../../src/core/exec.js";

describe("core/exec", () => {
  it("executes successful shell commands", async () => {
    const res = await executeCommand("node -v", { silent: true });
    expect(res.success).toBe(true);
    expect(res.exitCode).toBe(ExitCode.SUCCESS);
    expect(res.stdout).toContain("v");
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("captures failure exit codes and errors cleanly", async () => {
    const res = await executeCommand("node -e 'process.exit(1)'", { silent: true });
    expect(res.success).toBe(false);
    expect(res.exitCode).toBe(1);
  });
});
