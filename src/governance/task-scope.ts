import ignore from "ignore";

export interface ParsedTaskItem {
  id: string;
  description: string;
  completed: boolean;
  role: string | null;
  filesGlobs: string[];
  verifyCommand: string | null;
}

/**
 * Parses markdown tasks.md content to extract tasks with id, role, file globs, and verify commands.
 */
export function parseTasksWithScope(tasksContent: string): ParsedTaskItem[] {
  const items: ParsedTaskItem[] = [];
  const lines = tasksContent.split("\n");
  const checkboxRegex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const match = line.match(checkboxRegex);
    if (!match) continue;

    const completed = (match[1] ?? "").toLowerCase() === "x";
    const rawDescription = (match[2] ?? "").trim();

    // Look for ID in description (e.g., "1.1 Task name" or index fallback)
    const idMatch = rawDescription.match(/^(\d+(?:\.\d+)*)\s+/);
    const taskId = idMatch ? (idMatch[1] ?? `${items.length + 1}`) : `${items.length + 1}`;

    // Extract [agent: <role>]
    const agentMatch = rawDescription.match(/\[agent:\s*([^\]]+)\]/i);
    const role = agentMatch ? (agentMatch[1] ?? "").trim().toLowerCase() : null;

    // Extract [files: <glob1>, <glob2>]
    const filesMatch = rawDescription.match(/\[files:\s*([^\]]+)\]/i);
    const filesGlobs: string[] = [];
    if (filesMatch?.[1]) {
      const parts = filesMatch[1].split(",");
      for (const part of parts) {
        const cleaned = part.trim().replace(/^['"]|['"]$/g, "");
        if (cleaned) {
          filesGlobs.push(cleaned);
        }
      }
    }

    // Look for verification command on subsequent lines before next item/header
    let verifyCmd: string | null = null;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const nextLine = lines[j] ?? "";
      const verifyMatch = nextLine.match(/^\s+verify:\s*(\S.*)$/i);
      if (verifyMatch) {
        verifyCmd = (verifyMatch[1] ?? "").trim();
        break;
      }
      if (/^\s*-\s*\[/i.test(nextLine) || /^##/i.test(nextLine)) {
        break;
      }
    }

    items.push({
      id: taskId,
      description: rawDescription,
      completed,
      role,
      filesGlobs,
      verifyCommand: verifyCmd,
    });
  }

  return items;
}

/**
 * Returns the first incomplete task, representing the currently active work item.
 */
export function getActiveTask(tasks: ParsedTaskItem[]): ParsedTaskItem | null {
  return tasks.find((t) => !t.completed) ?? null;
}

/**
 * Aggregates all file scope globs across all tasks in a change.
 */
export function getAllTasksFileGlobs(tasks: ParsedTaskItem[]): string[] {
  const globs = new Set<string>();
  for (const t of tasks) {
    for (const g of t.filesGlobs) {
      globs.add(g);
    }
  }
  return Array.from(globs);
}

/**
 * Normalizes relative path to forward slashes without leading ./
 */
export function normalizeRelativePath(p: string): string {
  const norm = p.replace(/\\/g, "/").replace(/^\.\//, "");
  return norm.startsWith("/") ? norm.slice(1) : norm;
}

/**
 * Checks whether a given relative file path matches any of the globs using gitignore matching rules.
 */
export function isPathMatchingGlobs(filePath: string, globs: string[]): boolean {
  if (!globs || globs.length === 0) {
    return false;
  }

  const normalized = normalizeRelativePath(filePath);
  const ig = ignore();

  for (const glob of globs) {
    const cleanGlob = glob.trim().replace(/^['"]|['"]$/g, "");
    if (!cleanGlob) continue;
    // Direct equality match
    if (normalizeRelativePath(cleanGlob) === normalized) {
      return true;
    }
    ig.add(cleanGlob);
  }

  try {
    return ig.ignores(normalized);
  } catch {
    return false;
  }
}
