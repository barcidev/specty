import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeChangeState } from "../../../src/engines/change-state.js";
import { startUiServer } from "../../../src/ui/server.js";

describe("ui/server", () => {
  let tempDir: string;
  const changeId = "feature-web-ui";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-ui-server-test-"));
    // Create minimal openspec change structure
    const changeDir = path.join(tempDir, "openspec", "changes", changeId);
    await fs.mkdir(changeDir, { recursive: true });

    const proposalContent = [
      "# Change Proposal: Web UI",
      "",
      "## Why",
      "Human reviewers need a visual dashboard.",
      "",
      "## What Changes",
      "Add HTTP server.",
      "",
      "## Impact",
      "Acceptance criteria: `npm test` passes.",
    ].join("\n");

    const tasksContent = ["# Tasks", "", "- [ ] 1.1 Start server", "- [x] 1.2 Add tests"].join(
      "\n",
    );

    await fs.writeFile(path.join(changeDir, "proposal.md"), proposalContent, "utf8");
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksContent, "utf8");
    await writeChangeState(changeDir, {
      change_id: changeId,
      status: "draft",
      tasks_total: 2,
      tasks_completed: 1,
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("boots HTTP server, serves REST API and static assets, and shuts down cleanly", async () => {
    const serverInstance = await startUiServer({
      repoRoot: tempDir,
      port: 0, // let system pick an ephemeral port or auto-search
    });

    expect(serverInstance.port).toBeGreaterThan(0);
    expect(serverInstance.url).toContain(`:${serverInstance.port}`);

    try {
      // 1. GET /api/status
      const statusRes = await fetch(`${serverInstance.url}/api/status`);
      expect(statusRes.status).toBe(200);
      const statusData = (await statusRes.json()) as { repoRoot: string };
      expect(statusData.repoRoot).toBe(tempDir);

      // 2. GET /api/changes
      const changesRes = await fetch(`${serverInstance.url}/api/changes`);
      expect(changesRes.status).toBe(200);
      const changesData = (await changesRes.json()) as { changes: Array<{ id: string }> };
      expect(changesData.changes).toHaveLength(1);
      expect(changesData.changes[0]?.id).toBe(changeId);

      // 3. GET /api/changes/:id
      const detailRes = await fetch(`${serverInstance.url}/api/changes/${changeId}`);
      expect(detailRes.status).toBe(200);
      const detailData = (await detailRes.json()) as { id: string; proposalSections: unknown[] };
      expect(detailData.id).toBe(changeId);
      expect(detailData.proposalSections.length).toBeGreaterThan(0);

      // 4. CSRF Protection: Rejects mutations without X-Specty-Token
      const unauthorizedRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: "why",
          comment: "Unauthenticated comment",
        }),
      });
      expect(unauthorizedRes.status).toBe(403);

      // 4b. Authorized POST /api/changes/:id/reviews with X-Specty-Token
      const addReviewRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Specty-Token": serverInstance.sessionToken,
        },
        body: JSON.stringify({
          sectionId: "why",
          comment: "Favor verificar el puerto por defecto.",
          type: "comment",
          author: "reviewer-1",
        }),
      });
      expect(addReviewRes.status).toBe(201);
      const reviewJson = (await addReviewRes.json()) as {
        success: boolean;
        review: { id: string };
      };
      expect(reviewJson.success).toBe(true);
      expect(reviewJson.review.id).toMatch(/^rev-/);

      // 5. POST /api/changes/:id/tasks/toggle with X-Specty-Token
      const toggleRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/tasks/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Specty-Token": serverInstance.sessionToken,
        },
        body: JSON.stringify({
          lineIndex: 2, // line "- [ ] 1.1 Start server"
          completed: true,
        }),
      });
      expect(toggleRes.status).toBe(200);
      const toggleData = (await toggleRes.json()) as {
        tasksData: { completed: number; total: number };
      };
      expect(toggleData.tasksData.completed).toBe(2);

      // 6. POST /api/changes/:id/approve with X-Specty-Token
      const approveRes = await fetch(`${serverInstance.url}/api/changes/${changeId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Specty-Token": serverInstance.sessionToken,
        },
        body: JSON.stringify({
          notes: "Approved from local dashboard",
        }),
      });
      expect(approveRes.status).toBe(200);
      const approveData = (await approveRes.json()) as {
        success: boolean;
        approval: { changeId: string; approvedBy: string; contentHash: string; approvedAt: string };
      };
      expect(approveData.success).toBe(true);
      expect(approveData.approval.changeId).toBe(changeId);
      expect(approveData.approval.approvedBy).toBeDefined();
      expect(approveData.approval.contentHash).toBeDefined();

      // 7. GET / (Static index.html with injected session token)
      const indexRes = await fetch(`${serverInstance.url}/`);
      expect(indexRes.status).toBe(200);
      const htmlText = await indexRes.text();
      expect(htmlText).toContain("Specty UI");
      expect(htmlText).toContain("window.__SPECTY_TOKEN__");

      // 8. Test Path Traversal prevention
      const badPathRes = await fetch(`${serverInstance.url}/../../../../etc/passwd`);
      // Should fallback to index.html or 404, NEVER expose /etc/passwd
      const badText = await badPathRes.text();
      expect(badText).not.toContain("root:x:0:0");
    } finally {
      await serverInstance.close();
    }
  });
});
