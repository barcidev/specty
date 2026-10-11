import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeInit } from "../../../src/cli/commands/init.js";
import { loadConfig } from "../../../src/core/config.js";

describe("cli/commands/init", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-cli-init-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("initializes repository with defaults in non-interactive mode", async () => {
    const res = await executeInit({
      yes: true,
      cwd: tempDir,
    });

    expect(res.applied).toBe(true);
    expect(res.canceled).toBe(false);
    expect(res.language).toBe("es");

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.language).toBe("es");
    expect(savedConfig.spec_engine).toBe("openspec");
    expect(savedConfig.tools.length).toBeGreaterThan(10);
    expect(savedConfig.governance.hooks).toBe(true);
    expect(savedConfig.governance.ci).toBe("github");
    expect(savedConfig.mcp.enabled).toBe(true);
  });

  it("honors language flag --lang en", async () => {
    const res = await executeInit({
      yes: true,
      lang: "en",
      cwd: tempDir,
    });

    expect(res.language).toBe("en");
    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.language).toBe("en");
  });

  it("does not write configuration in dry-run mode", async () => {
    const res = await executeInit({
      yes: true,
      dryRun: true,
      cwd: tempDir,
    });

    expect(res.dryRun).toBe(true);
    expect(res.applied).toBe(false);

    // .specty/config.yaml must not exist
    await expect(loadConfig(tempDir)).rejects.toThrow();
  });

  it("filters specific tools when --tool is provided", async () => {
    await executeInit({
      yes: true,
      tool: "claude,cursor",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.tools).toEqual(["claude", "cursor"]);
  });

  it("disables hooks, ci, and mcp when flags are passed", async () => {
    await executeInit({
      yes: true,
      hooks: false,
      ci: false,
      mcp: false,
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.governance.hooks).toBe(false);
    expect(savedConfig.governance.ci).toBe("none");
    expect(savedConfig.mcp.enabled).toBe(false);
  });

  it("supports --spec-engine builtin", async () => {
    await executeInit({
      yes: true,
      specEngine: "builtin",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.spec_engine).toBe("builtin");
  });

  it("detects existing stack during init and configures scope", async () => {
    await fs.writeFile(
      path.join(tempDir, "pubspec.yaml"),
      "name: flutter_app\ndependencies:\n  flutter:\n    sdk: flutter\n",
    );

    const res = await executeInit({
      yes: true,
      cwd: tempDir,
    });

    expect(res.inferredStack).toBe("dart");
    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.scopes[0]?.stack.language).toBe("dart");
    expect(savedConfig.scopes[0]?.stack.frameworks).toContain("flutter");
  });

  it("configures default git workflow and commit convention in config and generates rules", async () => {
    await executeInit({
      yes: true,
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.git.workflow).toBe("feature-branch");
    expect(savedConfig.git.commit_convention).toBe("conventional");

    const ruleFile = await fs.readFile(path.join(tempDir, ".specty/rules/core/git.md"), "utf8");
    expect(ruleFile).toContain("Feature Branch Workflow");
    expect(ruleFile).toContain("Conventional Commits");
  });

  it("configures custom git workflow and hybrid commit convention via flags", async () => {
    await executeInit({
      yes: true,
      gitWorkflow: "gitflow",
      commitConvention: "gitmoji-conventional-ticket",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.git.workflow).toBe("gitflow");
    expect(savedConfig.git.commit_convention).toBe("gitmoji-conventional-ticket");

    const ruleFile = await fs.readFile(path.join(tempDir, ".specty/rules/core/git.md"), "utf8");
    expect(ruleFile).toContain("GitFlow");
    expect(ruleFile).toContain("Híbrido: Gitmoji + Conventional Commits + Tickets");
    expect(ruleFile).toContain("✨ feat(auth): [PROJ-123] add google oauth2 login");
  });

  it("initializes new project with specified language and framework", async () => {
    const res = await executeInit({
      yes: true,
      projectKind: "new",
      stack: "python",
      framework: "fastapi",
      cwd: tempDir,
    });

    expect(res.inferredStack).toBe("python");
    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.project.kind).toBe("new");
    expect(savedConfig.scopes[0]?.stack.language).toBe("python");
    expect(savedConfig.scopes[0]?.stack.frameworks).toContain("fastapi");
  });

  it("initializes new project with flutter stack and generates framework rules", async () => {
    await executeInit({
      yes: true,
      projectKind: "new",
      stack: "dart",
      framework: "flutter",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.project.kind).toBe("new");
    expect(savedConfig.scopes[0]?.stack.language).toBe("dart");
    expect(savedConfig.scopes[0]?.stack.frameworks).toContain("flutter");

    const fwRuleExists = await fs
      .access(path.join(tempDir, ".specty/rules/framework/flutter.md"))
      .then(() => true)
      .catch(() => false);
    expect(fwRuleExists).toBe(true);
  });

  it("initializes new project with nestjs framework and recommends modular architecture", async () => {
    await executeInit({
      yes: true,
      projectKind: "new",
      stack: "typescript",
      framework: "nest",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.project.kind).toBe("new");
    expect(savedConfig.project.architecture).toBe("modular");

    const fwRuleExists = await fs
      .access(path.join(tempDir, ".specty/rules/framework/nestjs.md"))
      .then(() => true)
      .catch(() => false);
    expect(fwRuleExists).toBe(true);
  });

  it("initializes new project as monolith and adapts core indications", async () => {
    await executeInit({
      yes: true,
      projectKind: "new",
      structure: "single",
      stack: "python",
      framework: "fastapi",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.project.kind).toBe("new");
    expect(savedConfig.project.layout).toBe("single");
    expect(savedConfig.scopes.length).toBe(1);
    expect(savedConfig.scopes[0]?.path).toBe(".");

    const agentsMd = await fs.readFile(path.join(tempDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain("Monolito (Single Project)");
    expect(agentsMd).toContain("Directrices de Arquitectura");

    const archRule = await fs.readFile(
      path.join(tempDir, ".specty/rules/core/architecture.md"),
      "utf8",
    );
    expect(archRule).toContain("Arquitectura de Monolito");

    const pyRule = await fs
      .access(path.join(tempDir, ".specty/rules/lang/python.md"))
      .then(() => true)
      .catch(() => false);
    expect(pyRule).toBe(true);

    const fwRule = await fs
      .access(path.join(tempDir, ".specty/rules/framework/fastapi.md"))
      .then(() => true)
      .catch(() => false);
    expect(fwRule).toBe(true);
  });

  it("initializes new project as monorepo and adapts core indications", async () => {
    await executeInit({
      yes: true,
      projectKind: "new",
      structure: "monorepo",
      monorepoKind: "turbo",
      framework: "next",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.project.kind).toBe("new");
    expect(savedConfig.project.layout).toBe("monorepo");
    expect(savedConfig.scopes.map((s) => s.path)).toEqual(
      expect.arrayContaining(["apps/web", "packages/ui", "packages/core"]),
    );

    const agentsMd = await fs.readFile(path.join(tempDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain("Monorepo (Multi-paquete / Orquestado)");

    const archRule = await fs.readFile(
      path.join(tempDir, ".specty/rules/core/architecture.md"),
      "utf8",
    );
    expect(archRule).toContain("Arquitectura de Monorepo");
    expect(archRule).toContain("Flujo de Dependencias Unidireccional");
  });

  it("initializes new project as polyglot workspace and adapts multi-stack core indications", async () => {
    await executeInit({
      yes: true,
      projectKind: "new",
      structure: "workspace",
      components: ["web-react", "api-fastapi", "mobile-flutter"],
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.project.kind).toBe("new");
    expect(savedConfig.project.layout).toBe("workspace");
    expect(savedConfig.scopes.map((s) => s.path)).toEqual([
      "apps/web",
      "services/ai-service",
      "apps/mobile",
    ]);

    const agentsMd = await fs.readFile(path.join(tempDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain("Workspace (Políglota / Multi-stack)");

    const archRule = await fs.readFile(
      path.join(tempDir, ".specty/rules/core/architecture.md"),
      "utf8",
    );
    expect(archRule).toContain("Arquitectura de Workspace Políglota");
    expect(archRule).toContain("Aislamiento Estricto de Dependencias");

    // All language rules generated for polyglot workspace
    const tsRule = await fs
      .access(path.join(tempDir, ".specty/rules/lang/typescript.md"))
      .then(() => true)
      .catch(() => false);
    const pyRule = await fs
      .access(path.join(tempDir, ".specty/rules/lang/python.md"))
      .then(() => true)
      .catch(() => false);
    const dartRule = await fs
      .access(path.join(tempDir, ".specty/rules/lang/dart.md"))
      .then(() => true)
      .catch(() => false);
    expect(tsRule).toBe(true);
    expect(pyRule).toBe(true);
    expect(dartRule).toBe(true);

    // All framework rules generated
    const reactRule = await fs
      .access(path.join(tempDir, ".specty/rules/framework/react.md"))
      .then(() => true)
      .catch(() => false);
    const fastapiRule = await fs
      .access(path.join(tempDir, ".specty/rules/framework/fastapi.md"))
      .then(() => true)
      .catch(() => false);
    const flutterRule = await fs
      .access(path.join(tempDir, ".specty/rules/framework/flutter.md"))
      .then(() => true)
      .catch(() => false);
    expect(reactRule).toBe(true);
    expect(fastapiRule).toBe(true);
    expect(flutterRule).toBe(true);
  });

  it("initializes project with customized graphical UI and generates ui-style.md and tokens protocol", async () => {
    await executeInit({
      yes: true,
      projectKind: "new",
      hasGui: true,
      uiCustomize: true,
      uiPurpose: "ecommerce",
      uiTargetAudience: "general-public",
      uiBorderRadius: "rounded",
      uiVisualEffects: "subtle-elevation",
      uiColorMode: "both",
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.ui?.has_gui).toBe(true);
    expect(savedConfig.ui?.is_customized).toBe(true);
    expect(savedConfig.ui?.purpose).toBe("ecommerce");
    expect(savedConfig.ui?.border_radius).toBe("rounded");

    const uiRuleExists = await fs
      .access(path.join(tempDir, ".specty/rules/core/ui-style.md"))
      .then(() => true)
      .catch(() => false);
    expect(uiRuleExists).toBe(true);

    const uiRuleContent = await fs.readFile(
      path.join(tempDir, ".specty/rules/core/ui-style.md"),
      "utf8",
    );
    expect(uiRuleContent).toContain("E-Commerce / Tienda Online");
    expect(uiRuleContent).toContain("Regla del Primer Toque");
    expect(uiRuleContent).toContain("<!-- USER_LIBRARIES_START -->");

    const agentsMd = await fs.readFile(path.join(tempDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain(".specty/rules/core/ui-style.md");
  });

  it("initializes project with default neutral UI when customization is false", async () => {
    await executeInit({
      yes: true,
      projectKind: "new",
      hasGui: true,
      uiCustomize: false,
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.ui?.has_gui).toBe(true);
    expect(savedConfig.ui?.is_customized).toBe(false);
    expect(savedConfig.ui?.purpose).toBe("general-purpose");
    expect(savedConfig.ui?.border_radius).toBe("semi-rounded");
    expect(savedConfig.ui?.visual_effects).toBe("subtle-elevation");

    const uiRuleContent = await fs.readFile(
      path.join(tempDir, ".specty/rules/core/ui-style.md"),
      "utf8",
    );
    expect(uiRuleContent).toContain("Proposito General / Neutro");
  });

  it("does not generate ui-style.md when project has no graphical interface", async () => {
    await executeInit({
      yes: true,
      projectKind: "new",
      hasGui: false,
      cwd: tempDir,
    });

    const savedConfig = await loadConfig(tempDir);
    expect(savedConfig.ui).toBeUndefined();

    const uiRuleExists = await fs
      .access(path.join(tempDir, ".specty/rules/core/ui-style.md"))
      .then(() => true)
      .catch(() => false);
    expect(uiRuleExists).toBe(false);

    const agentsMd = await fs.readFile(path.join(tempDir, "AGENTS.md"), "utf8");
    expect(agentsMd).not.toContain(".specty/rules/core/ui-style.md");
  });
});
