import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  executeSessionEnd,
  executeSessionStart,
  executeSessionStatus,
} from "../../../src/cli/commands/session.js";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";

describe("cli/commands/session", () => {
  let tempDir: string;
  const changeId = "test-session-feature";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-cli-session-test-"));
    await saveConfig(tempDir, createDefaultConfig());
    const changeDir = path.join(tempDir, "openspec", "changes", changeId);
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Change Proposal: Session Test\n",
      "utf8",
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("starts, checks, and ends agent session via CLI commands", async () => {
    // 1. Iniciar sesión
    const startResult = await executeSessionStart(changeId, {
      cwd: tempDir,
      activity: "Ajustando plan inicial",
      agent: "Antigravity",
      role: "architect",
    });
    expect(startResult).toBe(true);

    // 2. Verificar estado activo
    const statusActive = await executeSessionStatus(changeId, {
      cwd: tempDir,
    });
    expect(statusActive).toBe(true);

    // 3. Finalizar sesión
    const endResult = await executeSessionEnd(changeId, {
      cwd: tempDir,
    });
    expect(endResult).toBe(true);

    // 4. Verificar estado inactivo
    const statusInactive = await executeSessionStatus(changeId, {
      cwd: tempDir,
    });
    expect(statusInactive).toBe(false);
  });
});
