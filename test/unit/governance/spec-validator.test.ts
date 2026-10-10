import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findTemplatePlaceholders,
  validateChangeSpecification,
  validateDesignContent,
  validateProposalContent,
  validateSpecDeltaContent,
  validateTasksContent,
} from "../../../src/governance/spec-validator.js";

describe("spec-validator: findTemplatePlaceholders", () => {
  it("detects mustache placeholders with line numbers", () => {
    const raw = "Line 1\nLine 2 {{myVar}}\nLine 3\nLine 4 {{anotherVar}} and {{thirdVar}}";
    const issues = findTemplatePlaceholders(raw, "sample.md");

    expect(issues).toHaveLength(3);
    expect(issues[0]?.line).toBe(2);
    expect(issues[0]?.rule).toBe("template/unresolved-placeholder");
    expect(issues[0]?.message).toContain("{{myVar}}");
    expect(issues[1]?.line).toBe(4);
    expect(issues[2]?.line).toBe(4);
  });

  it("returns empty array when no placeholders exist", () => {
    const raw = "Normal markdown content with [brackets] and regular text.";
    const issues = findTemplatePlaceholders(raw, "sample.md");
    expect(issues).toHaveLength(0);
  });
});

describe("spec-validator: validateProposalContent", () => {
  it("passes for valid English proposal", () => {
    const content = `# Proposal: User Authentication

## Why
We need secure user authentication to prevent unauthorized data access.

## What Changes
- Add JWT middleware
- Add login controller

## Capabilities
### New Capabilities
- auth.jwt: Token generation and verification

## Impact
- **APIs:** /api/login endpoint added
- **Dependencies:** jsonwebtoken
- **Risks:** Secret rotation needed
`;

    const issues = validateProposalContent(content, "proposal.md");
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("passes for valid Spanish proposal with Objective and Architecture", () => {
    const content = `# Change: Autenticación de Usuarios

## Objetivo
Implementar autenticación segura basada en tokens.

## Arquitectura Propuesta
Controlador con middleware de validación.

## Criterios de Aceptación
- Login retorna token válido
- Rutas protegidas devuelven 401 si no hay token
`;

    const issues = validateProposalContent(content, "proposal.md");
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("fails when proposal is empty", () => {
    const issues = validateProposalContent("   \n\n  ", "proposal.md");
    expect(issues.some((i) => i.rule === "proposal/empty-file")).toBe(true);
  });

  it("fails when H1 heading is missing", () => {
    const content = `## Why\nSome reason\n\n## What Changes\nChanges\n\n## Impact\nImpact`;
    const issues = validateProposalContent(content, "proposal.md");
    expect(issues.some((i) => i.rule === "proposal/title-required")).toBe(true);
  });

  it("fails when required sections are missing", () => {
    const content = `# Proposal: Incomplete Spec\n\n## Why\nJust a why section.\n`;
    const issues = validateProposalContent(content, "proposal.md");
    expect(
      issues.some(
        (i) => i.rule === "proposal/required-sections" && i.message.includes("What Changes"),
      ),
    ).toBe(true);
    expect(
      issues.some((i) => i.rule === "proposal/required-sections" && i.message.includes("Impact")),
    ).toBe(true);
  });

  it("fails when a section is empty", () => {
    const content = `# Proposal: Empty Section Spec

## Why
Valid context here.

## What Changes

## Impact
Valid impact description.
`;
    const issues = validateProposalContent(content, "proposal.md");
    expect(
      issues.some((i) => i.rule === "proposal/empty-section" && i.message.includes("What Changes")),
    ).toBe(true);
  });

  it("fails when unresolved template placeholders are present", () => {
    const content = `# Proposal: {{changeName}}

## Why
{{whyDescription}}

## What Changes
- {{changeItem1}}

## Impact
- **APIs:** none
`;
    const issues = validateProposalContent(content, "proposal.md");
    const placeholders = issues.filter((i) => i.rule === "template/unresolved-placeholder");
    expect(placeholders.length).toBeGreaterThanOrEqual(3);
  });
});

describe("spec-validator: validateTasksContent", () => {
  it("passes for valid tasks file following Specty format", () => {
    const content = `# Tasks: Feature X

## 1. Core Logic
- [ ] 1.1 Implement feature service  [agent: backend] [files: src/services/**]
      verify: npm test

## 2. Integration
- [x] 2.1 Integrate frontend view  [agent: frontend] [files: src/views/**]
      verify: npm run build
`;

    const issues = validateTasksContent(content, "tasks.md");
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
    expect(issues.filter((i) => i.severity === "warning")).toHaveLength(0);
  });

  it("fails when tasks file is empty", () => {
    const issues = validateTasksContent("", "tasks.md");
    expect(issues.some((i) => i.rule === "tasks/empty-file")).toBe(true);
  });

  it("fails when tasks file has no checkboxes", () => {
    const content = `# Tasks: Feature X

## 1. Implementation
- 1.1 First task
- 1.2 Second task
`;
    const issues = validateTasksContent(content, "tasks.md");
    expect(issues.some((i) => i.rule === "tasks/checklist-items-required")).toBe(true);
    expect(issues.some((i) => i.rule === "tasks/non-checkbox-list")).toBe(true);
  });

  it("fails when a task item description is empty", () => {
    const content = `# Tasks: Feature X

## 1. Implementation
- [ ] 
`;
    const issues = validateTasksContent(content, "tasks.md");
    expect(issues.some((i) => i.rule === "tasks/empty-task-description")).toBe(true);
  });

  it("warns when Specty metadata tags are missing", () => {
    const content = `# Tasks: Feature X

## 1. Implementation
- [ ] 1.1 Simple task without metadata
`;
    const issues = validateTasksContent(content, "tasks.md");
    expect(issues.some((i) => i.rule === "tasks/metadata-agent-tag")).toBe(true);
    expect(issues.some((i) => i.rule === "tasks/metadata-files-tag")).toBe(true);
    expect(issues.some((i) => i.rule === "tasks/metadata-verify-cmd")).toBe(true);
  });

  it("warns when unknown agent role is specified", () => {
    const content = `# Tasks: Feature X

## 1. Implementation
- [ ] 1.1 Task with invalid agent  [agent: wizard] [files: src/*]
      verify: npm test
`;
    const issues = validateTasksContent(content, "tasks.md");
    expect(issues.some((i) => i.rule === "tasks/invalid-agent-role")).toBe(true);
  });
});

describe("spec-validator: validateSpecDeltaContent and validateDesignContent", () => {
  it("validates spec deltas and warns on missing normative keywords", () => {
    const content = `## ADDED Requirements

### Requirement: User Profile
The user can edit their bio.

#### Scenario: Update Bio
- bio is saved
`;
    const issues = validateSpecDeltaContent(content, "specs/user/spec.md");
    expect(issues.some((i) => i.rule === "specs/requirement-structure")).toBe(true);
    expect(issues.some((i) => i.rule === "specs/scenario-structure")).toBe(true);
  });

  it("passes for valid delta spec", () => {
    const content = `## ADDED Requirements

### Requirement: User Profile
The system SHALL persist updated bio information.

#### Scenario: Save valid bio
- **WHEN** user submits updated profile
- **THEN** response code is 200
`;
    const issues = validateSpecDeltaContent(content, "specs/user/spec.md");
    expect(issues).toHaveLength(0);
  });

  it("warns when design.md is empty", () => {
    const issues = validateDesignContent("", "design.md");
    expect(issues.some((i) => i.rule === "design/empty-file")).toBe(true);
  });
});

describe("spec-validator: validateChangeSpecification directory", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-val-dir-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns error if directory does not exist", async () => {
    const res = await validateChangeSpecification(path.join(tmpDir, "missing-dir"));
    expect(res.valid).toBe(false);
    expect(res.errorsCount).toBe(1);
  });

  it("returns error if proposal.md is missing", async () => {
    await fs.writeFile(path.join(tmpDir, "tasks.md"), "# Tasks\n## 1. A\n- [ ] 1.1 Task\n");
    const res = await validateChangeSpecification(tmpDir);
    expect(res.valid).toBe(false);
    expect(res.issues.some((i) => i.rule === "proposal/file-missing")).toBe(true);
  });

  it("returns valid: true for complete conforming change directory", async () => {
    await fs.writeFile(
      path.join(tmpDir, "proposal.md"),
      `# Proposal: Complete Spec\n\n## Why\nDetailed context.\n\n## What Changes\nDetailed changes.\n\n## Impact\nNone.\n`,
    );
    await fs.writeFile(
      path.join(tmpDir, "tasks.md"),
      `# Tasks: Complete Spec\n\n## 1. Implementation\n- [ ] 1.1 Do work  [agent: backend] [files: src/**]\n      verify: npm test\n`,
    );

    const res = await validateChangeSpecification(tmpDir);
    expect(res.valid).toBe(true);
    expect(res.errorsCount).toBe(0);
  });

  it("respects strict mode by failing on warnings", async () => {
    await fs.writeFile(
      path.join(tmpDir, "proposal.md"),
      `# Proposal: Minimal Spec\n\n## Why\nContext.\n\n## What Changes\nChanges.\n\n## Impact\nNone.\n`,
    );
    // Tasks missing metadata tags (triggers warnings)
    await fs.writeFile(
      path.join(tmpDir, "tasks.md"),
      `# Tasks: Minimal Spec\n\n## 1. Implementation\n- [ ] 1.1 Work without metadata\n`,
    );

    const normalRes = await validateChangeSpecification(tmpDir, { strict: false });
    expect(normalRes.valid).toBe(true); // Warnings don't fail normal mode
    expect(normalRes.warningsCount).toBeGreaterThan(0);

    const strictRes = await validateChangeSpecification(tmpDir, { strict: true });
    expect(strictRes.valid).toBe(false); // Fails in strict mode
  });
});
