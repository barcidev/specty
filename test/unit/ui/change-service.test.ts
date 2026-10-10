import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeChangeState } from "../../../src/engines/change-state.js";
import {
  getChangeDetail,
  parseProposalSections,
  parseTasksData,
  toggleTaskStatus,
} from "../../../src/ui/change-service.js";

describe("ui/change-service", () => {
  let tempDir: string;
  const changeId = "add-dashboard";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-ui-change-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("parses proposal markdown into sections", () => {
    const markdown = [
      "# Change Proposal: Add Dashboard",
      "",
      "Overview description here.",
      "",
      "## Why",
      "Because humans need visual UI.",
      "",
      "## What Changes",
      "Create local HTTP server and web dashboard.",
      "",
      "## Impact",
      "Acceptance criteria: `npm test` passes.",
    ].join("\n");

    const sections = parseProposalSections(markdown);
    expect(sections).toHaveLength(4);
    expect(sections[0].title).toBe("Change Proposal: Add Dashboard");
    expect(sections[1].title).toBe("Why");
    expect(sections[1].id).toBe("why");
    expect(sections[1].content).toContain("Because humans need visual UI.");
    expect(sections[2].title).toBe("What Changes");
    expect(sections[3].title).toBe("Impact");
  });

  it("parses tasks markdown with roles and toggles task status", async () => {
    const changeDir = path.join(tempDir, "openspec", "changes", changeId);
    await fs.mkdir(changeDir, { recursive: true });

    const tasksMarkdown = [
      "# Tasks",
      "",
      "## [rol: backend]",
      "- [ ] 1.1 Implement HTTP server",
      "- [x] 1.2 Setup routes",
      "",
      "## [rol: frontend]",
      "- [ ] 2.1 Build SPA layout",
    ].join("\n");

    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksMarkdown, "utf8");
    await writeChangeState(changeDir, {
      change_id: changeId,
      status: "draft",
      tasks_total: 3,
      tasks_completed: 1,
    });

    const parsed = parseTasksData(tasksMarkdown);
    expect(parsed.total).toBe(3);
    expect(parsed.completed).toBe(1);
    expect(parsed.items).toHaveLength(3);
    expect(parsed.items[0].role).toBe("backend");
    expect(parsed.items[0].completed).toBe(false);
    expect(parsed.items[1].completed).toBe(true);
    expect(parsed.items[2].role).toBe("frontend");

    // Toggle task 1.1 (line 3 in 0-indexed array)
    const updated = await toggleTaskStatus(tempDir, changeId, 3, true);
    expect(updated.completed).toBe(2);

    const updatedFileContent = await fs.readFile(path.join(changeDir, "tasks.md"), "utf8");
    expect(updatedFileContent).toContain("- [x] 1.1 Implement HTTP server");
  });

  it("loads complete change detail including proposal, tasks and validation", async () => {
    const changeDir = path.join(tempDir, "openspec", "changes", changeId);
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(changeDir, "proposal.md"),
      "# Dashboard Proposal\n\n## Why\nTesting detail.",
      "utf8",
    );
    await fs.writeFile(path.join(changeDir, "tasks.md"), "- [ ] Task 1", "utf8");
    await writeChangeState(changeDir, {
      change_id: changeId,
      status: "draft",
    });

    const detail = await getChangeDetail(tempDir, changeId);
    expect(detail).not.toBeNull();
    expect(detail?.id).toBe(changeId);
    expect(detail?.title).toBe("Dashboard Proposal");
    expect(detail?.proposalSections).toHaveLength(2);
    expect(detail?.tasksData.total).toBe(1);
  });
});
