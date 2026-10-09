import { describe, expect, it } from "vitest";
import {
  computeShortHash,
  extractManagedBlocks,
  normalizeContent,
  replaceManagedBlock,
  wrapWithMarkers,
} from "../../../src/core/markers.js";

describe("core/markers", () => {
  it("normalizes content across line endings and trailing whitespace", () => {
    const raw = "line 1   \r\nline 2  \r\n";
    expect(normalizeContent(raw)).toBe("line 1\nline 2");
  });

  it("computes reproducible short hashes", () => {
    const text = "Hello world from specty";
    const hash1 = computeShortHash(text);
    const hash2 = computeShortHash("Hello world from specty\r\n");
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(8);
  });

  it("wraps and extracts markdown blocks", () => {
    const content = wrapWithMarkers("rules", "Do not modify without spec", "markdown");
    expect(content).toContain("<!-- specty:begin id=rules hash=");
    expect(content).toContain("<!-- specty:end id=rules -->");

    const blocks = extractManagedBlocks(content, "markdown");
    expect(blocks.length).toBe(1);
    expect(blocks[0]?.id).toBe("rules");
    expect(blocks[0]?.content).toBe("Do not modify without spec");
    expect(blocks[0]?.isModifiedByUser).toBe(false);
  });

  it("wraps and extracts yaml blocks", () => {
    const content = wrapWithMarkers("rules", "key: value", "yaml");
    expect(content).toContain("# specty:begin id=rules hash=");
    expect(content).toContain("# specty:end id=rules");

    const blocks = extractManagedBlocks(content, "yaml");
    expect(blocks.length).toBe(1);
    expect(blocks[0]?.id).toBe("rules");
    expect(blocks[0]?.content).toBe("key: value");
    expect(blocks[0]?.isModifiedByUser).toBe(false);
  });

  it("detects manual user modifications inside a managed block", () => {
    const generated = wrapWithMarkers("core", "original rule", "markdown");
    const tampered = generated.replace("original rule", "manually edited rule");

    const blocks = extractManagedBlocks(tampered, "markdown");
    expect(blocks.length).toBe(1);
    expect(blocks[0]?.isModifiedByUser).toBe(true);
  });

  it("preserves user modifications during replace unless forced", () => {
    const generated = wrapWithMarkers("core", "original rule", "markdown");
    const fullDocument = `# Document\n\n${generated}\n\nFooter note`;
    const userEditedDoc = fullDocument.replace("original rule", "my custom edit");

    // Replace without force
    const result1 = replaceManagedBlock(
      userEditedDoc,
      "core",
      "new incoming rule",
      "markdown",
      false,
    );
    expect(result1.replaced).toBe(false);
    expect(result1.modifiedByUser).toBe(true);
    expect(result1.updatedContent).toContain("my custom edit");

    // Replace with force
    const result2 = replaceManagedBlock(
      userEditedDoc,
      "core",
      "new incoming rule",
      "markdown",
      true,
    );
    expect(result2.replaced).toBe(true);
    expect(result2.updatedContent).toContain("new incoming rule");
  });
});
