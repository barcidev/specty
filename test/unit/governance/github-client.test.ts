import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGitHubContext, upsertPrComment } from "../../../src/governance/github-client.js";

describe("github-client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("extracts GitHub context from environment variables and event JSON", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-gh-"));
    const eventFile = path.join(tmpDir, "event.json");
    await fs.writeFile(eventFile, JSON.stringify({ pull_request: { number: 42 } }), "utf8");

    process.env.GITHUB_REPOSITORY = "barcidev/specty";
    process.env.GITHUB_TOKEN = "ghp_mock_token_123";
    process.env.GITHUB_EVENT_PATH = eventFile;

    const ctx = getGitHubContext();
    expect(ctx.repo).toBe("barcidev/specty");
    expect(ctx.token).toBe("ghp_mock_token_123");
    expect(ctx.prNumber).toBe(42);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("extracts PR number from GITHUB_REF regex fallback", () => {
    delete process.env.GITHUB_EVENT_PATH;
    process.env.GITHUB_REF = "refs/pull/105/merge";

    const ctx = getGitHubContext();
    expect(ctx.prNumber).toBe(105);
  });

  it("creates a new PR comment when no previous comment exists", async () => {
    const fetchMock = vi.fn();

    // 1. GET comments -> returns []
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    });

    // 2. POST comment -> returns created comment
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 999,
        html_url: "https://github.com/barcidev/specty/issues/comments/999",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await upsertPrComment({
      repo: "barcidev/specty",
      prNumber: 42,
      body: "<!-- specty-pr-gate-comment -->\n## Gate Report",
      token: "mock-token",
    });

    expect(result.action).toBe("created");
    expect(result.commentId).toBe(999);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const postCall = fetchMock.mock.calls[1];
    expect(postCall[0]).toContain("/repos/barcidev/specty/issues/42/comments");
    expect(postCall[1].method).toBe("POST");
  });

  it("updates existing PR comment when previous comment with marker exists", async () => {
    const fetchMock = vi.fn();

    // 1. GET comments -> returns existing comment with marker
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [
        { id: 101, body: "Normal user comment", html_url: "https://gh.com/101" },
        {
          id: 202,
          body: "<!-- specty-pr-gate-comment -->\nOld report",
          html_url: "https://gh.com/202",
        },
      ],
    });

    // 2. PATCH comment -> returns updated comment
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 202, html_url: "https://gh.com/202" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await upsertPrComment({
      repo: "barcidev/specty",
      prNumber: 42,
      body: "<!-- specty-pr-gate-comment -->\nUpdated Report",
      token: "mock-token",
    });

    expect(result.action).toBe("updated");
    expect(result.commentId).toBe(202);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[0]).toContain("/repos/barcidev/specty/issues/comments/202");
    expect(patchCall[1].method).toBe("PATCH");
  });

  it("throws friendly error message when GitHub API returns 403 permission error", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Resource not accessible by integration",
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      upsertPrComment({
        repo: "barcidev/specty",
        prNumber: 42,
        body: "Report",
        token: "token",
      }),
    ).rejects.toThrow("pull-requests: write");
  });
});
