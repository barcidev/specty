import type { ChangeMetadata } from "../engines/types.js";
import type { ApprovalStatusResult } from "../governance/approvals.js";
import type { HandoffRecord } from "../handoff/types.js";
import type { SymbolRecord } from "./graph.js";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface SpectyValidateChangeResult {
  changeId: string;
  valid: boolean;
  errorsCount: number;
  warningsCount: number;
  issues: Array<{
    file: string;
    line?: number;
    rule?: string;
    severity: string;
    message: string;
  }>;
  message?: string;
}

export interface SpectyGetActiveChangeResult {
  change: ChangeMetadata;
  approval: ApprovalStatusResult;
  proposal: string;
  tasks: string;
  message?: string;
}

export type SpectyGetRulesResult = Record<string, string>;

export interface SpectyGetAgentRoleResult {
  role: string;
  content: string;
  error?: string;
}

export type SpectyGetLatestHandoffResult = HandoffRecord | { message: string };

export interface SpectyRecordHandoffResult {
  success: boolean;
  handoffId?: string;
  error?: string;
}

export interface SpectyGetCodeGraphResult {
  provider: string;
  notice?: string;
  symbols: SymbolRecord[];
  dependencies: string[];
  stats?: {
    filesCount: number;
    symbolsCount: number;
    depsCount: number;
  };
  error?: string;
}

export interface SpectyVerifyCommandResult {
  command: string;
  passed: boolean;
  exitCode: number;
  durationMs: number;
  output: string;
}

export type SpectyVerifyResult = Record<string, SpectyVerifyCommandResult> | { message: string };

export interface McpToolResultMap {
  specty_validate_change: SpectyValidateChangeResult;
  specty_get_active_change: SpectyGetActiveChangeResult;
  specty_get_rules: SpectyGetRulesResult;
  specty_get_agent_role: SpectyGetAgentRoleResult;
  specty_get_latest_handoff: SpectyGetLatestHandoffResult;
  specty_record_handoff: SpectyRecordHandoffResult;
  specty_get_code_graph: SpectyGetCodeGraphResult;
  specty_verify: SpectyVerifyResult;
}
