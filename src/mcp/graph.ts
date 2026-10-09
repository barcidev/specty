import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import fg from "fast-glob";
import { computeShortHash } from "../core/markers.js";

const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire("node:sqlite") as {
  DatabaseSync: typeof DatabaseSyncType;
};

export interface SymbolRecord {
  id: string;
  filePath: string;
  name: string;
  kind: "function" | "class" | "interface" | "type" | "variable";
  line: number;
}

export interface DependencyRecord {
  sourceFile: string;
  targetSpecifier: string;
}

export class CodeGraph {
  private db: DatabaseSyncType;

  constructor(dbPath: string = ":memory:") {
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        language TEXT,
        size_bytes INTEGER,
        hash TEXT
      );

      CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        file_path TEXT,
        name TEXT,
        kind TEXT,
        line INTEGER
      );

      CREATE TABLE IF NOT EXISTS dependencies (
        source_file TEXT,
        target_specifier TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
      CREATE INDEX IF NOT EXISTS idx_deps_source ON dependencies(source_file);
    `);
  }

  indexFile(filePath: string, content: string): void {
    const hash = computeShortHash(content);
    const sizeBytes = Buffer.byteLength(content, "utf8");
    const ext = path.extname(filePath).toLowerCase();
    const language = ext.replace(/^\./, "");

    // 1. Insert or replace file record
    const insertFile = this.db.prepare(`
      INSERT OR REPLACE INTO files (path, language, size_bytes, hash)
      VALUES (?, ?, ?, ?)
    `);
    insertFile.run(filePath, language, sizeBytes, hash);

    // 2. Clear previous symbols & deps for this file
    const clearSymbols = this.db.prepare("DELETE FROM symbols WHERE file_path = ?");
    clearSymbols.run(filePath);

    const clearDeps = this.db.prepare("DELETE FROM dependencies WHERE source_file = ?");
    clearDeps.run(filePath);

    // 3. Extract symbols & dependencies
    const lines = content.split("\n");
    const insertSymbol = this.db.prepare(`
      INSERT OR REPLACE INTO symbols (id, file_path, name, kind, line)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertDep = this.db.prepare(`
      INSERT INTO dependencies (source_file, target_specifier)
      VALUES (?, ?)
    `);

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const trimmed = lineText.trim();

      // Functions: function foo(...) or const foo = (...) =>
      const fnMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/);
      if (fnMatch?.[1]) {
        insertSymbol.run(`${filePath}:${fnMatch[1]}`, filePath, fnMatch[1], "function", lineNum);
      }

      // Classes: class Bar
      const classMatch = trimmed.match(/(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/);
      if (classMatch?.[1]) {
        insertSymbol.run(`${filePath}:${classMatch[1]}`, filePath, classMatch[1], "class", lineNum);
      }

      // Interfaces: interface Baz
      const ifaceMatch = trimmed.match(/(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/);
      if (ifaceMatch?.[1]) {
        insertSymbol.run(
          `${filePath}:${ifaceMatch[1]}`,
          filePath,
          ifaceMatch[1],
          "interface",
          lineNum,
        );
      }

      // Types: type Qux =
      const typeMatch = trimmed.match(/(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/);
      if (typeMatch?.[1]) {
        insertSymbol.run(`${filePath}:${typeMatch[1]}`, filePath, typeMatch[1], "type", lineNum);
      }

      // Dependencies: import ... from "..." or require("...")
      const importMatch = trimmed.match(
        /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/,
      );
      const specifier = importMatch?.[1] || importMatch?.[2];
      if (specifier) {
        insertDep.run(filePath, specifier);
      }
    });
  }

  async indexDirectory(
    repoRoot: string,
    patterns: string[] = ["src/**/*.{ts,js,tsx,jsx,py,dart,cs}"],
  ): Promise<number> {
    const matchedFiles = await fg(patterns, {
      cwd: repoRoot,
      onlyFiles: true,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    });

    for (const relFile of matchedFiles) {
      const fullPath = path.join(repoRoot, relFile);
      const content = await fs.readFile(fullPath, "utf8");
      this.indexFile(relFile, content);
    }

    return matchedFiles.length;
  }

  findSymbols(query: string, limit = 20): SymbolRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, file_path as filePath, name, kind, line
      FROM symbols
      WHERE name LIKE ?
      LIMIT ?
    `);
    return stmt.all(`%${query}%`, limit) as unknown as SymbolRecord[];
  }

  getDependencies(filePath: string): string[] {
    const stmt = this.db.prepare(`
      SELECT target_specifier as targetSpecifier
      FROM dependencies
      WHERE source_file = ?
    `);
    const rows = stmt.all(filePath) as unknown as { targetSpecifier: string }[];
    return rows.map((r) => r.targetSpecifier);
  }

  getStats(): { filesCount: number; symbolsCount: number; depsCount: number } {
    const fRow = this.db.prepare("SELECT count(*) as count FROM files").get() as
      | { count: number }
      | undefined;
    const sRow = this.db.prepare("SELECT count(*) as count FROM symbols").get() as
      | { count: number }
      | undefined;
    const dRow = this.db.prepare("SELECT count(*) as count FROM dependencies").get() as
      | { count: number }
      | undefined;

    return {
      filesCount: Number(fRow?.count ?? 0),
      symbolsCount: Number(sRow?.count ?? 0),
      depsCount: Number(dRow?.count ?? 0),
    };
  }

  close(): void {
    this.db.close();
  }
}
