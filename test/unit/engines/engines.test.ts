import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BuiltinSpecEngine,
  getSpecEngine,
  OpenSpecEngine,
  parseTasksSummary,
  readChangeState,
  writeChangeState,
} from "../../../src/engines/index.js";

describe("spec engines factory", () => {
  it("returns BuiltinSpecEngine for 'builtin'", () => {
    const engine = getSpecEngine("builtin");
    expect(engine).toBeInstanceOf(BuiltinSpecEngine);
    expect(engine.id).toBe("builtin");
  });

  it("returns OpenSpecEngine for 'openspec' and default", () => {
    const engine1 = getSpecEngine("openspec");
    expect(engine1).toBeInstanceOf(OpenSpecEngine);
    expect(engine1.id).toBe("openspec");

    const defaultEngine = getSpecEngine();
    expect(defaultEngine).toBeInstanceOf(OpenSpecEngine);
  });
});

describe("tasks parser & change state", () => {
  it("counts checklist items correctly", () => {
    const sample = `
# Tasks
- [ ] Task 1
- [x] Task 2 completed
- [X] Task 3 uppercase completed
- not a task
- [ ] Task 4 pending
`;
    const summary = parseTasksSummary(sample);
    expect(summary.total).toBe(4);
    expect(summary.completed).toBe(2);
  });

  it("reads and writes specty.yaml change state", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "specty-state-"));
    try {
      await writeChangeState(tmp, {
        change_id: "feat-auth",
        status: "approved",
        approved_by: "tester",
        content_hash: "abcd1234",
      });

      const loaded = await readChangeState(tmp);
      expect(loaded).toBeDefined();
      expect(loaded?.change_id).toBe("feat-auth");
      expect(loaded?.status).toBe("approved");
      expect(loaded?.approved_by).toBe("tester");
      expect(loaded?.content_hash).toBe("abcd1234");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe("BuiltinSpecEngine lifecycle", () => {
  let tmpDir: string;
  let engine: BuiltinSpecEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-engine-test-"));
    engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("initializes spec directories", async () => {
    const changesExists = await fs
      .access(path.join(tmpDir, "openspec/changes"))
      .then(() => true)
      .catch(() => false);
    const archiveExists = await fs
      .access(path.join(tmpDir, "openspec/changes/archive"))
      .then(() => true)
      .catch(() => false);

    expect(changesExists).toBe(true);
    expect(archiveExists).toBe(true);
  });

  it("creates, reads, lists and validates changes", async () => {
    // 1. Create
    const changeDir = await engine.createChange(tmpDir, "add-auth-login", {
      title: "Add User Authentication Login",
    });
    expect(changeDir).toContain("add-auth-login");

    // 2. Get Change
    const change = await engine.getChange(tmpDir, "add-auth-login");
    expect(change).toBeDefined();
    expect(change?.id).toBe("add-auth-login");
    expect(change?.title).toBe("Add User Authentication Login");
    expect(change?.status).toBe("draft");
    expect(change?.tasks.total).toBe(1);
    expect(change?.tasks.completed).toBe(0);

    // 3. List
    const list = await engine.listChanges(tmpDir);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("add-auth-login");

    // 4. Validate
    const validation = await engine.validate(tmpDir, "add-auth-login");
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);

    // 5. Update tasks to completed and verify summary
    await fs.writeFile(
      path.join(changeDir, "tasks.md"),
      "# Tasks\n- [x] 1.1 Completed\n- [ ] 1.2 Pending\n",
    );
    const updated = await engine.getChange(tmpDir, "add-auth-login");
    expect(updated?.tasks.total).toBe(2);
    expect(updated?.tasks.completed).toBe(1);
  });

  it("catches validation errors for empty proposal or missing tasks", async () => {
    const changeDir = path.join(tmpDir, "openspec/changes/bad-change");
    await fs.mkdir(changeDir, { recursive: true });

    // Empty proposal, no tasks.md
    await fs.writeFile(path.join(changeDir, "proposal.md"), "");

    const validation = await engine.validate(tmpDir, "bad-change");
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((i) => i.message.includes("empty"))).toBe(true);
    expect(validation.issues.some((i) => i.message.includes("tasks.md"))).toBe(true);
  });

  it("archives an active change", async () => {
    await engine.createChange(tmpDir, "done-feature");
    const archived = await engine.archive(tmpDir, "done-feature");
    expect(archived).toBe(true);

    // Active list should be empty now
    const activeChanges = await engine.listChanges(tmpDir);
    expect(activeChanges).toHaveLength(0);

    // Should exist in archive
    const archivedDir = path.join(tmpDir, "openspec/changes/archive/done-feature");
    const existsInArchive = await fs
      .access(archivedDir)
      .then(() => true)
      .catch(() => false);
    expect(existsInArchive).toBe(true);

    const state = await readChangeState(archivedDir);
    expect(state?.status).toBe("archived");
  });
});
