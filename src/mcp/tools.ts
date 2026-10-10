import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { getSpecEngine } from "../engines/factory.js";
import { checkApprovalStatus } from "../governance/approvals.js";
import { validateChangeSpecification } from "../governance/spec-validator.js";
import { executeVerification } from "../governance/verifier.js";
import { createHandoff, getLatestHandoff } from "../handoff/manager.js";
import type { CodeGraph } from "./graph.js";

export * from "./types.js";

import type { McpToolDefinition, McpToolResultMap } from "./types.js";

export function getMcpToolDefinitions(): McpToolDefinition[] {
  return [
    {
      name: "specty_get_active_change",
      description: "Get active specification change details, proposal, tasks, and approval status.",
      inputSchema: {
        type: "object",
        properties: {
          changeId: {
            type: "string",
            description:
              "Optional specific change identifier. If omitted, returns first active change.",
          },
        },
      },
    },
    {
      name: "specty_get_rules",
      description:
        "Retrieve modular governance and development rules for a given task type or stack.",
      inputSchema: {
        type: "object",
        properties: {
          taskType: {
            type: "string",
            description:
              "Task type rule category: ui, api, data, testing, security, workflow, git.",
          },
          languageOrFramework: {
            type: "string",
            description:
              "Language or framework specific rule: typescript, react, angular, flutter, etc.",
          },
        },
      },
    },
    {
      name: "specty_get_agent_role",
      description:
        "Get role definition, boundaries, permitted files, and instructions for a sub-agent role.",
      inputSchema: {
        type: "object",
        properties: {
          role: {
            type: "string",
            description:
              "Agent role: orchestrator, frontend, backend, data, testing, security-review.",
          },
        },
        required: ["role"],
      },
    },
    {
      name: "specty_get_latest_handoff",
      description:
        "Retrieve the latest recorded session handoff for resuming context between roles.",
      inputSchema: {
        type: "object",
        properties: {
          changeId: {
            type: "string",
            description: "Change identifier to inspect handoffs for.",
          },
        },
        required: ["changeId"],
      },
    },
    {
      name: "specty_record_handoff",
      description: "Record a sequential sub-agent session handoff document for the active change.",
      inputSchema: {
        type: "object",
        properties: {
          changeId: { type: "string" },
          fromRole: { type: "string" },
          toRole: { type: "string" },
          tasksCompleted: { type: "array", items: { type: "string" } },
          filesModified: { type: "array", items: { type: "string" } },
          decisions: { type: "array", items: { type: "string" } },
          nextSteps: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
        required: ["changeId", "fromRole", "toRole"],
      },
    },
    {
      name: "specty_get_code_graph",
      description:
        "Query symbols, classes, functions, or file dependencies from the local indexed code graph.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Symbol name or substring to search for.",
          },
          filePath: {
            type: "string",
            description: "File path to inspect dependencies for.",
          },
        },
      },
    },
    {
      name: "specty_verify",
      description: "Execute scope verification commands (lint, test, build) and return results.",
      inputSchema: {
        type: "object",
        properties: {
          commandType: {
            type: "string",
            description: "Verification command type to run: lint, test, build, or all.",
          },
        },
      },
    },
    {
      name: "specty_validate_change",
      description:
        "Validate markdown specification schema and semantics for a change (proposal.md, tasks.md, deltas).",
      inputSchema: {
        type: "object",
        properties: {
          changeId: {
            type: "string",
            description:
              "Optional change identifier. If omitted, validates the first active change.",
          },
          strict: {
            type: "boolean",
            description: "If true, treats formatting warnings as errors.",
          },
        },
      },
    },
  ];
}

export async function handleMcpToolCall<K extends keyof McpToolResultMap>(
  name: K,
  args: Record<string, unknown>,
  repoRoot: string,
  graph?: CodeGraph,
): Promise<McpToolResultMap[K]>;
export async function handleMcpToolCall<T = unknown>(
  name: string,
  args: Record<string, unknown>,
  repoRoot: string,
  graph?: CodeGraph,
): Promise<T>;
export async function handleMcpToolCall(
  name: string,
  args: Record<string, unknown>,
  repoRoot: string,
  graph?: CodeGraph,
): Promise<unknown> {
  const config = await loadConfig(repoRoot);
  const engine = getSpecEngine(config.spec_engine);

  switch (name) {
    case "specty_validate_change": {
      const changeId = typeof args.changeId === "string" ? args.changeId : undefined;
      const strict = Boolean(args.strict);
      const changes = await engine.listChanges(repoRoot);
      const target = changeId ? changes.find((c) => c.id === changeId) : changes[0];

      if (!target) {
        return { valid: false, message: "No active changes found in repository to validate." };
      }

      const val = await validateChangeSpecification(target.path, { strict });
      return {
        changeId: target.id,
        valid: val.valid,
        errorsCount: val.errorsCount ?? 0,
        warningsCount: val.warningsCount ?? 0,
        issues: val.issues.map((i) => ({
          file: path.relative(repoRoot, i.file),
          line: i.line,
          rule: i.rule,
          severity: i.severity,
          message: i.message,
        })),
      };
    }

    case "specty_get_active_change": {
      const changeId = typeof args.changeId === "string" ? args.changeId : undefined;
      const changes = await engine.listChanges(repoRoot);
      const target = changeId ? changes.find((c) => c.id === changeId) : changes[0];

      if (!target) {
        return { message: "No active changes found in repository." };
      }

      const approval = await checkApprovalStatus(repoRoot, target.id);
      let proposalContent = "";
      let tasksContent = "";

      try {
        proposalContent = await fs.readFile(path.join(target.path, "proposal.md"), "utf8");
        tasksContent = await fs.readFile(path.join(target.path, "tasks.md"), "utf8");
      } catch {
        // ignore
      }

      return {
        change: target,
        approval,
        proposal: proposalContent,
        tasks: tasksContent,
      };
    }

    case "specty_get_rules": {
      const results: Record<string, string> = {};
      const rulesDir = path.join(repoRoot, ".specty", "rules");
      const taskType = typeof args.taskType === "string" ? args.taskType : undefined;
      const languageOrFramework =
        typeof args.languageOrFramework === "string" ? args.languageOrFramework : undefined;

      if (taskType) {
        const p = path.join(rulesDir, "task", `${taskType}.md`);
        try {
          results[`task:${taskType}`] = await fs.readFile(p, "utf8");
        } catch {
          // ignore
        }
      }

      if (languageOrFramework) {
        const langPath = path.join(rulesDir, "lang", `${languageOrFramework}.md`);
        const fwPath = path.join(rulesDir, "framework", `${languageOrFramework}.md`);

        try {
          results[`lang:${languageOrFramework}`] = await fs.readFile(langPath, "utf8");
        } catch {
          // ignore
        }
        try {
          results[`framework:${languageOrFramework}`] = await fs.readFile(fwPath, "utf8");
        } catch {
          // ignore
        }
      }

      return Object.keys(results).length > 0 ? results : { message: "No matching rules found." };
    }

    case "specty_get_agent_role": {
      const role = typeof args.role === "string" ? args.role : "";
      const rolePath = path.join(repoRoot, ".specty", "agents", `${role}.md`);
      try {
        const content = await fs.readFile(rolePath, "utf8");
        return { role, content };
      } catch {
        return { error: `Role definition "${role}" not found in .specty/agents/` };
      }
    }

    case "specty_get_latest_handoff": {
      const changes = await engine.listChanges(repoRoot);
      const changeId = typeof args.changeId === "string" ? args.changeId : changes[0]?.id;
      if (!changeId) {
        return { message: "No active changes found in repository." };
      }
      const latest = await getLatestHandoff(repoRoot, changeId);
      return latest ?? { message: "No handoffs recorded yet." };
    }

    case "specty_record_handoff": {
      const changes = await engine.listChanges(repoRoot);
      const changeId = typeof args.changeId === "string" ? args.changeId : changes[0]?.id;
      if (!changeId) {
        return { error: "No active change found to record handoff for." };
      }

      const record = await createHandoff(repoRoot, changeId, {
        fromRole: typeof args.fromRole === "string" ? args.fromRole : "",
        toRole: typeof args.toRole === "string" ? args.toRole : "",
        tasksCompleted: Array.isArray(args.tasksCompleted)
          ? (args.tasksCompleted as string[])
          : undefined,
        filesModified: Array.isArray(args.filesModified)
          ? (args.filesModified as string[])
          : undefined,
        decisions: Array.isArray(args.decisions) ? (args.decisions as string[]) : undefined,
        nextSteps: Array.isArray(args.nextSteps) ? (args.nextSteps as string[]) : undefined,
        notes: typeof args.notes === "string" ? args.notes : undefined,
      });
      return { success: true, handoffId: record.id };
    }

    case "specty_get_code_graph": {
      const provider = config.mcp.graph_provider ?? "codebase-memory";
      const res: Record<string, unknown> = {
        provider,
      };

      if (provider === "codebase-memory") {
        res.notice =
          "codebase-memory-mcp is configured as the primary graph provider. You may also use its native tools (search_graph, trace_path, get_architecture, detect_changes).";
      }

      if (graph) {
        if (typeof args.query === "string") {
          res.symbols = graph.findSymbols(args.query);
        }
        if (typeof args.filePath === "string") {
          res.dependencies = graph.getDependencies(args.filePath);
        }
        res.stats = graph.getStats();
      } else if (provider === "builtin") {
        return { error: "Code graph is not enabled or loaded." };
      }

      return res;
    }

    case "specty_verify": {
      if (!config.scopes || config.scopes.length === 0) {
        return { message: "No scopes configured." };
      }

      const report = await executeVerification(repoRoot, {
        commandType: typeof args.commandType === "string" ? args.commandType : undefined,
      });

      const results: Record<string, unknown> = {};

      for (const res of report.stackResults) {
        const hasMultiple =
          report.stackResults.filter((s) => s.commandType === res.commandType).length > 1;
        const key = hasMultiple ? `${res.scope}:${res.commandType}` : res.commandType;
        results[key] = {
          command: res.command,
          passed: res.passed,
          exitCode: res.exitCode,
          durationMs: res.durationMs,
          output: res.stdout || res.stderr,
        };
      }

      for (const res of report.tasksResults) {
        const key = `task:${res.taskId}`;
        results[key] = {
          command: res.command,
          passed: res.passed,
          exitCode: res.exitCode,
          durationMs: res.durationMs,
          output: res.stdout || res.stderr,
        };
      }

      return results;
    }

    default:
      throw new Error(`Unknown MCP tool: "${name}"`);
  }
}
