import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig, saveConfig } from "../../../src/core/config.js";
import { initGitRepo } from "../../../src/core/git.js";
import {
  generatePullRequest,
  parseProposalContent,
  parseTasksContent,
} from "../../../src/governance/pr-generator.js";

describe("pr-generator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-pr-gen-test-"));
    await initGitRepo(tmpDir, "main");

    await execa("git", ["config", "user.name", "Tester"], { cwd: tmpDir });
    await execa("git", ["config", "user.email", "tester@specty.local"], { cwd: tmpDir });

    await fs.writeFile(path.join(tmpDir, "README.md"), "# Initial Commit\n", "utf8");
    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "chore: initial commit"], { cwd: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("parses proposal content correctly", () => {
    const raw = `# Change: User Authentication System

## Why
Users need a secure way to authenticate using email and password.

## What Changes
- Implements JWT token issuing
- Adds bcrypt password hashing

## Acceptance Criteria
- [x] Login returns valid token
- [ ] Invalid credentials return 401
`;
    const parsed = parseProposalContent(raw);
    expect(parsed.title).toBe("User Authentication System");
    expect(parsed.why).toContain("Users need a secure way");
    expect(parsed.whatChanges).toContain("Implements JWT token issuing");
    expect(parsed.acceptanceCriteria).toHaveLength(2);
    expect(parsed.acceptanceCriteria?.[0]).toBe("Login returns valid token");
  });

  it("parses tasks content extracting status, role and files", () => {
    const raw = `## 1. Backend Core
- [x] 1.1 Create auth controller [agent: backend] [files: src/auth.ts, src/jwt.ts]
- [ ] 1.2 Add rate limiting <!-- role: security --> [files: src/rate-limit.ts]
`;
    const tasks = parseTasksContent(raw);
    expect(tasks).toHaveLength(2);

    expect(tasks[0]?.id).toBe("1.1");
    expect(tasks[0]?.description).toContain("Create auth controller");
    expect(tasks[0]?.completed).toBe(true);
    expect(tasks[0]?.role).toBe("backend");
    expect(tasks[0]?.files).toEqual(["src/auth.ts", "src/jwt.ts"]);
    expect(tasks[0]?.section).toBe("1. Backend Core");

    expect(tasks[1]?.id).toBe("1.2");
    expect(tasks[1]?.completed).toBe(false);
    expect(tasks[1]?.role).toBe("security");
    expect(tasks[1]?.files).toEqual(["src/rate-limit.ts"]);
  });

  it("generates detailed pull request document for a feature branch", async () => {
    const config = createDefaultConfig({
      git: { workflow: "feature-branch" },
    });
    await saveConfig(tmpDir, config);

    // Switch to feature branch
    await execa("git", ["checkout", "-b", "feature/multi-face-push-pull"], { cwd: tmpDir });

    // Setup active change directory
    const changeDir = path.join(tmpDir, "openspec", "changes", "multi-face-push-pull");
    await fs.mkdir(changeDir, { recursive: true });

    const proposalMd = `# Change: Multi-Face Push-Pull Tool

## Why
Permitir a los usuarios extruir múltiples caras simultáneamente en el modelador 3D.

## What Changes
Implementa selección múltiple de caras coplanares y cálculo de extrusión uniforme.

## Acceptance Criteria
- [ ] Selección de múltiples caras coplanares
- [ ] Extrusión sincronizada sin solapamiento
`;
    const tasksMd = `## 1. Implementación de Selección
- [x] 1.1 Agregar soporte de raycast múltiple [agent: 3d-engine] [files: src/engine/raycast.ts]
- [x] 1.2 Calcular vector normal promedio [agent: math] [files: src/math/normals.ts]
`;
    await fs.writeFile(path.join(changeDir, "proposal.md"), proposalMd, "utf8");
    await fs.writeFile(path.join(changeDir, "tasks.md"), tasksMd, "utf8");

    // Add source code in the branch
    const srcDir = path.join(tmpDir, "src", "engine");
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(srcDir, "raycast.ts"), "export const raycast = true;\n", "utf8");

    await execa("git", ["add", "."], { cwd: tmpDir });
    await execa("git", ["commit", "-m", "feat(engine): add multi raycast"], { cwd: tmpDir });

    const pr = await generatePullRequest(tmpDir, "multi-face-push-pull");

    expect(pr.changeId).toBe("multi-face-push-pull");
    expect(pr.title).toBe("feat(multi-face-push-pull): Multi-Face Push-Pull Tool");
    expect(pr.sourceBranch).toBe("feature/multi-face-push-pull");
    expect(pr.targetBranch).toBe("main");
    expect(pr.ghCommand).toContain("gh pr create");
    expect(pr.ghCommand).toContain('--base "main"');
    expect(pr.ghCommand).toContain('--head "feature/multi-face-push-pull"');

    // Verify sections in markdown
    expect(pr.markdown).toContain("# feat(multi-face-push-pull): Multi-Face Push-Pull Tool");
    expect(pr.markdown).toContain("## 🎯 Objetivo y Contexto (Why)");
    expect(pr.markdown).toContain(
      "Permitir a los usuarios extruir múltiples caras simultáneamente",
    );
    expect(pr.markdown).toContain("## 🚀 Cambios Implementados (What Changes)");
    expect(pr.markdown).toContain("## 📋 Tareas Ejecutadas y Trazabilidad");
    expect(pr.markdown).toContain("1.1");
    expect(pr.markdown).toContain("`@3d-engine`");
    expect(pr.markdown).toContain("`src/engine/raycast.ts`");
    expect(pr.markdown).toContain("## 📂 Archivos Modificados en la Rama");
    expect(pr.markdown).toContain("## 🧪 Pruebas y Certificación de Calidad");
    expect(pr.markdown).toContain("## 🔍 Checklist para el Revisor");

    // Verify persisted files
    const persistedPr = await fs.readFile(
      path.join(tmpDir, ".specty", "pull-requests", "multi-face-push-pull.md"),
      "utf8",
    );
    expect(persistedPr).toBe(pr.markdown);

    const changePr = await fs.readFile(path.join(changeDir, "PULL_REQUEST.md"), "utf8");
    expect(changePr).toBe(pr.markdown);
  });

  it("finds change in archive directory when generating PR after archiving", async () => {
    // Setup archived change directory
    const archiveDir = path.join(tmpDir, "openspec", "changes", "archive", "archived-feature");
    await fs.mkdir(archiveDir, { recursive: true });

    await fs.writeFile(
      path.join(archiveDir, "proposal.md"),
      "# Change: Archived Feature\n\n## Why\nArchived explanation.\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(archiveDir, "tasks.md"),
      "## 1. Done\n- [x] 1.1 Complete archived work\n",
      "utf8",
    );

    const pr = await generatePullRequest(tmpDir, "archived-feature");
    expect(pr.changeId).toBe("archived-feature");
    expect(pr.markdown).toContain("Archived explanation.");
    expect(pr.markdown).toContain("Complete archived work");

    const archivedPrExists = await fs
      .stat(path.join(archiveDir, "PULL_REQUEST.md"))
      .then(() => true)
      .catch(() => false);
    expect(archivedPrExists).toBe(true);
  });
});
