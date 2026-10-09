import fs from "node:fs/promises";
import path from "node:path";
import type { SupportedLanguage } from "./i18n.js";
import { assertSafeRepoPath, normalizePath } from "./paths.js";

export interface ManifestFileEntry {
  path: string;
  adapter?: string;
  template?: string;
  language: SupportedLanguage;
  baseHash: string;
  blocks?: Record<string, string>;
}

export interface SpectyManifest {
  version: number;
  lastSync: string;
  files: Record<string, ManifestFileEntry>;
}

export const MANIFEST_VERSION = 1;
export const MANIFEST_RELATIVE_PATH = ".specty/manifest.json";

export function createEmptyManifest(): SpectyManifest {
  return {
    version: MANIFEST_VERSION,
    lastSync: new Date().toISOString(),
    files: {},
  };
}

export async function loadManifest(repoRoot: string): Promise<SpectyManifest> {
  const manifestPath = path.join(repoRoot, MANIFEST_RELATIVE_PATH);
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as SpectyManifest;
    return parsed;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyManifest();
    }
    throw err;
  }
}

export async function saveManifest(repoRoot: string, manifest: SpectyManifest): Promise<void> {
  const manifestPath = assertSafeRepoPath(repoRoot, MANIFEST_RELATIVE_PATH);
  manifest.lastSync = new Date().toISOString();
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

export function updateManifestEntry(manifest: SpectyManifest, entry: ManifestFileEntry): void {
  const normalizedPath = normalizePath(entry.path);
  manifest.files[normalizedPath] = {
    ...entry,
    path: normalizedPath,
  };
}
