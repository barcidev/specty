import fs from "node:fs";
import type http from "node:http";
import path from "node:path";

export interface SseEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export class SseHub {
  private clients: Set<http.ServerResponse> = new Set();
  private watchers: fs.FSWatcher[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;

  addClient(res: http.ServerResponse): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write("event: connected\ndata: {}\n\n");
    this.clients.add(res);

    res.on("close", () => {
      this.clients.delete(res);
    });
  }

  broadcast(type: string, data: Record<string, unknown> = {}): void {
    const payload = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    const message = `event: ${type}\ndata: ${payload}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  startWatching(repoRoot: string): void {
    const watchDirs = [
      path.join(repoRoot, "openspec", "changes"),
      path.join(repoRoot, ".specty", "reviews"),
      path.join(repoRoot, ".specty", "audit"),
    ];

    for (const dir of watchDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const watcher = fs.watch(dir, { recursive: true }, (_eventType, filename) => {
          if (!filename || filename.startsWith(".")) return;
          this.triggerDebouncedUpdate(filename);
        });
        this.watchers.push(watcher);
      } catch {
        // Watcher might fail on some platforms if recursive not supported, ignore
      }
    }
  }

  private triggerDebouncedUpdate(filename: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.broadcast("fs:change", { filename });
      this.debounceTimer = null;
    }, 200);
  }

  close(): void {
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {
        // ignore
      }
    }
    this.watchers = [];

    for (const client of this.clients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
