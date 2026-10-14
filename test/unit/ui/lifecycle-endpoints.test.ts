import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { writeChangeState } from "../../../src/engines/change-state.js";
import { approveChange } from "../../../src/governance/approvals.js";
import { transitionChangeState } from "../../../src/governance/state-machine.js";
import { startUiServer } from "../../../src/ui/server.js";

describe("ui/router lifecycle endpoints", () => {
  let tempDir: string;
  const changeId = "feature-lifecycle-test";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-ui-lifecycle-test-"));
    await saveConfig(tempDir, createDefaultConfig());
    const changeDir = path.join(tempDir, "openspec", "changes", changeId);
    await fs.mkdir(changeDir, { recursive: true });

    const proposalContent = [
      "# Change Proposal: Lifecycle Test",
      "",
      "## Why",
      "Testing lifecycle endpoints.",
      "",
      "## What Changes",
      "Add lifecycle endpoints.",
    ].join("\n");

    const tasksContent = ["# Tasks", "", "- [ ] 1.1 Complete task"].join("\n");

    await fs.writeFile(path.join(changeDir, "proposal.md"), proposalContent, "utf8");
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksContent, "utf8");
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

  it("handles start, verify, verification, done, and archive operations", async () => {
    const serverInstance = await startUiServer({
      repoRoot: tempDir,
      port: 0,
    });

    const headers = {
      "Content-Type": "application/json",
      "X-Specty-Token": serverInstance.sessionToken,
    };

    try {
      // 1. Trying to start an unapproved change should fail (precondition)
      const startUnapprovedRes = await fetch(
        `${serverInstance.url}/api/changes/${changeId}/start`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        },
      );
      expect(startUnapprovedRes.status).toBe(400);

      // 2. Approve change first
      await approveChange(tempDir, changeId, { approvedBy: "tester" });

      // 3. Start change
      const startRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      expect(startRes.status).toBe(200);
      const startJson = await startRes.json();
      expect(startJson.success).toBe(true);
      expect(startJson.result.toStatus).toBe("in-progress");

      // 4. Verify endpoint (executed on change)
      const verifyRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      expect(verifyRes.status).toBe(200);
      const verifyJson = await verifyRes.json();
      expect(verifyJson.success).toBe(true);
      expect(verifyJson.report).toBeDefined();

      // 5. Get verification evidence
      const getVerifRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/verification`);
      expect(getVerifRes.status).toBe(200);
      const getVerifJson = await getVerifRes.json();
      expect(getVerifJson.report).toBeDefined();

      // 6. Complete change with force (since no real git commits in tmp fixture)
      const doneRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/done`, {
        method: "POST",
        headers,
        body: JSON.stringify({ force: true }),
      });
      expect(doneRes.status).toBe(200);
      const doneJson = await doneRes.json();
      expect(doneJson.success).toBe(true);
      expect(doneJson.result.toStatus).toBe("done");

      // 7. Archive change
      const archiveRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/archive`, {
        method: "POST",
        headers,
        body: JSON.stringify({ force: true }),
      });
      expect(archiveRes.status).toBe(200);
      const archiveJson = await archiveRes.json();
      expect(archiveJson.success).toBe(true);
      expect(archiveJson.changeId).toBe(changeId);
    } finally {
      await serverInstance.close();
    }
  }, 15000);

  it("handles complete-and-archive unified 1-click operation", async () => {
    const serverInstance = await startUiServer({
      repoRoot: tempDir,
      port: 0,
    });

    const headers = {
      "Content-Type": "application/json",
      "X-Specty-Token": serverInstance.sessionToken,
    };

    try {
      await approveChange(tempDir, changeId, { approvedBy: "tester" });
      await transitionChangeState(tempDir, changeId, "in-progress");

      const res = await fetch(
        `${serverInstance.url}/api/changes/${changeId}/complete-and-archive`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ force: true }),
        },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe("archived");
      expect(json.changeId).toBe(changeId);
    } finally {
      await serverInstance.close();
    }
  }, 15000);

  it("locks plan approval while agent session is active and unlocks when ended", async () => {
    const serverInstance = await startUiServer({
      repoRoot: tempDir,
      port: 0,
    });

    const headers = {
      "Content-Type": "application/json",
      "X-Specty-Token": serverInstance.sessionToken,
    };

    try {
      // 1. Iniciar sesión de trabajo del agente
      const startSessionRes = await fetch(
        `${serverInstance.url}/api/changes/${changeId}/agent-session/start`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            activity: "Ajustando plan inicial",
            agent: "Antigravity",
            role: "orchestrator",
          }),
        },
      );
      expect(startSessionRes.status).toBe(200);
      const startSessionJson = await startSessionRes.json();
      expect(startSessionJson.success).toBe(true);
      expect(startSessionJson.session.active).toBe(true);

      // 2. Verificar que el detalle del change incluye la sesión activa
      const detailRes = await fetch(`${serverInstance.url}/api/changes/${changeId}`, {
        headers,
      });
      const detailJson = await detailRes.json();
      expect(detailJson.agentSession?.active).toBe(true);
      expect(detailJson.agentSession?.activity).toBe("Ajustando plan inicial");

      // 3. Intentar aprobar mientras el agente está trabajando debe ser rechazado con 409
      const approveRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      expect(approveRes.status).toBe(409);
      const approveErr = await approveRes.json();
      expect(approveErr.locked).toBe(true);

      // 4. Finalizar sesión de trabajo del agente
      const endSessionRes = await fetch(
        `${serverInstance.url}/api/changes/${changeId}/agent-session/end`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        },
      );
      expect(endSessionRes.status).toBe(200);
      const endSessionJson = await endSessionRes.json();
      expect(endSessionJson.active).toBe(false);

      // 5. Ahora la aprobación del plan debe completarse exitosamente
      const approveAfterEndRes = await fetch(
        `${serverInstance.url}/api/changes/${changeId}/approve`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        },
      );
      expect(approveAfterEndRes.status).toBe(200);
      const approveOk = await approveAfterEndRes.json();
      expect(approveOk.success).toBe(true);
      expect(approveOk.approval.contentHash).toBeDefined();
      expect(approveOk.approval.changeId).toBe(changeId);
    } finally {
      await serverInstance.close();
    }
  }, 15000);
});
