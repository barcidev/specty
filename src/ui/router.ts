import fs from "node:fs/promises";
import type http from "node:http";
import path from "node:path";
import { execa } from "execa";
import { createDefaultConfig, loadConfig, type SpectyConfig } from "../core/config.js";
import { getCurrentBranch, getGitUser } from "../core/git.js";
import { getSpecEngine } from "../engines/factory.js";
import { approveChange } from "../governance/approvals.js";
import { getChangeDetail, toggleTaskStatus } from "./change-service.js";
import { getChangeDiffSummary } from "./diff-service.js";
import {
  addReviewComment,
  applyReviewSuggestionsToSpec,
  deleteReviewComment,
  loadChangeReviews,
  updateReviewComment,
} from "./reviews.js";
import type { SseHub } from "./sse.js";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export class UiRouter {
  constructor(
    private repoRoot: string,
    private sseHub: SseHub,
    private clientStaticDir: string,
    private sessionToken?: string,
  ) {}

  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = new URL(req.url || "/", "http://localhost");
    const pathname = parsedUrl.pathname;
    const method = req.method?.toUpperCase() || "GET";

    // Restrict CORS to local origins only
    const origin = req.headers.origin;
    if (origin) {
      const isLocalOrigin =
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("http://[::1]:");
      if (isLocalOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Specty-Token");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // CSRF Protection: Require valid X-Specty-Token for state-changing operations
    if (this.sessionToken && (method === "POST" || method === "PATCH" || method === "DELETE")) {
      const tokenHeader = req.headers["x-specty-token"];
      if (tokenHeader !== this.sessionToken) {
        this.jsonResponse(res, 403, {
          error: "Forbidden: Missing or invalid X-Specty-Token header.",
        });
        return;
      }
    }

    try {
      // 1. SSE Stream
      if (pathname === "/api/events" && method === "GET") {
        this.sseHub.addClient(res);
        return;
      }

      // 2. Status
      if (pathname === "/api/status" && method === "GET") {
        let config: SpectyConfig;
        try {
          config = await loadConfig(this.repoRoot);
        } catch {
          config = createDefaultConfig();
        }
        const [branch, gitUser] = await Promise.all([
          getCurrentBranch(this.repoRoot),
          getGitUser(this.repoRoot),
        ]);
        this.jsonResponse(res, 200, {
          repoRoot: this.repoRoot,
          branch: branch || "unknown",
          gitUser,
          config,
          sessionToken: this.sessionToken,
        });
        return;
      }

      // 3. Changes List
      if (pathname === "/api/changes" && method === "GET") {
        let specEngine: "openspec" | "builtin" = "openspec";
        try {
          const config = await loadConfig(this.repoRoot);
          specEngine = config.spec_engine;
        } catch {
          // fallback to openspec default
        }
        const engine = getSpecEngine(specEngine);

        const changes = await engine.listChanges(this.repoRoot);
        this.jsonResponse(res, 200, { changes });
        return;
      }

      // 4. Change Detail: /api/changes/:id
      const changeMatch = pathname.match(/^\/api\/changes\/([^/]+)$/);
      if (changeMatch?.[1] && method === "GET") {
        const changeId = decodeURIComponent(changeMatch[1]);
        const detail = await getChangeDetail(this.repoRoot, changeId);
        if (!detail) {
          this.jsonResponse(res, 404, { error: `Change "${changeId}" not found` });
          return;
        }
        this.jsonResponse(res, 200, detail);
        return;
      }

      // 5. Approve Change: POST /api/changes/:id/approve
      const approveMatch = pathname.match(/^\/api\/changes\/([^/]+)\/approve$/);
      if (approveMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(approveMatch[1]);
        await this.readJsonBody(req);
        const gitUser = await getGitUser(this.repoRoot);
        const approvedBy = gitUser.name || gitUser.email || process.env.USER || "human";

        const approvalResult = await approveChange(this.repoRoot, changeId, {
          approvedBy,
        });

        this.sseHub.broadcast("change:approved", { changeId, approval: approvalResult });
        this.jsonResponse(res, 200, { success: true, approval: approvalResult });
        return;
      }

      // 6. Toggle Task: POST /api/changes/:id/tasks/toggle
      const taskToggleMatch = pathname.match(/^\/api\/changes\/([^/]+)\/tasks\/toggle$/);
      if (taskToggleMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(taskToggleMatch[1]);
        const body = await this.readJsonBody(req);
        const lineIndex = Number(body.lineIndex);

        if (Number.isNaN(lineIndex)) {
          this.jsonResponse(res, 400, { error: "Missing or invalid lineIndex" });
          return;
        }

        const updatedTasks = await toggleTaskStatus(
          this.repoRoot,
          changeId,
          lineIndex,
          typeof body.completed === "boolean" ? body.completed : undefined,
        );

        this.sseHub.broadcast("task:toggled", { changeId, lineIndex, tasksData: updatedTasks });
        this.jsonResponse(res, 200, { success: true, tasksData: updatedTasks });
        return;
      }

      // 7. Diffs: GET /api/changes/:id/diff
      const diffMatch = pathname.match(/^\/api\/changes\/([^/]+)\/diff$/);
      if (diffMatch?.[1] && method === "GET") {
        const changeId = decodeURIComponent(diffMatch[1]);
        const scope =
          (parsedUrl.searchParams.get("scope") as "all" | "staged" | "unstaged") || "all";
        const diffSummary = await getChangeDiffSummary(this.repoRoot, changeId, scope);
        this.jsonResponse(res, 200, diffSummary);
        return;
      }

      // 8. Reviews List: GET /api/changes/:id/reviews
      const reviewsListMatch = pathname.match(/^\/api\/changes\/([^/]+)\/reviews$/);
      if (reviewsListMatch?.[1] && method === "GET") {
        const changeId = decodeURIComponent(reviewsListMatch[1]);
        const reviews = await loadChangeReviews(this.repoRoot, changeId);
        this.jsonResponse(res, 200, { reviews });
        return;
      }

      // 9. Add Review Comment: POST /api/changes/:id/reviews
      if (reviewsListMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(reviewsListMatch[1]);
        const body = await this.readJsonBody(req);
        if (!body.sectionId || !body.comment) {
          this.jsonResponse(res, 400, { error: "sectionId and comment are required" });
          return;
        }

        const gitUser = await getGitUser(this.repoRoot);
        const newReview = await addReviewComment(this.repoRoot, changeId, {
          sectionId: String(body.sectionId),
          sectionTitle: body.sectionTitle ? String(body.sectionTitle) : undefined,
          selection: body.selection ? String(body.selection) : undefined,
          comment: String(body.comment),
          type: body.type === "change_request" ? "change_request" : "comment",
          suggestion: body.suggestion ? String(body.suggestion) : undefined,
          author: (body.author as string) || gitUser.name || "reviewer",
        });

        this.sseHub.broadcast("review:added", { changeId, review: newReview });
        this.jsonResponse(res, 201, { success: true, review: newReview });
        return;
      }

      // 10. Update Review Comment: PATCH /api/changes/:id/reviews/:reviewId
      const reviewItemMatch = pathname.match(/^\/api\/changes\/([^/]+)\/reviews\/([^/]+)$/);
      if (reviewItemMatch?.[1] && reviewItemMatch[2] && method === "PATCH") {
        const changeId = decodeURIComponent(reviewItemMatch[1]);
        const reviewId = decodeURIComponent(reviewItemMatch[2]);
        const body = await this.readJsonBody(req);

        const updated = await updateReviewComment(this.repoRoot, changeId, reviewId, {
          resolved: typeof body.resolved === "boolean" ? body.resolved : undefined,
          comment: body.comment ? String(body.comment) : undefined,
          suggestion: body.suggestion ? String(body.suggestion) : undefined,
          type: body.type === "change_request" || body.type === "comment" ? body.type : undefined,
        });

        if (!updated) {
          this.jsonResponse(res, 404, { error: `Review "${reviewId}" not found` });
          return;
        }

        this.sseHub.broadcast("review:updated", { changeId, review: updated });
        this.jsonResponse(res, 200, { success: true, review: updated });
        return;
      }

      // 11. Delete Review Comment: DELETE /api/changes/:id/reviews/:reviewId
      if (reviewItemMatch?.[1] && reviewItemMatch[2] && method === "DELETE") {
        const changeId = decodeURIComponent(reviewItemMatch[1]);
        const reviewId = decodeURIComponent(reviewItemMatch[2]);
        const deleted = await deleteReviewComment(this.repoRoot, changeId, reviewId);

        if (!deleted) {
          this.jsonResponse(res, 404, { error: `Review "${reviewId}" not found` });
          return;
        }

        this.sseHub.broadcast("review:deleted", { changeId, reviewId });
        this.jsonResponse(res, 200, { success: true, reviewId });
        return;
      }

      // 12. Apply Review Suggestions to Spec: POST /api/changes/:id/reviews/apply
      const reviewApplyMatch = pathname.match(/^\/api\/changes\/([^/]+)\/reviews\/apply$/);
      if (reviewApplyMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(reviewApplyMatch[1]);
        const body = await this.readJsonBody(req);
        const commentIds = Array.isArray(body.commentIds) ? body.commentIds.map(String) : undefined;

        const result = await applyReviewSuggestionsToSpec(this.repoRoot, changeId, commentIds);
        this.sseHub.broadcast("review:applied", { changeId, result });
        this.jsonResponse(res, 200, result);
        return;
      }

      // 13. Open in IDE: POST /api/open-ide
      if (pathname === "/api/open-ide" && method === "POST") {
        const body = await this.readJsonBody(req);
        const targetPath = body.file
          ? path.resolve(this.repoRoot, String(body.file))
          : this.repoRoot;
        const line = body.line ? Number(body.line) : undefined;
        const target = line ? `${targetPath}:${line}` : targetPath;

        try {
          // Try code CLI
          await execa("code", ["-g", target]).catch(async () => {
            // Fallback to cursor CLI
            await execa("cursor", ["-g", target]).catch(async () => {
              // Fallback to open
              if (process.platform === "darwin") {
                await execa("open", [targetPath]);
              }
            });
          });
          this.jsonResponse(res, 200, { success: true, opened: target });
        } catch (err: unknown) {
          this.jsonResponse(res, 500, {
            error: `Failed to open in IDE: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
        return;
      }

      // 14. Static Files
      if (method === "GET") {
        await this.serveStaticFile(pathname, res);
        return;
      }

      this.jsonResponse(res, 404, { error: "Endpoint not found" });
    } catch (err: unknown) {
      this.jsonResponse(res, 500, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async serveStaticFile(urlPath: string, res: http.ServerResponse): Promise<void> {
    const relPath = urlPath === "/" || !urlPath ? "index.html" : urlPath.replace(/^\//, "");
    // Prevent traversal outside clientStaticDir
    const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = path.join(this.clientStaticDir, safePath);

    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        await this.fallbackToIndex(res);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      if (ext === ".html" || safePath === "index.html") {
        let html = await fs.readFile(filePath, "utf8");
        if (this.sessionToken) {
          const injection = `<script>window.__SPECTY_TOKEN__ = ${JSON.stringify(this.sessionToken)};</script>`;
          html = html.replace("<head>", `<head>\n    ${injection}`);
        }
        const buf = Buffer.from(html, "utf8");
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": buf.length,
        });
        res.end(buf);
        return;
      }

      const content = await fs.readFile(filePath);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": content.length,
      });
      res.end(content);
    } catch {
      await this.fallbackToIndex(res);
    }
  }

  private async fallbackToIndex(res: http.ServerResponse): Promise<void> {
    const indexPath = path.join(this.clientStaticDir, "index.html");
    try {
      let html = await fs.readFile(indexPath, "utf8");
      if (this.sessionToken) {
        const injection = `<script>window.__SPECTY_TOKEN__ = ${JSON.stringify(this.sessionToken)};</script>`;
        html = html.replace("<head>", `<head>\n    ${injection}`);
      }
      const buf = Buffer.from(html, "utf8");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": buf.length,
      });
      res.end(buf);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Specty UI: Static assets not found.");
    }
  }

  private jsonResponse(res: http.ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  }

  private async readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
        if (data.length > 5 * 1024 * 1024) {
          reject(new Error("Payload too large"));
        }
      });
      req.on("end", () => {
        if (!data.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (_err) {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  }
}
