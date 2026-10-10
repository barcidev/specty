import type { SupportedTool } from "../core/config.js";
import type { GeneratedFile } from "../generate/types.js";
import { aiderAdapter } from "./aider.js";
import { amazonqAdapter } from "./amazonq.js";
import { antigravityAdapter } from "./antigravity.js";
import { chatgptAdapter } from "./chatgpt.js";
import { claudeAdapter } from "./claude.js";
import { clineAdapter } from "./cline.js";
import { codexAdapter } from "./codex.js";
import { codyAdapter } from "./cody.js";
import { continueAdapter } from "./continue.js";
import { copilotAdapter } from "./copilot.js";
import { cursorAdapter } from "./cursor.js";
import { geminiAdapter } from "./gemini.js";
import { junieAdapter } from "./junie.js";
import { opencodeAdapter } from "./opencode.js";
import { rooAdapter } from "./roo.js";
import type { AdapterContext, ToolAdapter } from "./types.js";
import { windsurfAdapter } from "./windsurf.js";
import { zedAdapter } from "./zed.js";

const ADAPTERS: Record<SupportedTool, ToolAdapter> = {
  antigravity: antigravityAdapter,
  claude: claudeAdapter,
  cursor: cursorAdapter,
  "github-copilot": copilotAdapter,
  windsurf: windsurfAdapter,
  codex: codexAdapter,
  gemini: geminiAdapter,
  cline: clineAdapter,
  roocode: rooAdapter,
  continue: continueAdapter,
  junie: junieAdapter,
  "amazon-q": amazonqAdapter,
  aider: aiderAdapter,
  opencode: opencodeAdapter,
  zed: zedAdapter,
  cody: codyAdapter,
  chatgpt: chatgptAdapter,
};

const TOOL_ALIASES: Record<string, SupportedTool> = {
  copilot: "github-copilot",
  roo: "roocode",
  amazonq: "amazon-q",
  "open-code": "opencode",
  "zed-editor": "zed",
  zededitor: "zed",
  "sourcegraph-cody": "cody",
  sourcegraph: "cody",
  openai: "chatgpt",
  "openai-canvas": "chatgpt",
  "chatgpt-projects": "chatgpt",
  canvas: "chatgpt",
};

export function normalizeToolId(id: string): SupportedTool | undefined {
  const normalized = id.trim().toLowerCase();
  if (normalized in ADAPTERS) {
    return normalized as SupportedTool;
  }
  return TOOL_ALIASES[normalized];
}

export function getAdapter(id: string): ToolAdapter {
  const canonicalId = normalizeToolId(id);
  const adapter = canonicalId ? ADAPTERS[canonicalId] : undefined;
  if (!adapter) {
    throw new Error(`Unsupported tool adapter: "${id}"`);
  }
  return adapter;
}

export function getAllAdapters(): ToolAdapter[] {
  return Object.values(ADAPTERS);
}

export async function generateToolFiles(
  toolId: string,
  ctx: AdapterContext,
): Promise<GeneratedFile[]> {
  const adapter = getAdapter(toolId);
  return await adapter.generateFiles(ctx);
}

export async function generateAllSelectedTools(ctx: AdapterContext): Promise<GeneratedFile[]> {
  const allFiles: GeneratedFile[] = [];
  for (const toolId of ctx.config.tools) {
    const files = await generateToolFiles(toolId, ctx);
    allFiles.push(...files);
  }
  return allFiles;
}
