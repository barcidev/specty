import fs from "node:fs";
import { PR_GATE_COMMENT_MARKER } from "./pr-reporter.js";

export interface GitHubContext {
  repo?: string;
  token?: string;
  apiUrl: string;
  prNumber?: number;
  prLabels?: string[];
  prBody?: string;
  headRef?: string;
}

export interface GitHubReview {
  id: number;
  user: {
    login: string;
    type?: string;
    site_admin?: boolean;
  };
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
  submitted_at: string;
  commit_id: string;
  author_association?: string;
}

export interface FetchPrReviewsOptions {
  repo: string;
  prNumber: number;
  token: string;
  apiUrl?: string;
}

export interface UpsertCommentOptions {
  repo: string;
  prNumber: number;
  body: string;
  token: string;
  apiUrl?: string;
  marker?: string;
}

export interface UpsertCommentResult {
  action: "created" | "updated";
  commentId: number;
  url: string;
}

/**
 * Resolves GitHub Actions CI execution environment variables.
 */
export function getGitHubContext(): GitHubContext {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";

  let prNumber: number | undefined;
  let prLabels: string[] | undefined;
  let prBody: string | undefined;
  let headRef: string | undefined = process.env.GITHUB_HEAD_REF;

  // 1. Try reading from GitHub Actions event payload JSON file
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const raw = fs.readFileSync(eventPath, "utf8");
      const event = JSON.parse(raw);
      if (event.pull_request) {
        if (typeof event.pull_request.number === "number") {
          prNumber = event.pull_request.number;
        }
        if (Array.isArray(event.pull_request.labels)) {
          prLabels = event.pull_request.labels
            .map((l: { name?: string }) => l.name || "")
            .filter(Boolean);
        }
        if (typeof event.pull_request.body === "string") {
          prBody = event.pull_request.body;
        }
        if (typeof event.pull_request.head?.ref === "string") {
          headRef = event.pull_request.head.ref;
        }
      } else if (typeof event.issue?.number === "number") {
        prNumber = event.issue.number;
        if (Array.isArray(event.issue.labels)) {
          prLabels = event.issue.labels.map((l: { name?: string }) => l.name || "").filter(Boolean);
        }
        if (typeof event.issue.body === "string") {
          prBody = event.issue.body;
        }
      } else if (typeof event.number === "number") {
        prNumber = event.number;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 2. Fallback to GITHUB_REF regex pattern (e.g. refs/pull/42/merge or refs/pull/42/head)
  if (!prNumber && process.env.GITHUB_REF) {
    const match = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\//);
    if (match?.[1]) {
      prNumber = parseInt(match[1], 10);
    }
  }

  return {
    repo,
    token,
    apiUrl,
    prNumber,
    prLabels,
    prBody,
    headRef,
  };
}

/**
 * Fetches reviews for a given pull request from GitHub API.
 */
export async function fetchPrReviews(options: FetchPrReviewsOptions): Promise<GitHubReview[]> {
  const { repo, prNumber, token } = options;
  const apiUrl = (options.apiUrl || "https://api.github.com").replace(/\/$/, "");

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "specty-pr-gate",
  };

  const url = `${apiUrl}/repos/${repo}/pulls/${prNumber}/reviews?per_page=100`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch PR reviews (${res.status}): ${errText}`);
  }

  const reviews = (await res.json()) as GitHubReview[];
  return Array.isArray(reviews) ? reviews : [];
}

/**
 * Creates or updates an idempotent (sticky) comment on a GitHub Pull Request.
 */
export async function upsertPrComment(options: UpsertCommentOptions): Promise<UpsertCommentResult> {
  const { repo, prNumber, body, token } = options;
  const apiUrl = (options.apiUrl || "https://api.github.com").replace(/\/$/, "");
  const marker = options.marker || PR_GATE_COMMENT_MARKER;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "specty-pr-gate",
    "Content-Type": "application/json",
  };

  // 1. Find existing comments to detect previous Specty gate comment
  const listUrl = `${apiUrl}/repos/${repo}/issues/${prNumber}/comments?per_page=100`;
  const listRes = await fetch(listUrl, { headers });

  if (!listRes.ok) {
    const errText = await listRes.text();
    if (listRes.status === 403 || listRes.status === 401) {
      throw new Error(
        `GitHub API authentication/permission error (${listRes.status}): Ensure the workflow defines "permissions: pull-requests: write". Details: ${errText}`,
      );
    }
    throw new Error(`Failed to list PR comments (${listRes.status}): ${errText}`);
  }

  const comments = (await listRes.json()) as Array<{ id: number; body?: string; html_url: string }>;
  const existingComment = Array.isArray(comments)
    ? comments.find((c) => typeof c.body === "string" && c.body.includes(marker))
    : undefined;

  // 2. Update existing comment if found
  if (existingComment) {
    const updateUrl = `${apiUrl}/repos/${repo}/issues/comments/${existingComment.id}`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ body }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(
        `Failed to update PR comment ${existingComment.id} (${updateRes.status}): ${errText}`,
      );
    }

    const updated = (await updateRes.json()) as { id: number; html_url: string };
    return {
      action: "updated",
      commentId: updated.id,
      url: updated.html_url,
    };
  }

  // 3. Otherwise create a new comment
  const createUrl = `${apiUrl}/repos/${repo}/issues/${prNumber}/comments`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ body }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    if (createRes.status === 403 || createRes.status === 401) {
      throw new Error(
        `GitHub API permission error (${createRes.status}) creating PR comment: Ensure workflow defines "permissions: pull-requests: write". Details: ${errText}`,
      );
    }
    throw new Error(`Failed to create PR comment (${createRes.status}): ${errText}`);
  }

  const created = (await createRes.json()) as { id: number; html_url: string };
  return {
    action: "created",
    commentId: created.id,
    url: created.html_url,
  };
}
