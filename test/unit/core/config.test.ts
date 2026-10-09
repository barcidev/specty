import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultConfig,
  loadConfig,
  SpectyConfigSchema,
  saveConfig,
} from "../../../src/core/config.js";

describe("core/config", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-config-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("creates valid default configuration", () => {
    const config = createDefaultConfig({ language: "es" });
    expect(config.language).toBe("es");
    expect(config.spec_engine).toBe("openspec");
    expect(config.tools.length).toBeGreaterThan(5);
    expect(config.governance.hooks).toBe(true);
  });

  it("validates valid configuration via schema", () => {
    const raw = {
      version: 1,
      language: "en",
      spec_engine: "builtin",
      project: {
        kind: "new",
        layout: "monorepo",
        architecture: "clean",
      },
      scopes: [
        {
          path: "apps/api",
          stack: { language: "typescript", frameworks: ["nestjs"] },
          verify: { test: "npm test" },
        },
      ],
      tools: ["claude", "cursor"],
    };

    const parsed = SpectyConfigSchema.parse(raw);
    expect(parsed.language).toBe("en");
    expect(parsed.spec_engine).toBe("builtin");
    expect(parsed.scopes[0]?.stack.frameworks).toContain("nestjs");
  });

  it("saves and loads configuration with YAML serialization", async () => {
    const config = createDefaultConfig({
      language: "es",
      project: { kind: "existing", layout: "single" },
    });

    await saveConfig(tempDir, config);
    const loaded = await loadConfig(tempDir);

    expect(loaded.language).toBe("es");
    expect(loaded.spec_engine).toBe("openspec");
    expect(loaded.project.kind).toBe("existing");
  });
});
