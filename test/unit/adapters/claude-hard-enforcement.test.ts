import { describe, expect, it } from "vitest";
import { getAdapter } from "../../../src/adapters/index.js";
import type { AdapterContext } from "../../../src/adapters/types.js";
import { createDefaultConfig } from "../../../src/core/config.js";

describe("claude adapter hard enforcement (C6, C7)", () => {
  const dummyCtx: AdapterContext = {
    repoRoot: "/test",
    config: createDefaultConfig(),
    language: "en",
    enableMcp: true,
  };

  it("generates .claude/settings.json with PreToolUse hooks, card hooks and permissions.deny (C6)", async () => {
    const adapter = getAdapter("claude");
    const files = await adapter.generateFiles(dummyCtx);

    const settingsFile = files.find((f) => f.relativePath === ".claude/settings.json");
    expect(settingsFile).toBeDefined();

    const parsed = JSON.parse(settingsFile?.content ?? "{}");
    expect(parsed.env.OPENSPEC_TELEMETRY).toBe("0");

    // Hooks
    expect(parsed.hooks).toBeDefined();
    expect(parsed.hooks.PreToolUse).toHaveLength(2);
    expect(parsed.hooks.PreToolUse[0].matcher).toContain("Edit");
    expect(parsed.hooks.PreToolUse[0].command).toContain("specty guard");
    expect(parsed.hooks.PreToolUse[1].matcher).toBe("Bash");
    expect(parsed.hooks.PreToolUse[1].command).toContain("specty guard");

    expect(parsed.hooks.UserPromptSubmit[0].command).toContain("specty next --card");
    expect(parsed.hooks.SessionStart[0].command).toContain("specty next --card");

    // Permissions deny
    expect(parsed.permissions.deny).toContain("specty approve *");
    expect(parsed.permissions.deny).toContain("git commit *--no-verify*");
  });

  it("generates subagents with YAML frontmatter restricting orchestrator tools (C7)", async () => {
    const adapter = getAdapter("claude");
    const files = await adapter.generateFiles(dummyCtx);

    const orchestrator = files.find((f) => f.relativePath === ".claude/agents/orchestrator.md");
    expect(orchestrator).toBeDefined();
    expect(orchestrator?.content).toMatch(/^---\s*\nname:\s*orchestrator/m);
    expect(orchestrator?.content).toContain("tools:");
    expect(orchestrator?.content).toContain("- Read");
    expect(orchestrator?.content).toContain("- Bash");
    // Orchestrator must NOT have edit/write tools
    expect(orchestrator?.content).not.toContain("- Edit");
    expect(orchestrator?.content).not.toContain("- Write");
    expect(orchestrator?.content).not.toContain("- MultiEdit");

    const backend = files.find((f) => f.relativePath === ".claude/agents/backend.md");
    expect(backend?.content).toContain("- Edit");
    expect(backend?.content).toContain("- Write");

    const security = files.find((f) => f.relativePath === ".claude/agents/security-review.md");
    expect(security?.content).not.toContain("- Edit");
    expect(security?.content).not.toContain("- Write");
  });
});
