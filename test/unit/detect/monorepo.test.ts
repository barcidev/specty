import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultDetectorRegistry, detectMonorepo } from "../../../src/detect/index.js";

describe("detect/monorepo", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-monorepo-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("detects npm / Turborepo monorepo with multiple scopes", async () => {
    // Root package.json + turbo.json
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ workspaces: ["apps/*", "packages/*"] }),
    );
    await fs.writeFile(path.join(tempDir, "turbo.json"), "{}");

    // apps/web (Angular)
    await fs.mkdir(path.join(tempDir, "apps", "web"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "apps", "web", "package.json"),
      JSON.stringify({ dependencies: { "@angular/core": "^19.0.0" } }),
    );
    await fs.writeFile(path.join(tempDir, "apps", "web", "angular.json"), "{}");

    // apps/api (NestJS)
    await fs.mkdir(path.join(tempDir, "apps", "api"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "apps", "api", "package.json"),
      JSON.stringify({ dependencies: { "@nestjs/core": "^10.0.0" } }),
    );
    await fs.writeFile(path.join(tempDir, "apps", "api", "nest-cli.json"), "{}");

    const monorepo = await detectMonorepo(tempDir);
    expect(monorepo.isMonorepo).toBe(true);
    expect(monorepo.kind).toBe("turbo");
    expect(monorepo.packagePaths).toContain("apps/api");
    expect(monorepo.packagePaths).toContain("apps/web");

    const repoResult = await defaultDetectorRegistry.detectRepository(tempDir);
    expect(repoResult.layout).toBe("monorepo");
    expect(repoResult.scopes).toHaveLength(2);

    const apiScope = repoResult.scopes.find((s) => s.path === "apps/api");
    expect(apiScope?.stack.frameworks).toContain("nest");

    const webScope = repoResult.scopes.find((s) => s.path === "apps/web");
    expect(webScope?.stack.frameworks).toContain("angular");
  });

  it("detects Melos Dart monorepo", async () => {
    await fs.writeFile(
      path.join(tempDir, "melos.yaml"),
      "name: my_workspace\npackages:\n  - packages/*\n",
    );
    await fs.mkdir(path.join(tempDir, "packages", "core"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "packages", "core", "pubspec.yaml"), "name: core\n");

    const monorepo = await detectMonorepo(tempDir);
    expect(monorepo.isMonorepo).toBe(true);
    expect(monorepo.kind).toBe("melos");
    expect(monorepo.packagePaths).toContain("packages/core");
  });

  it("detects Cargo workspace monorepo", async () => {
    await fs.writeFile(
      path.join(tempDir, "Cargo.toml"),
      '[workspace]\nmembers = [\n    "crates/*",\n]\n',
    );
    await fs.mkdir(path.join(tempDir, "crates", "engine"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "crates", "engine", "Cargo.toml"),
      '[package]\nname = "engine"\nversion = "0.1.0"\n',
    );

    const monorepo = await detectMonorepo(tempDir);
    expect(monorepo.isMonorepo).toBe(true);
    expect(monorepo.kind).toBe("cargo");
    expect(monorepo.packagePaths).toContain("crates/engine");
  });
});
