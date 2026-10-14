import fs from "node:fs/promises";
import type http from "node:http";
import path from "node:path";
import { execa } from "execa";
import { executeArchive } from "../cli/commands/archive.js";
import {
  createDefaultConfig,
  loadConfig,
  type SpectyConfig,
  SpectyConfigSchema,
  saveConfig,
} from "../core/config.js";
import { getCurrentBranch, getGitUser } from "../core/git.js";
import { loadManifest } from "../core/manifest.js";
import { getSpecEngine } from "../engines/factory.js";
import { generateProjectInfrastructure } from "../generate/generator.js";
import {
  endAgentSession,
  getAgentSession,
  isAgentSessionActive,
  startAgentSession,
} from "../governance/agent-session.js";
import { approveChange } from "../governance/approvals.js";
import { type CloseBranchResult, closeFeatureBranch } from "../governance/branch-manager.js";
import { generateCiPipeline } from "../governance/ci-templates.js";
import { generatePullRequest } from "../governance/pr-generator.js";
import { transitionChangeState } from "../governance/state-machine.js";
import { executeVerification } from "../governance/verifier.js";
import { triggerCodebaseIndex } from "../mcp/indexer.js";
import { computeGovernanceAnalytics, filterEventsByPeriod } from "../metrics/analytics.js";
import {
  computeMetricsSummary,
  exportGovernanceReport,
  type ReportFormat,
  type ReportPeriod,
  readMetricEvents,
} from "../metrics/index.js";
import {
  addTaskToChange,
  completeTaskInChange,
} from "../governance/task-manager.js";
import { getChangeDetail, toggleTaskStatus } from "./change-service.js";
import { getChangeDiffSummary } from "./diff-service.js";
import {
  addReviewComment,
  deleteReviewComment,
  dispatchReviewsToAgent,
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
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Specty-Token");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // CSRF Protection: Require valid X-Specty-Token for state-changing operations
    if (
      this.sessionToken &&
      (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")
    ) {
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

      // 5.0.1 Start Agent Working Session: POST /api/changes/:id/agent-session/start
      const startSessionMatch = pathname.match(/^\/api\/changes\/([^/]+)\/agent-session\/start$/);
      if (startSessionMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(startSessionMatch[1]);
        const body = ((await this.readJsonBody(req).catch(() => ({}))) || {}) as {
          agent?: string;
          role?: string;
          activity?: string;
        };
        const session = await startAgentSession(this.repoRoot, {
          changeId,
          agent: body.agent,
          role: body.role,
          activity: body.activity,
        });
        this.sseHub.broadcast("agent:session", { changeId, ...session });
        this.jsonResponse(res, 200, { success: true, session });
        return;
      }

      // 5.0.2 End Agent Working Session: POST /api/changes/:id/agent-session/end
      const endSessionMatch = pathname.match(/^\/api\/changes\/([^/]+)\/agent-session\/end$/);
      if (endSessionMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(endSessionMatch[1]);
        await endAgentSession(this.repoRoot, changeId);
        this.sseHub.broadcast("agent:session", { changeId, active: false });
        this.jsonResponse(res, 200, { success: true, active: false });
        return;
      }

      // 5.0.3 Get Agent Session Status: GET /api/changes/:id/agent-session
      const getSessionMatch = pathname.match(/^\/api\/changes\/([^/]+)\/agent-session$/);
      if (getSessionMatch?.[1] && method === "GET") {
        const changeId = decodeURIComponent(getSessionMatch[1]);
        const session = await getAgentSession(this.repoRoot, changeId);
        this.jsonResponse(res, 200, { session });
        return;
      }

      // 5. Approve Change: POST /api/changes/:id/approve
      const approveMatch = pathname.match(/^\/api\/changes\/([^/]+)\/approve$/);
      if (approveMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(approveMatch[1]);
        const body = ((await this.readJsonBody(req).catch(() => ({}))) || {}) as {
          force?: boolean;
          notes?: string;
        };

        const isLocked = await isAgentSessionActive(this.repoRoot, changeId);
        if (isLocked && !body.force) {
          this.jsonResponse(res, 409, {
            error:
              "El agente de IA se encuentra trabajando actualmente en la sesión de este plan. Espera a que finalice o fuerza el desbloqueo.",
            locked: true,
          });
          return;
        }

        const gitUser = await getGitUser(this.repoRoot);
        const approvedBy = gitUser.name || gitUser.email || process.env.USER || "human";

        const approvalResult = await approveChange(this.repoRoot, changeId, {
          approvedBy,
        });

        this.sseHub.broadcast("change:approved", { changeId, approval: approvalResult });
        this.jsonResponse(res, 200, { success: true, approval: approvalResult });
        return;
      }

      // 5.1 Start Implementation: POST /api/changes/:id/start
      const startMatch = pathname.match(/^\/api\/changes\/([^/]+)\/start$/);
      if (startMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(startMatch[1]);
        const body = ((await this.readJsonBody(req).catch(() => ({}))) || {}) as {
          force?: boolean;
        };
        const result = await transitionChangeState(this.repoRoot, changeId, "in-progress", {
          force: Boolean(body?.force),
        });

        if (!result.success) {
          this.jsonResponse(res, 400, { error: result.reason, result });
          return;
        }

        this.sseHub.broadcast("change:status_changed", {
          changeId,
          status: "in-progress",
          result,
        });
        this.jsonResponse(res, 200, { success: true, result });
        return;
      }

      // 5.2 Execute Verification: POST /api/changes/:id/verify
      const verifyMatch = pathname.match(/^\/api\/changes\/([^/]+)\/verify$/);
      if (verifyMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(verifyMatch[1]);
        const body = ((await this.readJsonBody(req).catch(() => ({}))) || {}) as {
          strict?: boolean;
          scope?: string;
          commandType?: string;
        };

        const report = await executeVerification(this.repoRoot, {
          changeId,
          strict: body?.strict,
          scope: body?.scope,
          commandType: body?.commandType,
        });

        if (report.passed) {
          try {
            await transitionChangeState(this.repoRoot, changeId, "verifying");
          } catch {
            // ignore transition if not in eligible state
          }
        }

        this.sseHub.broadcast("change:verified", { changeId, report });
        this.jsonResponse(res, 200, { success: true, report });
        return;
      }

      // 5.3 Get Verification Report: GET /api/changes/:id/verification
      const verificationMatch = pathname.match(/^\/api\/changes\/([^/]+)\/verification$/);
      if (verificationMatch?.[1] && method === "GET") {
        const changeId = decodeURIComponent(verificationMatch[1]);
        const verifPath = path.join(
          this.repoRoot,
          "openspec",
          "changes",
          changeId,
          "verification.json",
        );
        try {
          const raw = await fs.readFile(verifPath, "utf8");
          const report = JSON.parse(raw);
          this.jsonResponse(res, 200, { report });
        } catch {
          this.jsonResponse(res, 404, { error: "No verification report found" });
        }
        return;
      }

      // 5.4 Complete Change: POST /api/changes/:id/done
      const doneMatch = pathname.match(/^\/api\/changes\/([^/]+)\/done$/);
      if (doneMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(doneMatch[1]);
        const body = ((await this.readJsonBody(req).catch(() => ({}))) || {}) as {
          force?: boolean;
        };
        const result = await transitionChangeState(this.repoRoot, changeId, "done", {
          force: Boolean(body?.force),
        });

        if (!result.success) {
          this.jsonResponse(res, 400, { error: result.reason, result });
          return;
        }

        await triggerCodebaseIndex(this.repoRoot).catch(() => false);
        this.sseHub.broadcast("change:status_changed", {
          changeId,
          status: "done",
          result,
        });
        this.jsonResponse(res, 200, { success: true, result });
        return;
      }

      // 5.5 Archive Change: POST /api/changes/:id/archive
      const archiveMatch = pathname.match(/^\/api\/changes\/([^/]+)\/archive$/);
      if (archiveMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(archiveMatch[1]);
        const body = ((await this.readJsonBody(req).catch(() => ({}))) || {}) as {
          force?: boolean;
          dryRun?: boolean;
        };

        const success = await executeArchive(changeId, {
          cwd: this.repoRoot,
          force: Boolean(body?.force),
          dryRun: Boolean(body?.dryRun),
        });

        if (!success) {
          this.jsonResponse(res, 400, { error: `Failed to archive change "${changeId}".` });
          return;
        }

        const pr = await generatePullRequest(this.repoRoot, changeId, {
          dryRun: Boolean(body?.dryRun),
        }).catch(() => undefined);

        this.sseHub.broadcast("change:archived", { changeId, pr });
        this.jsonResponse(res, 200, { success: true, changeId, pr });
        return;
      }

      // 5.6 Complete and Archive Change (Unified 1-click): POST /api/changes/:id/complete-and-archive
      const completeAndArchiveMatch = pathname.match(
        /^\/api\/changes\/([^/]+)\/complete-and-archive$/,
      );
      if (completeAndArchiveMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(completeAndArchiveMatch[1]);
        const body = ((await this.readJsonBody(req).catch(() => ({}))) || {}) as {
          force?: boolean;
          dryRun?: boolean;
          closeBranch?: boolean;
        };

        // 1. Transition to done (human approves construction; verification was conducted by agent upon finishing coding)
        const doneResult = await transitionChangeState(this.repoRoot, changeId, "done", {
          force: true,
        });

        if (!doneResult.success) {
          this.jsonResponse(res, 400, { error: doneResult.reason, result: doneResult });
          return;
        }

        // 2. Execute archive
        const archiveSuccess = await executeArchive(changeId, {
          cwd: this.repoRoot,
          force: true,
          dryRun: Boolean(body?.dryRun),
        });

        if (!archiveSuccess) {
          this.jsonResponse(res, 400, {
            error: `Failed to archive change "${changeId}" after completing.`,
          });
          return;
        }

        // 3. Generate detailed Pull Request document
        const pr = await generatePullRequest(this.repoRoot, changeId, {
          dryRun: Boolean(body?.dryRun),
        }).catch(() => undefined);

        // 4. Close feature branch according to onboarding policy
        const shouldClose = body?.closeBranch !== false;
        let branchResult: CloseBranchResult | undefined;
        if (shouldClose) {
          branchResult = await closeFeatureBranch(this.repoRoot, changeId, {
            dryRun: Boolean(body?.dryRun),
          });
        }

        await triggerCodebaseIndex(this.repoRoot).catch(() => false);
        this.sseHub.broadcast("change:status_changed", {
          changeId,
          status: "done",
          result: doneResult,
        });
        this.sseHub.broadcast("change:archived", { changeId, pr });
        if (branchResult?.targetBranch) {
          this.sseHub.broadcast("branch:changed", { branch: branchResult.targetBranch });
        }

        this.jsonResponse(res, 200, {
          success: true,
          changeId,
          status: "archived",
          doneResult,
          branchResult,
          pr,
        });
        return;
      }

      // 5.7 Get / Generate Pull Request Document: GET /api/changes/:id/pull-request
      const prDocMatch = pathname.match(/^\/api\/changes\/([^/]+)\/pull-request$/);
      if (prDocMatch?.[1] && method === "GET") {
        const changeId = decodeURIComponent(prDocMatch[1]);
        const pr = await generatePullRequest(this.repoRoot, changeId);
        this.jsonResponse(res, 200, { success: true, pr });
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

      // 12. Apply / Dispatch Review Suggestions to Spec: POST /api/changes/:id/reviews/apply
      const reviewApplyMatch = pathname.match(/^\/api\/changes\/([^/]+)\/reviews\/apply$/);
      if (reviewApplyMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(reviewApplyMatch[1]);
        const body = await this.readJsonBody(req);
        const commentIds = Array.isArray(body.commentIds) ? body.commentIds.map(String) : undefined;

        const result = await dispatchReviewsToAgent(this.repoRoot, changeId, commentIds);
        this.sseHub.broadcast("review:applied", { changeId, result });
        const session = await getAgentSession(this.repoRoot, changeId);
        if (session) {
          this.sseHub.broadcast("agent:session", session as unknown as Record<string, unknown>);
        }
        this.jsonResponse(res, 200, result);
        return;
      }

      // 12.1 Add Governed Task: POST /api/changes/:id/tasks
      const taskAddMatch = pathname.match(/^\/api\/changes\/([^/]+)\/tasks$/);
      if (taskAddMatch?.[1] && method === "POST") {
        const changeId = decodeURIComponent(taskAddMatch[1]);
        const body = await this.readJsonBody(req);
        const description = String(body.description || body.text || "").trim();
        if (!description) {
          this.jsonResponse(res, 400, { error: "Task description is required" });
          return;
        }

        const filesGlobs = Array.isArray(body.filesGlobs)
          ? body.filesGlobs.map(String)
          : typeof body.filesGlobs === "string"
            ? (body.filesGlobs as string)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined;

        try {
          const result = await addTaskToChange(this.repoRoot, changeId, {
            description,
            role: body.role ? String(body.role) : undefined,
            filesGlobs,
            verifyCommand: body.verifyCommand ? String(body.verifyCommand) : undefined,
            phase: body.phase ? String(body.phase) : undefined,
          });

          this.sseHub.broadcast("task:added", { changeId, result });
          this.sseHub.broadcast("change:status_changed", { changeId, status: "reapproval_required" });
          this.jsonResponse(res, 201, result);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.jsonResponse(res, 400, { error: msg });
        }
        return;
      }

      // 12.2 Complete Governed Task: PATCH /api/changes/:id/tasks/:taskId/complete
      const taskCompleteMatch = pathname.match(/^\/api\/changes\/([^/]+)\/tasks\/([^/]+)\/complete$/);
      if (taskCompleteMatch?.[1] && taskCompleteMatch[2] && method === "PATCH") {
        const changeId = decodeURIComponent(taskCompleteMatch[1]);
        const taskId = decodeURIComponent(taskCompleteMatch[2]);

        try {
          const result = await completeTaskInChange(this.repoRoot, changeId, taskId);
          this.sseHub.broadcast("task:completed", { changeId, result });
          this.jsonResponse(res, 200, result);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.jsonResponse(res, 400, { error: msg });
        }
        return;
      }

      // 13. Open in IDE: POST /api/open-ide
      if (pathname === "/api/open-ide" && method === "POST") {
        const body = await this.readJsonBody(req);
        let rawFilePath = body.file ? String(body.file) : "";
        if (rawFilePath.startsWith("file://")) {
          try {
            rawFilePath = decodeURIComponent(new URL(rawFilePath).pathname);
          } catch {
            rawFilePath = decodeURIComponent(rawFilePath.replace(/^file:\/\//, ""));
          }
        }
        const targetPath = rawFilePath
          ? path.isAbsolute(rawFilePath)
            ? rawFilePath
            : path.resolve(this.repoRoot, rawFilePath)
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

      // 14. Configuration API: GET /api/config & PUT /api/config
      if (pathname === "/api/config" && method === "GET") {
        let config: SpectyConfig;
        try {
          config = await loadConfig(this.repoRoot);
        } catch {
          config = createDefaultConfig();
        }
        this.jsonResponse(res, 200, { config });
        return;
      }

      if (pathname === "/api/config" && method === "PUT") {
        const body = await this.readJsonBody(req);
        const configData = body.config && typeof body.config === "object" ? body.config : body;
        const validatedConfig = SpectyConfigSchema.parse(configData);
        await saveConfig(this.repoRoot, validatedConfig);
        this.sseHub.broadcast("config:updated", { config: validatedConfig });
        this.jsonResponse(res, 200, { success: true, config: validatedConfig });
        return;
      }

      // 15. Metrics API: GET /api/metrics & POST /api/metrics/export
      if (pathname === "/api/metrics" && method === "GET") {
        const period = (parsedUrl.searchParams.get("period") as ReportPeriod) || "all";
        const events = await readMetricEvents(this.repoRoot);
        const filteredEvents = filterEventsByPeriod(events, period);
        const summary = computeMetricsSummary(filteredEvents);
        const executiveReport = await computeGovernanceAnalytics(this.repoRoot, {
          period,
        }).catch(() => null);

        this.jsonResponse(res, 200, {
          period,
          summary,
          executiveReport,
          events: filteredEvents,
        });
        return;
      }

      if (pathname === "/api/metrics/export" && method === "POST") {
        const body = await this.readJsonBody(req);
        const format = (body.format as ReportFormat) || "html";
        const period = (body.period as ReportPeriod) || "all";
        const result = await exportGovernanceReport(this.repoRoot, {
          format,
          period,
          open: false,
        });
        this.jsonResponse(res, 200, { success: true, result });
        return;
      }

      // 16. Infrastructure API: GET /api/infrastructure & POST /api/infrastructure/regenerate
      if (pathname === "/api/infrastructure" && method === "GET") {
        const manifest = await loadManifest(this.repoRoot);
        let config: SpectyConfig;
        try {
          config = await loadConfig(this.repoRoot);
        } catch {
          config = createDefaultConfig();
        }

        const readFilesRecursively = async (dir: string, base = ""): Promise<string[]> => {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const list: string[] = [];
            for (const entry of entries) {
              const rel = base ? `${base}/${entry.name}` : entry.name;
              if (entry.isDirectory()) {
                list.push(...(await readFilesRecursively(path.join(dir, entry.name), rel)));
              } else {
                list.push(rel);
              }
            }
            return list;
          } catch {
            return [];
          }
        };

        const [agents, rules, templates] = await Promise.all([
          readFilesRecursively(path.join(this.repoRoot, ".specty", "agents")),
          readFilesRecursively(path.join(this.repoRoot, ".specty", "rules")),
          readFilesRecursively(path.join(this.repoRoot, ".specty", "templates")),
        ]);

        this.jsonResponse(res, 200, {
          manifest,
          config,
          agents,
          rules,
          templates,
        });
        return;
      }

      if (pathname === "/api/infrastructure/regenerate" && method === "POST") {
        const config = await loadConfig(this.repoRoot);
        const result = await generateProjectInfrastructure({
          repoRoot: this.repoRoot,
          config,
          language: config.language,
          dryRun: false,
        });

        const ciPipeline = generateCiPipeline(config);
        if (ciPipeline) {
          const ciFullPath = path.join(this.repoRoot, ciPipeline.relativePath);
          await fs.mkdir(path.dirname(ciFullPath), { recursive: true });
          await fs.writeFile(ciFullPath, ciPipeline.content, "utf8");
        }

        this.sseHub.broadcast("infrastructure:regenerated", { result });
        this.jsonResponse(res, 200, { success: true, result });
        return;
      }

      // 17. Static Files
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
    let relPath = urlPath === "/" || !urlPath ? "index.html" : urlPath.replace(/^\//, "");
    if (urlPath === "/settings" || urlPath === "/settings/") {
      relPath = "settings.html";
    }
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
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        });
        res.end(buf);
        return;
      }

      const content = await fs.readFile(filePath);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": content.length,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
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
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
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
