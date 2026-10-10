import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeChangeState } from "../../../src/engines/change-state.js";
import {
  detectIdeEnvironment,
  dispatchSpecViewer,
  isUiServerActive,
  projectPlanForIde,
} from "../../../src/ui/dispatcher.js";
import { startUiServer } from "../../../src/ui/server.js";

describe("ui/dispatcher", () => {
  let tempDir: string;
  const changeId = "feature-dispatcher";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-dispatcher-test-"));
    const changeDir = path.join(tempDir, "openspec", "changes", changeId);
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Dispatcher Change\n\n## Objective\nAuto viewer dispatch.",
      "utf8",
    );
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "# Tasks\n\n## [rol: orchestrator]\n- [ ] 1.1 Dispatch plan",
      "utf8",
    );
    await writeChangeState(changeDir, {
      change_id: changeId,
      status: "draft",
      tasks_total: 1,
      tasks_completed: 0,
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("detects IDE environment from process variables", () => {
    const env = detectIdeEnvironment();
    expect(env).toBeDefined();
    expect(typeof env.isAntigravity).toBe("boolean");
    expect(typeof env.name).toBe("string");
  });

  it("projects plan into rich markdown document for Antigravity IDE", async () => {
    const planPath = await projectPlanForIde(tempDir, changeId);
    expect(planPath).toContain(`${changeId}-plan.md`);

    const content = await fs.readFile(planPath, "utf8");
    expect(content).toContain("# Plan de Implementación: Dispatcher Change");
    expect(content).toContain("> [!NOTE]");
    expect(content).toContain("- [ ] 1.1 Dispatch plan `[rol: orchestrator]`");
    expect(content).toContain("> [!TIP]");
  });

  it("dispatches to ide-plan when preferIdePlan is set", async () => {
    const result = await dispatchSpecViewer(tempDir, changeId, {
      preferIdePlan: true,
      openBrowser: false,
    });

    expect(result.mode).toBe("ide-plan");
    expect(result.planFilePath).toBeDefined();
  });

  it("detects if UI server is active or inactive", async () => {
    // Ephemeral port unlikely to be open
    const inactive = await isUiServerActive("127.0.0.1", 49151);
    expect(inactive).toBe(false);

    // Boot a server
    const serverInstance = await startUiServer({ repoRoot: tempDir, port: 0 });
    try {
      const active = await isUiServerActive("127.0.0.1", serverInstance.port);
      expect(active).toBe(true);
    } finally {
      await serverInstance.close();
    }
  });
});
