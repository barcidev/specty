import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createEmptyManifest,
  loadManifest,
  saveManifest,
  updateManifestEntry,
} from "../../../src/core/manifest.js";

describe("core/manifest", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-manifest-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty manifest when none exists", async () => {
    const manifest = await loadManifest(tempDir);
    expect(manifest.version).toBe(1);
    expect(Object.keys(manifest.files)).toHaveLength(0);
  });

  it("saves and reloads manifest entries", async () => {
    const manifest = createEmptyManifest();
    updateManifestEntry(manifest, {
      path: "AGENTS.md",
      adapter: "antigravity",
      language: "es",
      baseHash: "abcdef12",
      blocks: { core: "12345678" },
    });

    await saveManifest(tempDir, manifest);

    const reloaded = await loadManifest(tempDir);
    expect(reloaded.files["AGENTS.md"]).toBeDefined();
    expect(reloaded.files["AGENTS.md"]?.baseHash).toBe("abcdef12");
    expect(reloaded.files["AGENTS.md"]?.blocks?.core).toBe("12345678");
  });
});
