import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UiRouter } from "./router.js";
import { SseHub } from "./sse.js";
import type { UiServerInstance, UiServerOptions } from "./types.js";

const DEFAULT_PORT = 4173;
const DEFAULT_HOST = "127.0.0.1";

export async function resolveClientDirectory(): Promise<string> {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  // 1. Check relative to build output (dist/ui/client or dist/client)
  const candidatePaths = [
    path.join(currentDir, "client"),
    path.join(currentDir, "..", "ui", "client"),
    path.join(currentDir, "..", "src", "ui", "client"),
    path.join(process.cwd(), "src", "ui", "client"),
    path.join(process.cwd(), "dist", "ui", "client"),
  ];

  for (const candidate of candidatePaths) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        const indexHtml = path.join(candidate, "index.html");
        await fs.access(indexHtml);
        return candidate;
      }
    } catch {
      // try next
    }
  }

  return path.join(currentDir, "client");
}

async function resolveSessionToken(repoRoot: string, customToken?: string): Promise<string> {
  if (customToken) return customToken;
  const tokenPath = path.join(repoRoot, ".specty", ".session-token");
  try {
    const existing = await fs.readFile(tokenPath, "utf8");
    if (existing.trim().length >= 16) {
      return existing.trim();
    }
  } catch {
    // File does not exist yet
  }
  const newToken = crypto.randomBytes(24).toString("hex");
  try {
    await fs.mkdir(path.dirname(tokenPath), { recursive: true });
    await fs.writeFile(tokenPath, newToken, "utf8");
  } catch {
    // Ignore write errors (e.g. read-only file systems)
  }
  return newToken;
}

export async function startUiServer(options: UiServerOptions = {}): Promise<UiServerInstance> {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const host = options.host || DEFAULT_HOST;
  const preferredPort = options.port || DEFAULT_PORT;
  const sessionToken = await resolveSessionToken(repoRoot, options.sessionToken);

  const clientStaticDir = await resolveClientDirectory();
  const sseHub = new SseHub();
  sseHub.startWatching(repoRoot);

  const router = new UiRouter(repoRoot, sseHub, clientStaticDir, sessionToken);

  const server = http.createServer(async (req, res) => {
    await router.handleRequest(req, res);
  });

  const port = await listenOnAvailablePort(server, preferredPort, host);
  const url = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;

  return {
    url,
    port,
    host,
    sessionToken,
    close: async () => {
      sseHub.close();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

async function listenOnAvailablePort(
  server: http.Server,
  startPort: number,
  host: string,
): Promise<number> {
  let port = startPort;
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const success = await new Promise<boolean>((resolve) => {
      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
        } else {
          resolve(false);
        }
      });
      server.listen(port, host, () => {
        resolve(true);
      });
    });

    if (success) {
      return port;
    }

    port++;
  }

  throw new Error(`Could not find an available port in range ${startPort}-${port}`);
}
