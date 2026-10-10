import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ChangeReviewsData, ReviewComment } from "./types.js";

export const REVIEWS_DIR = ".specty/reviews";

export function getReviewsFilePath(repoRoot: string, changeId: string): string {
  return path.join(repoRoot, REVIEWS_DIR, `${changeId}.json`);
}

export function getFeedbackMarkdownPath(repoRoot: string, changeId: string): string {
  return path.join(repoRoot, REVIEWS_DIR, `${changeId}-feedback.md`);
}

export async function loadChangeReviews(
  repoRoot: string,
  changeId: string,
): Promise<ReviewComment[]> {
  const filePath = getReviewsFilePath(repoRoot, changeId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw) as ChangeReviewsData;
    return Array.isArray(data.comments) ? data.comments : [];
  } catch {
    return [];
  }
}

export async function saveChangeReviews(
  repoRoot: string,
  changeId: string,
  comments: ReviewComment[],
): Promise<void> {
  const filePath = getReviewsFilePath(repoRoot, changeId);
  const dirPath = path.dirname(filePath);
  await fs.mkdir(dirPath, { recursive: true });

  const payload: ChangeReviewsData = {
    changeId,
    updatedAt: new Date().toISOString(),
    comments,
  };

  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await syncFeedbackMarkdown(repoRoot, changeId, comments);
}

export async function addReviewComment(
  repoRoot: string,
  changeId: string,
  input: {
    sectionId: string;
    sectionTitle?: string;
    selection?: string;
    comment: string;
    type?: "comment" | "change_request";
    suggestion?: string;
    author?: string;
  },
): Promise<ReviewComment> {
  const existing = await loadChangeReviews(repoRoot, changeId);

  const newComment: ReviewComment = {
    id: `rev-${crypto.randomBytes(4).toString("hex")}`,
    changeId,
    sectionId: input.sectionId,
    sectionTitle: input.sectionTitle,
    selection: input.selection?.trim() || undefined,
    comment: input.comment.trim(),
    type: input.type ?? "comment",
    suggestion: input.suggestion?.trim() || undefined,
    author: input.author?.trim() || "reviewer",
    createdAt: new Date().toISOString(),
    resolved: false,
  };

  existing.push(newComment);
  await saveChangeReviews(repoRoot, changeId, existing);
  return newComment;
}

export async function updateReviewComment(
  repoRoot: string,
  changeId: string,
  commentId: string,
  updates: Partial<Pick<ReviewComment, "resolved" | "comment" | "suggestion" | "type">>,
): Promise<ReviewComment | null> {
  const existing = await loadChangeReviews(repoRoot, changeId);
  const target = existing.find((c) => c.id === commentId);

  if (!target) {
    return null;
  }

  if (typeof updates.resolved === "boolean") {
    target.resolved = updates.resolved;
    target.resolvedAt = updates.resolved ? new Date().toISOString() : undefined;
  }

  if (typeof updates.comment === "string") {
    target.comment = updates.comment.trim();
  }

  if (typeof updates.suggestion === "string") {
    target.suggestion = updates.suggestion.trim();
  }

  if (updates.type) {
    target.type = updates.type;
  }

  await saveChangeReviews(repoRoot, changeId, existing);
  return target;
}

export async function deleteReviewComment(
  repoRoot: string,
  changeId: string,
  commentId: string,
): Promise<boolean> {
  const existing = await loadChangeReviews(repoRoot, changeId);
  const filtered = existing.filter((c) => c.id !== commentId);

  if (filtered.length === existing.length) {
    return false;
  }

  await saveChangeReviews(repoRoot, changeId, filtered);
  return true;
}

export async function applyReviewSuggestionsToSpec(
  repoRoot: string,
  changeId: string,
  commentIds?: string[],
): Promise<{ appliedCount: number; unresolvedCount: number; message: string }> {
  const comments = await loadChangeReviews(repoRoot, changeId);
  const targetComments = commentIds
    ? comments.filter((c) => commentIds.includes(c.id) && !c.resolved && c.suggestion)
    : comments.filter((c) => !c.resolved && c.suggestion);

  if (targetComments.length === 0) {
    return {
      appliedCount: 0,
      unresolvedCount: comments.filter((c) => !c.resolved).length,
      message: "No unresolved comments with direct text suggestions found.",
    };
  }

  const proposalPath = path.join(repoRoot, "openspec", "changes", changeId, "proposal.md");
  let proposalContent = "";
  try {
    proposalContent = await fs.readFile(proposalPath, "utf8");
  } catch {
    return {
      appliedCount: 0,
      unresolvedCount: comments.filter((c) => !c.resolved).length,
      message: `Could not read proposal.md for change "${changeId}".`,
    };
  }

  let appliedCount = 0;
  for (const comment of targetComments) {
    if (comment.selection && comment.suggestion) {
      if (proposalContent.includes(comment.selection)) {
        proposalContent = proposalContent.replace(comment.selection, comment.suggestion);
        comment.resolved = true;
        comment.resolvedAt = new Date().toISOString();
        appliedCount++;
      }
    }
  }

  if (appliedCount > 0) {
    await fs.writeFile(proposalPath, proposalContent, "utf8");
    await saveChangeReviews(repoRoot, changeId, comments);
  }

  const remaining = comments.filter((c) => !c.resolved).length;
  return {
    appliedCount,
    unresolvedCount: remaining,
    message: `Applied ${appliedCount} text suggestions to proposal.md. ${remaining} comments remaining.`,
  };
}

async function syncFeedbackMarkdown(
  repoRoot: string,
  changeId: string,
  comments: ReviewComment[],
): Promise<void> {
  const feedbackPath = getFeedbackMarkdownPath(repoRoot, changeId);
  const activeComments = comments.filter((c) => !c.resolved);

  if (activeComments.length === 0) {
    try {
      await fs.rm(feedbackPath, { force: true });
    } catch {
      // ignore
    }
    return;
  }

  let content = `# Human Review Feedback for Change \`${changeId}\`\n\n`;
  content += `> Total active review comments: ${activeComments.length}\n`;
  content += `> Last updated: ${new Date().toISOString()}\n\n`;

  for (const c of activeComments) {
    const icon = c.type === "change_request" ? "⚠️ [CHANGE REQUEST]" : "💬 [COMMENT]";
    content += `### ${icon} Section: ${c.sectionTitle || c.sectionId}\n`;
    content += `- **Author**: ${c.author} (${c.createdAt})\n`;
    if (c.selection) {
      content += `- **Referenced Text**:\n  > ${c.selection.split("\n").join("\n  > ")}\n`;
    }
    content += `- **Feedback**: ${c.comment}\n`;
    if (c.suggestion) {
      content += `- **Suggested Replacement**:\n  \`\`\`markdown\n  ${c.suggestion}\n  \`\`\`\n`;
    }
    content += "\n";
  }

  await fs.writeFile(feedbackPath, content, "utf8");
}
