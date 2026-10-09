import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

/**
 * Normalizes task checkboxes in markdown so completed tasks [x]
 * match the initial [ ] state for stable content hashing.
 */
export function normalizeTasksForHashing(content: string): string {
  // Convert "- [x]" or "- [X]" to "- [ ]"
  return content
    .replace(/^(\s*-\s*\[)[xX](\]\s*)/gm, "$1 $2")
    .replace(/\r\n/g, "\n")
    .trim();
}

/**
 * Computes a deterministic SHA-256 hash for a change specification directory.
 * Includes proposal.md, tasks.md, and any specs/** files, while normalizing tasks.
 */
export async function computeChangeContentHash(changeDir: string): Promise<string> {
  const hash = crypto.createHash("sha256");

  // Relative files to include in change specification scope
  const specFiles = (
    await fg(["proposal.md", "tasks.md", "design.md", "specs/**/*.md"], {
      cwd: changeDir,
      onlyFiles: true,
    })
  ).sort();

  if (specFiles.length === 0) {
    throw new Error(`No specification files found in "${changeDir}"`);
  }

  for (const relFile of specFiles) {
    const fullPath = path.join(changeDir, relFile);
    let content = await fs.readFile(fullPath, "utf8");

    if (relFile === "tasks.md") {
      content = normalizeTasksForHashing(content);
    } else {
      content = content.replace(/\r\n/g, "\n").trim();
    }

    hash.update(`file:${relFile}\n`);
    hash.update(content);
    hash.update("\n---\n");
  }

  return hash.digest("hex");
}
