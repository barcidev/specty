import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  executeHandoffCreate,
  executeHandoffList,
  executeHandoffShow,
} from "../../../src/cli/commands/handoff.js";
import { BuiltinSpecEngine } from "../../../src/engines/builtin.js";
import {
  createHandoff,
  formatHandoffMarkdown,
  getLatestHandoff,
  listHandoffs,
  parseHandoffMarkdown,
} from "../../../src/handoff/manager.js";

describe("handoff markdown formatter and parser", () => {
  it("formats and parses handoff records round-trip", () => {
    const rawRecord = {
      id: "001-orchestrator-to-backend",
      changeId: "user-auth",
      fromRole: "orchestrator",
      toRole: "backend",
      timestamp: "2026-10-09T14:00:00Z",
      tasksCompleted: ["1.1 Architecture design", "1.2 Schema proposal"],
      filesModified: ["src/auth/schema.ts"],
      decisions: ["Use JWT tokens with 15m expiration"],
      blockers: [],
      nextSteps: ["Implement password hashing repository"],
      notes: "Prioritize Argon2id algorithm.",
    };

    const md = formatHandoffMarkdown(rawRecord);
    expect(md).toContain("# Handoff: 001-orchestrator-to-backend");
    expect(md).toContain("orchestrator");
    expect(md).toContain("backend");

    const parsed = parseHandoffMarkdown("user-auth", "001-orchestrator-to-backend.md", md);
    expect(parsed.fromRole).toBe("orchestrator");
    expect(parsed.toRole).toBe("backend");
    expect(parsed.tasksCompleted).toContain("1.1 Architecture design");
    expect(parsed.filesModified).toContain("src/auth/schema.ts");
    expect(parsed.decisions).toContain("Use JWT tokens with 15m expiration");
  });
});

describe("handoff manager persistence and ordering", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-handoff-test-"));
    const engine = new BuiltinSpecEngine();
    await engine.init(tmpDir);
    await engine.createChange(tmpDir, "checkout-flow");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates sequential handoffs and retrieves the latest one", async () => {
    // 1. First handoff: orchestrator to backend
    const h1 = await createHandoff(tmpDir, "checkout-flow", {
      fromRole: "orchestrator",
      toRole: "backend",
      tasksCompleted: ["1.1 Define payment contracts"],
      filesModified: ["src/types.ts"],
      decisions: ["Stripe integration v2"],
    });
    expect(h1.id).toBe("001-orchestrator-to-backend");

    // 2. Second handoff: backend to testing
    const h2 = await createHandoff(tmpDir, "checkout-flow", {
      fromRole: "backend",
      toRole: "testing",
      tasksCompleted: ["2.1 Stripe webhook listener"],
      filesModified: ["src/payments/stripe.ts"],
      decisions: ["Handle idempotency keys"],
    });
    expect(h2.id).toBe("002-backend-to-testing");

    // 3. List
    const all = await listHandoffs(tmpDir, "checkout-flow");
    expect(all).toHaveLength(2);
    expect(all[0]?.id).toBe("001-orchestrator-to-backend");
    expect(all[1]?.id).toBe("002-backend-to-testing");

    // 4. Latest
    const latest = await getLatestHandoff(tmpDir, "checkout-flow");
    expect(latest).toBeDefined();
    expect(latest?.id).toBe("002-backend-to-testing");
    expect(latest?.fromRole).toBe("backend");
    expect(latest?.toRole).toBe("testing");
  });

  it("CLI executeHandoffCreate, list and show operate as expected", async () => {
    const created = await executeHandoffCreate("checkout-flow", {
      cwd: tmpDir,
      from: "frontend",
      to: "testing",
      tasks: "Render checkout UI, Validate form",
      files: "src/ui/checkout.tsx",
      decisions: "Use controlled inputs",
    });
    expect(created).toBe(true);

    // List without throwing
    await expect(executeHandoffList("checkout-flow", { cwd: tmpDir })).resolves.not.toThrow();

    // Show without throwing
    await expect(
      executeHandoffShow("checkout-flow", undefined, { cwd: tmpDir }),
    ).resolves.not.toThrow();
  });
});
