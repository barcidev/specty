import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { ValidationIssue, ValidationResult } from "../engines/types.js";

export interface SpecValidationOptions {
  strict?: boolean;
  allowedRoles?: string[];
}

export const DEFAULT_ALLOWED_ROLES = [
  "orchestrator",
  "frontend",
  "backend",
  "data",
  "testing",
  "security-review",
];

const PROPOSAL_REQUIRED_SECTIONS: {
  canonical: string;
  aliases: string[];
}[] = [
  {
    canonical: "Why",
    aliases: [
      "why",
      "objective",
      "por qué",
      "por que",
      "objetivo",
      "justificación",
      "justificacion",
    ],
  },
  {
    canonical: "What Changes",
    aliases: [
      "what changes",
      "proposed architecture",
      "qué cambia",
      "que cambia",
      "cambios",
      "arquitectura propuesta",
      "arquitectura",
    ],
  },
  {
    canonical: "Impact",
    aliases: [
      "impact",
      "acceptance criteria",
      "impacto",
      "criterios de aceptación",
      "criterios de aceptacion",
    ],
  },
];

/**
 * Searches for unresolved mustache template placeholders such as {{placeholder}}.
 */
export function findTemplatePlaceholders(content: string, filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = content.split("\n");
  const placeholderRegex = /\{\{\s*([\w.-]+)\s*\}\}/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    let match: RegExpExecArray | null = placeholderRegex.exec(line);
    while (match !== null) {
      issues.push({
        file: filePath,
        line: i + 1,
        rule: "template/unresolved-placeholder",
        severity: "error",
        message: `Unresolved template placeholder '${match[0]}' found in line ${i + 1}`,
      });
      match = placeholderRegex.exec(line);
    }
  }

  return issues;
}

/**
 * Validates proposal.md content against canonical Specty/OpenSpec structure.
 */
export function validateProposalContent(content: string, filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = content.split("\n");

  if (content.trim().length === 0) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "proposal/empty-file",
      severity: "error",
      message: "Proposal file is empty",
    });
    return issues;
  }

  // 1. Detect unresolved placeholders
  issues.push(...findTemplatePlaceholders(content, filePath));

  // 2. Check H1 title
  const firstHeadingLineIndex = lines.findIndex((l) => /^#\s+/.test(l.trim()));
  if (firstHeadingLineIndex === -1) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "proposal/title-required",
      severity: "error",
      message:
        "Proposal must start with a level 1 heading (e.g. '# Proposal: <Title>' or '# Change: <Title>')",
    });
  } else {
    const h1Line = (lines[firstHeadingLineIndex] ?? "").trim();
    if (!/^#\s+(?:proposal|change):?/i.test(h1Line)) {
      issues.push({
        file: filePath,
        line: firstHeadingLineIndex + 1,
        rule: "proposal/title-format",
        severity: "warning",
        message: `Level 1 heading '${h1Line}' should follow '# Proposal: <Title>' or '# Change: <Title>' format`,
      });
    }
  }

  // 3. Inspect H2 sections and detect empty sections
  const h2Headers: { index: number; text: string; clean: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      const text = (match[1] ?? "").trim();
      h2Headers.push({
        index: i,
        text,
        clean: text.toLowerCase().replace(/[:#]/g, "").trim(),
      });
    }
  }

  // Check required sections
  for (const req of PROPOSAL_REQUIRED_SECTIONS) {
    const found = h2Headers.find((h) => req.aliases.some((alias) => h.clean.includes(alias)));

    if (!found) {
      issues.push({
        file: filePath,
        rule: "proposal/required-sections",
        severity: "error",
        message: `Missing required section '## ${req.canonical}'`,
      });
    }
  }

  // Check if any H2 section is empty (no content between it and the next H1/H2 header, or end of file)
  for (let i = 0; i < h2Headers.length; i++) {
    const current = h2Headers[i];
    if (!current) continue;
    const nextIndex =
      i + 1 < h2Headers.length ? (h2Headers[i + 1]?.index ?? lines.length) : lines.length;
    let hasBodyContent = false;

    for (let j = current.index + 1; j < nextIndex; j++) {
      const lineText = (lines[j] ?? "").trim();
      // Ignore comments or empty lines
      if (lineText.length > 0 && !lineText.startsWith("<!--")) {
        hasBodyContent = true;
        break;
      }
    }

    if (!hasBodyContent) {
      issues.push({
        file: filePath,
        line: current.index + 1,
        rule: "proposal/empty-section",
        severity: "error",
        message: `Section '## ${current.text}' contains no content`,
      });
    }
  }

  return issues;
}

/**
 * Validates tasks.md content against canonical Specty task checklist conventions.
 */
export function validateTasksContent(
  content: string,
  filePath: string,
  options: SpecValidationOptions = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = content.split("\n");
  const allowedRoles = options.allowedRoles ?? DEFAULT_ALLOWED_ROLES;

  if (content.trim().length === 0) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "tasks/empty-file",
      severity: "error",
      message: "Tasks file is empty",
    });
    return issues;
  }

  // 1. Detect unresolved placeholders
  issues.push(...findTemplatePlaceholders(content, filePath));

  // 2. Check H1 title
  const firstHeadingLineIndex = lines.findIndex((l) => /^#\s+/.test(l.trim()));
  if (firstHeadingLineIndex === -1) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "tasks/title-required",
      severity: "error",
      message:
        "Tasks file must start with a level 1 heading (e.g. '# Tasks: <Title>' or '# Tasks')",
    });
  }

  // 3. Check for at least one phase / H2 section
  const hasH2Phase = lines.some((l) => /^##\s+/.test(l.trim()));
  if (!hasH2Phase) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "tasks/phase-header-required",
      severity: "error",
      message: "Tasks file must group tasks under at least one phase (e.g. '## 1. Implementation')",
    });
  }

  // 4. Scan for task items and syntax
  let taskCheckboxesCount = 0;
  const checkboxRegex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;
  const nonCheckboxTaskRegex = /^\s*[-*]\s+(\d+\.\d+.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const match = line.match(checkboxRegex);

    if (match) {
      taskCheckboxesCount++;
      const description = (match[2] ?? "").trim();
      const lineNum = i + 1;

      if (description.length === 0) {
        issues.push({
          file: filePath,
          line: lineNum,
          rule: "tasks/empty-task-description",
          severity: "error",
          message: `Task item at line ${lineNum} has an empty description`,
        });
        continue;
      }

      // Check agent metadata tag [agent: <role>]
      const agentMatch = description.match(/\[agent:\s*([^\]]+)\]/i);
      if (!agentMatch) {
        issues.push({
          file: filePath,
          line: lineNum,
          rule: "tasks/metadata-agent-tag",
          severity: "warning",
          message: `Task '${description.slice(0, 40)}...' is missing agent role tag [agent: <role>]`,
        });
      } else {
        const role = (agentMatch[1] ?? "").trim().toLowerCase();
        if (!allowedRoles.includes(role)) {
          issues.push({
            file: filePath,
            line: lineNum,
            rule: "tasks/invalid-agent-role",
            severity: "warning",
            message: `Task declares unknown agent role '${role}'. Expected one of: ${allowedRoles.join(", ")}`,
          });
        }
      }

      // Check files metadata tag [files: ...]
      const filesMatch = description.match(/\[files:\s*([^\]]+)\]/i);
      if (!filesMatch) {
        issues.push({
          file: filePath,
          line: lineNum,
          rule: "tasks/metadata-files-tag",
          severity: "warning",
          message: `Task '${description.slice(0, 40)}...' is missing file scope tag [files: <scope>]`,
        });
      }

      // Check verification command on subsequent line
      let hasVerify = false;
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const nextLine = lines[j] ?? "";
        if (/^\s+verify:\s*\S+/i.test(nextLine)) {
          hasVerify = true;
          break;
        }
        if (/^\s*-\s*\[/i.test(nextLine) || /^##/i.test(nextLine)) {
          break;
        }
      }

      if (!hasVerify) {
        issues.push({
          file: filePath,
          line: lineNum,
          rule: "tasks/metadata-verify-cmd",
          severity: "warning",
          message: `Task '${description.slice(0, 40)}...' is missing verification line 'verify: <cmd>'`,
        });
      }
    } else {
      // Check for bullet lists that look like tasks but omit checkboxes
      const nonCheckboxMatch = line.match(nonCheckboxTaskRegex);
      if (nonCheckboxMatch) {
        issues.push({
          file: filePath,
          line: i + 1,
          rule: "tasks/non-checkbox-list",
          severity: "warning",
          message: `Line ${i + 1} appears to be a task without a markdown checkbox: '${line.trim()}'. Use '- [ ] ${nonCheckboxMatch[1]}'`,
        });
      }
    }
  }

  if (taskCheckboxesCount === 0) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "tasks/checklist-items-required",
      severity: "error",
      message: "Tasks file contains no markdown checklist items ('- [ ] <task>')",
    });
  }

  return issues;
}

/**
 * Validates delta spec files under specs directory.
 */
export function validateSpecDeltaContent(content: string, filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (content.trim().length === 0) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "specs/empty-file",
      severity: "warning",
      message: `Specification delta file '${filePath}' is empty`,
    });
    return issues;
  }

  issues.push(...findTemplatePlaceholders(content, filePath));

  // Check for delta section headers
  const hasDeltaSections =
    /##\s+(?:ADDED|MODIFIED|REMOVED)\s+Requirements/i.test(content) ||
    /##\s+Requirements/i.test(content) ||
    /##\s+Requisitos/i.test(content);

  if (!hasDeltaSections) {
    issues.push({
      file: filePath,
      rule: "specs/delta-sections",
      severity: "warning",
      message:
        "Specification delta should declare requirement sections ('## ADDED Requirements', '## MODIFIED Requirements', or '## REMOVED Requirements')",
    });
  }

  // Check for Requirement and SHALL / DEBE structure
  const hasRequirements = /###\s+Requirement:/i.test(content) || /###\s+Requisito:/i.test(content);
  if (hasRequirements && !/(?:SHALL|DEBE)/i.test(content)) {
    issues.push({
      file: filePath,
      rule: "specs/requirement-structure",
      severity: "warning",
      message: "Specification requirements should use normative keywords ('SHALL' or 'DEBE')",
    });
  }

  // Check for Scenario structure
  const hasScenarios = /####\s+Scenario:/i.test(content) || /####\s+Escenario:/i.test(content);
  if (
    hasScenarios &&
    (!/(?:\*\*WHEN\*\*|\*\*CUANDO\*\*)/i.test(content) ||
      !/(?:\*\*THEN\*\*|\*\*ENTONCES\*\*)/i.test(content))
  ) {
    issues.push({
      file: filePath,
      rule: "specs/scenario-structure",
      severity: "warning",
      message:
        "Specification scenarios should declare trigger and assertion items ('- **WHEN** ...' and '- **THEN** ...')",
    });
  }

  return issues;
}

/**
 * Validates design.md content if present.
 */
export function validateDesignContent(content: string, filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (content.trim().length === 0) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "design/empty-file",
      severity: "warning",
      message: "Design document is empty",
    });
    return issues;
  }

  issues.push(...findTemplatePlaceholders(content, filePath));

  if (!/^#\s+/m.test(content)) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "design/title-required",
      severity: "warning",
      message: "Design document should start with a level 1 heading (e.g. '# Design: <Title>')",
    });
  }

  return issues;
}

/**
 * Validates an entire change specification directory against Specty semantic rules.
 */
export async function validateChangeSpecification(
  changeDir: string,
  options: SpecValidationOptions = {},
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // 1. Verify change directory exists
  try {
    const stat = await fs.stat(changeDir);
    if (!stat.isDirectory()) {
      return {
        valid: false,
        issues: [
          {
            file: changeDir,
            severity: "error",
            message: `Specified change path is not a directory: '${changeDir}'`,
          },
        ],
        errorsCount: 1,
        warningsCount: 0,
      };
    }
  } catch {
    return {
      valid: false,
      issues: [
        {
          file: changeDir,
          severity: "error",
          message: `Change directory does not exist: '${changeDir}'`,
        },
      ],
      errorsCount: 1,
      warningsCount: 0,
    };
  }

  // 2. Validate proposal.md
  const proposalPath = path.join(changeDir, "proposal.md");
  try {
    const proposalContent = await fs.readFile(proposalPath, "utf8");
    issues.push(...validateProposalContent(proposalContent, proposalPath));
  } catch {
    issues.push({
      file: proposalPath,
      rule: "proposal/file-missing",
      severity: "error",
      message: "Missing mandatory 'proposal.md' in change specification directory",
    });
  }

  // 3. Validate tasks.md
  const tasksPath = path.join(changeDir, "tasks.md");
  try {
    const tasksContent = await fs.readFile(tasksPath, "utf8");
    issues.push(...validateTasksContent(tasksContent, tasksPath, options));
  } catch {
    issues.push({
      file: tasksPath,
      rule: "tasks/file-missing",
      severity: "error",
      message: "Missing mandatory 'tasks.md' in change specification directory",
    });
  }

  // 4. Validate design.md if present
  const designPath = path.join(changeDir, "design.md");
  try {
    const designContent = await fs.readFile(designPath, "utf8");
    issues.push(...validateDesignContent(designContent, designPath));
  } catch {
    // design.md is optional
  }

  // 5. Validate specs/**/*.md if present
  try {
    const specFiles = await fg("specs/**/*.md", { cwd: changeDir, onlyFiles: true });
    for (const relSpec of specFiles) {
      const fullSpecPath = path.join(changeDir, relSpec);
      const specContent = await fs.readFile(fullSpecPath, "utf8");
      issues.push(...validateSpecDeltaContent(specContent, fullSpecPath));
    }
  } catch {
    // ignore
  }

  const errorsCount = issues.filter((i) => i.severity === "error").length;
  const warningsCount = issues.filter((i) => i.severity === "warning").length;

  const valid = options.strict ? issues.length === 0 : errorsCount === 0;

  return {
    valid,
    issues,
    errorsCount,
    warningsCount,
  };
}
