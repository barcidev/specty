import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initGitRepo } from "../../../src/core/git.js";
import {
  checkGitHooksStatus,
  detectHookManagers,
  detectPrimaryHookManager,
  installGitHooks,
  installHookWithManager,
  uninstallGitHooks,
} from "../../../src/governance/git-hooks.js";
import {
  installHuskyHook,
  isHuskyConfigured,
  uninstallHuskyHook,
} from "../../../src/governance/hook-managers/husky.js";
import {
  installLefthookHook,
  isLefthookConfigured,
  uninstallLefthookHook,
} from "../../../src/governance/hook-managers/lefthook.js";
import {
  hasCustomNativeHook,
  installNativeHook,
  uninstallNativeHook,
} from "../../../src/governance/hook-managers/native.js";
import {
  installSimpleGitHooks,
  uninstallSimpleGitHooks,
} from "../../../src/governance/hook-managers/simple-git-hooks.js";

describe("Git Hook Managers Coexistence", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-hook-managers-test-"));
    await initGitRepo(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("Husky Manager", () => {
    it("detects Husky when .husky directory is present", async () => {
      await fs.mkdir(path.join(tmpDir, ".husky"), { recursive: true });
      expect(await isHuskyConfigured(tmpDir)).toBe(true);

      const managers = await detectHookManagers(tmpDir);
      expect(managers.some((m) => m.type === "husky")).toBe(true);
    });

    it("detects Husky via package.json devDependencies", async () => {
      await fs.writeFile(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ devDependencies: { husky: "^9.0.0" } }),
      );
      expect(await isHuskyConfigured(tmpDir)).toBe(true);
    });

    it("creates .husky/pre-commit if it does not exist", async () => {
      const res = await installHuskyHook(tmpDir);
      expect(res.success).toBe(true);
      expect(res.action).toBe("created");

      const hookContent = await fs.readFile(path.join(tmpDir, ".husky/pre-commit"), "utf8");
      expect(hookContent).toContain("npx specty check-approval --staged");
    });

    it("injects into existing .husky/pre-commit preserving existing user commands", async () => {
      const huskyDir = path.join(tmpDir, ".husky");
      await fs.mkdir(huskyDir, { recursive: true });
      await fs.writeFile(path.join(huskyDir, "pre-commit"), "npm run test\nnpx lint-staged\n");

      const res = await installHuskyHook(tmpDir);
      expect(res.success).toBe(true);
      expect(res.action).toBe("appended");

      const hookContent = await fs.readFile(path.join(huskyDir, "pre-commit"), "utf8");
      expect(hookContent).toContain("npm run test");
      expect(hookContent).toContain("npx lint-staged");
      expect(hookContent).toContain("npx specty check-approval --staged");

      // Idempotency: second install should not duplicate
      const secondRes = await installHuskyHook(tmpDir);
      expect(secondRes.action).toBe("already-installed");
    });

    it("uninstalls Specty cleanly from .husky/pre-commit preserving remaining commands", async () => {
      const huskyDir = path.join(tmpDir, ".husky");
      await fs.mkdir(huskyDir, { recursive: true });
      await fs.writeFile(
        path.join(huskyDir, "pre-commit"),
        "#!/usr/bin/env sh\nnpm test\n# Managed by specty (AI assistant governance)\nnpx specty check-approval --staged\n",
      );

      const uninstRes = await uninstallHuskyHook(tmpDir);
      expect(uninstRes.success).toBe(true);
      expect(uninstRes.action).toBe("removed-entry");

      const hookContent = await fs.readFile(path.join(huskyDir, "pre-commit"), "utf8");
      expect(hookContent).toContain("npm test");
      expect(hookContent).not.toContain("specty check-approval");
    });

    it("removes .husky/pre-commit completely if it was only managed by Specty", async () => {
      await installHuskyHook(tmpDir);
      const uninstRes = await uninstallHuskyHook(tmpDir);
      expect(uninstRes.success).toBe(true);
      expect(uninstRes.action).toBe("removed-file");

      const fileExists = await fs
        .access(path.join(tmpDir, ".husky/pre-commit"))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });
  });

  describe("Lefthook Manager", () => {
    it("detects Lefthook via lefthook.yml or package.json", async () => {
      await fs.writeFile(path.join(tmpDir, "lefthook.yml"), "pre-commit:\n  commands:\n");
      expect(await isLefthookConfigured(tmpDir)).toBe(true);

      const managers = await detectHookManagers(tmpDir);
      expect(managers.some((m) => m.type === "lefthook")).toBe(true);
    });

    it("creates lefthook.yml with Specty pre-commit command if missing", async () => {
      const res = await installLefthookHook(tmpDir);
      expect(res.success).toBe(true);
      expect(res.action).toBe("created");

      const content = await fs.readFile(path.join(tmpDir, "lefthook.yml"), "utf8");
      expect(content).toContain("specty:");
      expect(content).toContain("npx specty check-approval --staged");
    });

    it("updates existing lefthook.yml preserving other commands", async () => {
      const initialYaml = `pre-commit:
  commands:
    linter:
      run: npm run lint
`;
      await fs.writeFile(path.join(tmpDir, "lefthook.yml"), initialYaml, "utf8");

      const res = await installLefthookHook(tmpDir);
      expect(res.success).toBe(true);
      expect(res.action).toBe("appended");

      const content = await fs.readFile(path.join(tmpDir, "lefthook.yml"), "utf8");
      expect(content).toContain("linter:");
      expect(content).toContain("specty:");
      expect(content).toContain("npx specty check-approval --staged");

      // Idempotency
      const secondRes = await installLefthookHook(tmpDir);
      expect(secondRes.action).toBe("already-installed");
    });

    it("uninstalls Specty command from lefthook.yml preserving other commands", async () => {
      const existingYaml = `pre-commit:
  commands:
    linter:
      run: npm run lint
    specty:
      run: npx specty check-approval --staged
`;
      await fs.writeFile(path.join(tmpDir, "lefthook.yml"), existingYaml, "utf8");

      const res = await uninstallLefthookHook(tmpDir);
      expect(res.success).toBe(true);
      expect(res.action).toBe("removed-entry");

      const content = await fs.readFile(path.join(tmpDir, "lefthook.yml"), "utf8");
      expect(content).toContain("linter:");
      expect(content).not.toContain("specty:");
    });
  });

  describe("simple-git-hooks Manager", () => {
    it("updates package.json with simple-git-hooks pre-commit command", async () => {
      await fs.writeFile(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-pkg",
          "simple-git-hooks": {
            "pre-commit": "npm run test",
          },
        }),
      );

      const res = await installSimpleGitHooks(tmpDir);
      expect(res.success).toBe(true);

      const updated = JSON.parse(await fs.readFile(path.join(tmpDir, "package.json"), "utf8"));
      expect(updated["simple-git-hooks"]["pre-commit"]).toContain("npm run test");
      expect(updated["simple-git-hooks"]["pre-commit"]).toContain(
        "npx specty check-approval --staged",
      );

      const uninst = await uninstallSimpleGitHooks(tmpDir);
      expect(uninst.success).toBe(true);

      const restored = JSON.parse(await fs.readFile(path.join(tmpDir, "package.json"), "utf8"));
      expect(restored["simple-git-hooks"]["pre-commit"]).toBe("npm run test");
    });
  });

  describe("Native Git Hooks with Content Preservation", () => {
    it("installs clean native hook with start and end delimiters", async () => {
      const res = await installNativeHook(tmpDir);
      expect(res.success).toBe(true);
      expect(res.action).toBe("created");

      const content = await fs.readFile(path.join(tmpDir, ".git/hooks/pre-commit"), "utf8");
      expect(content).toContain("# >>> specty-hook >>>");
      expect(content).toContain("# <<< specty-hook <<<");
      expect(content).toContain("npx specty check-approval --staged");
    });

    it("appends delimited block to existing pre-commit without destroying user commands", async () => {
      const hooksDir = path.join(tmpDir, ".git/hooks");
      await fs.mkdir(hooksDir, { recursive: true });
      const userScript = `#!/usr/bin/env sh
echo "Custom team linting"
exit_on_fail=1
`;
      await fs.writeFile(path.join(hooksDir, "pre-commit"), userScript, "utf8");

      expect(await hasCustomNativeHook(tmpDir)).toBe(true);

      const res = await installNativeHook(tmpDir);
      expect(res.success).toBe(true);
      expect(res.action).toBe("appended");

      const content = await fs.readFile(path.join(hooksDir, "pre-commit"), "utf8");
      expect(content).toContain('echo "Custom team linting"');
      expect(content).toContain("# >>> specty-hook >>>");
      expect(content).toContain("npx specty check-approval --staged");

      // Uninstall removes only the delimited block
      const uninst = await uninstallNativeHook(tmpDir);
      expect(uninst.success).toBe(true);
      expect(uninst.action).toBe("removed-entry");

      const restored = await fs.readFile(path.join(hooksDir, "pre-commit"), "utf8");
      expect(restored).toContain('echo "Custom team linting"');
      expect(restored).not.toContain("specty-hook");
    });
  });

  describe("Orchestration & Status Detection", () => {
    it("detectPrimaryHookManager prioritizes Husky when both Husky and Git exist", async () => {
      await fs.mkdir(path.join(tmpDir, ".husky"), { recursive: true });
      const primary = await detectPrimaryHookManager(tmpDir);
      expect(primary?.type).toBe("husky");
    });

    it("installGitHooks automatically routes to Husky if Husky is present", async () => {
      await fs.mkdir(path.join(tmpDir, ".husky"), { recursive: true });
      const success = await installGitHooks(tmpDir);
      expect(success).toBe(true);

      const huskyHook = await fs.readFile(path.join(tmpDir, ".husky/pre-commit"), "utf8");
      expect(huskyHook).toContain("npx specty check-approval --staged");

      const status = await checkGitHooksStatus(tmpDir);
      expect(status.active).toBe(true);
      expect(status.manager?.type).toBe("husky");

      const uninstalled = await uninstallGitHooks(tmpDir);
      expect(uninstalled).toBe(true);
    });

    it("installHookWithManager allows forcing manager target", async () => {
      await fs.mkdir(path.join(tmpDir, ".husky"), { recursive: true });
      // Force native installation even though Husky exists
      const res = await installHookWithManager(tmpDir, { manager: "native" });
      expect(res.success).toBe(true);
      expect(res.manager).toBe("native");

      const nativeHook = await fs.readFile(path.join(tmpDir, ".git/hooks/pre-commit"), "utf8");
      expect(nativeHook).toContain("npx specty check-approval --staged");
    });
  });
});
