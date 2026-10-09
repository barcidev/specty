import crypto from "node:crypto";

export type MarkerFormat = "markdown" | "yaml";

export interface ManagedBlock {
  id: string;
  hash: string;
  content: string;
  rawBlock: string;
  isModifiedByUser: boolean;
}

/**
 * Normalizes content by converting CRLF to LF and trimming trailing whitespace from lines.
 */
export function normalizeContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/**
 * Computes an 8-character sha256 hash of normalized content.
 */
export function computeShortHash(content: string): string {
  const normalized = normalizeContent(content);
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 8);
}

/**
 * Wraps content in specty managed block markers.
 */
export function wrapWithMarkers(
  blockId: string,
  content: string,
  format: MarkerFormat = "markdown",
): string {
  const hash = computeShortHash(content);
  const cleanContent = content.trim();

  if (format === "yaml") {
    return `# specty:begin id=${blockId} hash=${hash}\n${cleanContent}\n# specty:end id=${blockId}`;
  }

  return `<!-- specty:begin id=${blockId} hash=${hash} -->\n${cleanContent}\n<!-- specty:end id=${blockId} -->`;
}

/**
 * Extracts all managed blocks from file content.
 */
export function extractManagedBlocks(
  content: string,
  format: MarkerFormat = "markdown",
): ManagedBlock[] {
  const blocks: ManagedBlock[] = [];
  const normalized = content.replace(/\r\n/g, "\n");

  const regex =
    format === "yaml"
      ? /# specty:begin id=([a-zA-Z0-9_-]+) hash=([a-f0-9]+)\n([\s\S]*?)\n# specty:end id=\1/g
      : /<!-- specty:begin id=([a-zA-Z0-9_-]+) hash=([a-f0-9]+) -->\n([\s\S]*?)\n<!-- specty:end id=\1 -->/g;

  let match: RegExpExecArray | null;
  while (true) {
    match = regex.exec(normalized);
    if (!match) {
      break;
    }

    const id = match[1] ?? "";
    const originalHash = match[2] ?? "";
    const blockContent = match[3] ?? "";
    const currentHash = computeShortHash(blockContent);

    blocks.push({
      id,
      hash: originalHash,
      content: blockContent,
      rawBlock: match[0],
      isModifiedByUser: originalHash !== currentHash,
    });
  }

  return blocks;
}

/**
 * Replaces a managed block in content with new generated content.
 * If the user has manually modified the block, it preserves the user edit unless force is true.
 */
export function replaceManagedBlock(
  fullContent: string,
  blockId: string,
  newContent: string,
  format: MarkerFormat = "markdown",
  force = false,
): { updatedContent: string; modifiedByUser: boolean; replaced: boolean } {
  const blocks = extractManagedBlocks(fullContent, format);
  const targetBlock = blocks.find((b) => b.id === blockId);

  if (!targetBlock) {
    return { updatedContent: fullContent, modifiedByUser: false, replaced: false };
  }

  if (targetBlock.isModifiedByUser && !force) {
    return { updatedContent: fullContent, modifiedByUser: true, replaced: false };
  }

  const replacement = wrapWithMarkers(blockId, newContent, format);
  const updatedContent = fullContent.replace(targetBlock.rawBlock, replacement);

  return { updatedContent, modifiedByUser: targetBlock.isModifiedByUser, replaced: true };
}
