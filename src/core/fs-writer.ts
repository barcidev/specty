import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createUnifiedDiff, hasDifferences } from "./diff.js";
import { assertSafeRepoPath, isSensitivePath, normalizePath } from "./paths.js";

export interface WriteFileOptions {
  dryRun?: boolean;
  createBackup?: boolean;
  backupDirName?: string;
}

export interface WriteFileResult {
  filePath: string;
  relativePath: string;
  written: boolean;
  backedUp: boolean;
  backupPath?: string;
  diff?: string;
}

/**
 * Detects the dominant newline sequence in content (\r\n or \n).
 */
export function detectNewline(content: string): "\r\n" | "\n" {
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfCount = (content.match(/[^\r]\n/g) || []).length;
  return crlfCount > lfCount ? "\r\n" : "\n";
}

/**
 * Normalizes content to a specific newline sequence.
 */
export function applyNewline(content: string, newline: "\r\n" | "\n"): string {
  const unified = content.replace(/\r\n/g, "\n");
  if (newline === "\r\n") {
    return unified.replace(/\n/g, "\r\n");
  }
  return unified;
}

export class SafeFileWriter {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = path.resolve(repoRoot);
  }

  getRepoRoot(): string {
    return this.repoRoot;
  }

  async writeFile(
    targetRelativePath: string,
    content: string,
    options: WriteFileOptions = {},
  ): Promise<WriteFileResult> {
    const fullPath = assertSafeRepoPath(this.repoRoot, targetRelativePath);
    if (isSensitivePath(fullPath)) {
      throw new Error(
        `Security error: Attempt to write to sensitive file path "${targetRelativePath}"`,
      );
    }

    const relativePath = normalizePath(path.relative(this.repoRoot, fullPath));
    const dryRun = options.dryRun ?? false;
    const shouldBackup = options.createBackup ?? true;

    let existingContent: string | null = null;
    let existingNewline: "\r\n" | "\n" = "\n";

    try {
      existingContent = await fs.readFile(fullPath, "utf8");
      existingNewline = detectNewline(existingContent);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    const formattedContent = applyNewline(content, existingNewline);

    if (existingContent !== null && !hasDifferences(existingContent, formattedContent)) {
      return {
        filePath: fullPath,
        relativePath,
        written: false,
        backedUp: false,
      };
    }

    const diffOutput =
      existingContent !== null
        ? createUnifiedDiff(existingContent, formattedContent, relativePath)
        : createUnifiedDiff("", formattedContent, relativePath);

    if (dryRun) {
      return {
        filePath: fullPath,
        relativePath,
        written: false,
        backedUp: false,
        diff: diffOutput,
      };
    }

    let backupPath: string | undefined;
    let backedUp = false;

    if (existingContent !== null && shouldBackup) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupPath = path.join(this.repoRoot, ".specty", "backups", timestamp, relativePath);
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.writeFile(backupPath, existingContent, "utf8");
      backedUp = true;
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const tempPath = `${fullPath}.tmp.${randomSuffix}`;

    await fs.writeFile(tempPath, formattedContent, "utf8");
    await fs.rename(tempPath, fullPath);

    return {
      filePath: fullPath,
      relativePath,
      written: true,
      backedUp,
      backupPath,
      diff: diffOutput,
    };
  }
}
