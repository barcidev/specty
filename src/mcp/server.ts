import path from "node:path";
import readline from "node:readline";
import { CodeGraph } from "./graph.js";
import { getMcpToolDefinitions, handleMcpToolCall } from "./tools.js";

export class McpServer {
  private repoRoot: string;
  private graph?: CodeGraph;
  private isRunning = false;

  constructor(repoRoot: string) {
    this.repoRoot = path.resolve(repoRoot);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initialize local SQLite graph in memory or disk
    const graphDbPath = path.join(this.repoRoot, ".specty", "graph", "index.sqlite");
    try {
      this.graph = new CodeGraph(graphDbPath);
      await this.graph.indexDirectory(this.repoRoot);
    } catch {
      // Non-fatal if index fails
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on("line", async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const msg = JSON.parse(trimmed);
        await this.handleMessage(msg);
      } catch (err: unknown) {
        this.sendError(
          null,
          -32700,
          `Parse error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());
  }

  stop(): void {
    if (this.graph) {
      try {
        this.graph.close();
      } catch {
        // ignore
      }
    }
    this.isRunning = false;
  }

  private sendResponse(id: string | number | null | undefined, result: unknown): void {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id,
      result,
    });
    process.stdout.write(`${payload}\n`);
  }

  private sendError(id: string | number | null | undefined, code: number, message: string): void {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code, message },
    });
    process.stdout.write(`${payload}\n`);
  }

  private async handleMessage(msg: Record<string, unknown>): Promise<void> {
    const { id, method, params } = msg as {
      id?: string | number | null;
      method?: string;
      params?: Record<string, unknown>;
    };

    // Handle notifications (no id)
    if (id === undefined || id === null) {
      if (method === "notifications/initialized") {
        // Client confirmed initialization, nothing to reply
        return;
      }
    }

    switch (method) {
      case "initialize": {
        this.sendResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "specty",
            version: "0.1.0",
          },
        });
        break;
      }

      case "tools/list": {
        this.sendResponse(id, {
          tools: getMcpToolDefinitions(),
        });
        break;
      }

      case "tools/call": {
        try {
          const toolName = typeof params?.name === "string" ? params.name : "";
          const toolArgs =
            params?.arguments && typeof params.arguments === "object"
              ? (params.arguments as Record<string, unknown>)
              : {};
          const result = await handleMcpToolCall(toolName, toolArgs, this.repoRoot, this.graph);

          this.sendResponse(id, {
            content: [
              {
                type: "text",
                text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              },
            ],
          });
        } catch (err: unknown) {
          this.sendError(
            id,
            -32603,
            `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        break;
      }

      default: {
        this.sendError(id, -32601, `Method not found: "${method}"`);
        break;
      }
    }
  }
}
