import { describe, expect, it } from "vitest";
import { createUnifiedDiff, hasDifferences } from "../../../src/core/diff.js";

describe("core/diff", () => {
  it("detects differences accurately", () => {
    expect(hasDifferences("hello", "hello")).toBe(false);
    expect(hasDifferences("hello", "world")).toBe(true);
  });

  it("produces standard unified diff output", () => {
    const oldStr = "line 1\nline 2\n";
    const newStr = "line 1\nline 2 modified\n";
    const diffText = createUnifiedDiff(oldStr, newStr, "test.md");

    expect(diffText).toContain("--- test.md");
    expect(diffText).toContain("+++ test.md");
    expect(diffText).toContain("-line 2");
    expect(diffText).toContain("+line 2 modified");
  });
});
