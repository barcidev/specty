import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";
import { executeApprove } from "../../src/cli/commands/approve.js";
import { executeDoctor } from "../../src/cli/commands/doctor.js";
import { executeInit } from "../../src/cli/commands/init.js";
import { defaultDetectorRegistry } from "../../src/detect/detector-registry.js";
import { checkApprovalGate } from "../../src/governance/check-approval.js";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

describe("E2E Fixtures Matrix", () => {
  const stackExpectations = [
    {
      fixture: "angular-app",
      expectedLang: "typescript",
      expectedFramework: "angular",
      sampleFileToTouch: "src/app/app.component.ts",
    },
    {
      fixture: "react-vite",
      expectedLang: "typescript",
      expectedFramework: "react",
      sampleFileToTouch: "src/App.tsx",
    },
    {
      fixture: "nextjs-app",
      expectedLang: "typescript",
      expectedFramework: "next",
      sampleFileToTouch: "app/page.tsx",
    },
    {
      fixture: "nestjs-prisma",
      expectedLang: "typescript",
      expectedFramework: "nest",
      sampleFileToTouch: "src/main.ts",
    },
    {
      fixture: "django-app",
      expectedLang: "python",
      expectedFramework: "django",
      sampleFileToTouch: "app/views.py",
    },
    {
      fixture: "fastapi-app",
      expectedLang: "python",
      expectedFramework: "fastapi",
      sampleFileToTouch: "app/main.py",
    },
    {
      fixture: "go-service",
      expectedLang: "go",
      expectedFramework: "gin",
      sampleFileToTouch: "main.go",
    },
    {
      fixture: "dotnet-webapi",
      expectedLang: "csharp",
      expectedFramework: "aspnet-core",
      sampleFileToTouch: "Program.cs",
    },
    {
      fixture: "flutter-app",
      expectedLang: "dart",
      expectedFramework: "flutter",
      sampleFileToTouch: "lib/main.dart",
    },
    {
      fixture: "spring-boot-maven",
      expectedLang: "java",
      expectedFramework: "spring-boot",
      sampleFileToTouch: "src/main/java/com/example/demo/Application.java",
    },
    {
      fixture: "ktor-gradle",
      expectedLang: "kotlin",
      expectedFramework: "ktor",
      sampleFileToTouch: "src/main/kotlin/com/example/Application.kt",
    },
    {
      fixture: "rails-app",
      expectedLang: "ruby",
      expectedFramework: "rails",
      sampleFileToTouch: "config/application.rb",
    },
    {
      fixture: "laravel-app",
      expectedLang: "php",
      expectedFramework: "laravel",
      sampleFileToTouch: "artisan",
    },
    {
      fixture: "rust-cli",
      expectedLang: "rust",
      expectedFramework: "actix-web",
      sampleFileToTouch: "src/main.rs",
    },
    {
      fixture: "cpp-cmake",
      expectedLang: "cpp",
      expectedFramework: "cmake",
      sampleFileToTouch: "src/main.cpp",
    },
  ];

  describe("1. Static Detection Across Stacks", () => {
    for (const item of stackExpectations) {
      it(`detects correctly stack: ${item.fixture}`, async () => {
        const fixturePath = path.join(FIXTURES_DIR, item.fixture);
        const result = await defaultDetectorRegistry.detectRepository(fixturePath);

        expect(result.scopes.length).toBeGreaterThanOrEqual(1);
        const primary = result.scopes[0].stack;
        expect(primary.language).toBe(item.expectedLang);
        expect(primary.frameworks).toContain(item.expectedFramework);
      });
    }

    it("detects polyglot monorepo with multiple scopes", async () => {
      const monorepoPath = path.join(FIXTURES_DIR, "monorepo-polyglot");
      const result = await defaultDetectorRegistry.detectRepository(monorepoPath);

      expect(result.monorepo.isMonorepo).toBe(true);
      expect(result.monorepo.kind).toBe("pnpm");
      expect(result.scopes.length).toBeGreaterThanOrEqual(2);

      const languages = result.scopes.map((s) => s.stack.language);
      expect(languages).toContain("typescript");
      expect(languages).toContain("go");
    });
  });

  describe("2. Full Governed Lifecycle Across Stacks", () => {
    // We test full init -> touch file -> gate fail -> approve -> gate pass -> doctor on representative stacks
    const representativeNames = new Set([
      "angular-app",
      "go-service",
      "fastapi-app",
      "dotnet-webapi",
      "rust-cli",
    ]);
    const representativeStacks = stackExpectations.filter((s) =>
      representativeNames.has(s.fixture),
    );

    for (const item of representativeStacks) {
      it(`runs init, governance gate and doctor in ${item.fixture}`, async () => {
        const fixturePath = path.join(FIXTURES_DIR, item.fixture);
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `specty-e2e-${item.fixture}-`));

        try {
          // Copy fixture to tempDir
          await fs.cp(fixturePath, tempDir, { recursive: true });

          // Initialize git
          await execa("git", ["init", "-b", "main"], { cwd: tempDir });
          await execa("git", ["config", "user.name", "Tester"], { cwd: tempDir });
          await execa("git", ["config", "user.email", "tester@specty.dev"], { cwd: tempDir });
          await execa("git", ["add", "."], { cwd: tempDir });
          await execa("git", ["commit", "-m", "chore: initial commit"], { cwd: tempDir });

          // 1. specty init
          const initResult = await executeInit({
            cwd: tempDir,
            yes: true,
            lang: "es",
            specEngine: "builtin",
            tool: ["antigravity", "cursor"],
          });

          expect(initResult.applied).toBe(true);
          expect(initResult.language).toBe("es");

          // Verify config exists
          const configStat = await fs.stat(path.join(tempDir, ".specty", "config.yaml"));
          expect(configStat.isFile()).toBe(true);

          // 2. specty doctor on pristine init
          const doctorResult = await executeDoctor({ cwd: tempDir });
          expect(doctorResult.healthy).toBe(true);

          // 3. Touch governed code file and stage
          const targetFile = path.join(tempDir, item.sampleFileToTouch);
          await fs.appendFile(targetFile, "\n// modification by agent\n", "utf8");
          await execa("git", ["add", item.sampleFileToTouch], { cwd: tempDir });

          // 4. Pre-commit Gate must fail because there is no approved change
          const gateFail = await checkApprovalGate(tempDir, { stagedOnly: true });
          expect(gateFail.passed).toBe(false);

          // 5. Create specification change
          const changeDir = path.join(tempDir, "openspec", "changes", "001-feature-test");
          await fs.mkdir(changeDir, { recursive: true });
          await fs.writeFile(
            path.join(changeDir, "proposal.md"),
            "# Proposal: Test Feature\n\n## Why\nTest feature.\n\n## What Changes\n- Change code\n\n## Impact\n- Tests\n",
            "utf8",
          );
          await fs.writeFile(
            path.join(changeDir, "tasks.md"),
            "# Tasks: Test Feature\n\n## 1. Implementation\n- [ ] 1.1 Implement work\n",
            "utf8",
          );

          // 6. Approve change
          const approved = await executeApprove("001-feature-test", {
            cwd: tempDir,
            yes: true,
            user: "lead-reviewer",
          });
          expect(approved).toBe(true);

          // 7. Pre-commit Gate must now pass
          const gatePass = await checkApprovalGate(tempDir, { stagedOnly: true });
          expect(gatePass.passed).toBe(true);
          expect(gatePass.activeApprovedChange).toBe("001-feature-test");
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });
    }
  });
});
