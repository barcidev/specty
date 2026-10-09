import path from "node:path";
import { McpServer } from "../../mcp/server.js";

export interface McpCliOptions {
  cwd?: string;
}

export async function executeMcp(options: McpCliOptions = {}): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const server = new McpServer(repoRoot);
  await server.start();
}
