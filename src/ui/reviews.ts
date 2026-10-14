import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { setAgentSessionStatus } from "../governance/agent-session.js";
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
    ? comments.filter((c) => commentIds.includes(c.id) && !c.resolved)
    : comments.filter((c) => !c.resolved);

  if (targetComments.length === 0) {
    return {
      appliedCount: 0,
      unresolvedCount: 0,
      message: "No unresolved comments found.",
    };
  }

  const proposalPath = path.join(repoRoot, "openspec", "changes", changeId, "proposal.md");
  let proposalContent = "";
  try {
    proposalContent = await fs.readFile(proposalPath, "utf8");
  } catch {
    proposalContent = "";
  }

  let textReplacementsCount = 0;
  for (const comment of targetComments) {
    let applied = false;
    if (comment.selection && comment.suggestion && proposalContent) {
      if (proposalContent.includes(comment.selection)) {
        proposalContent = proposalContent.replace(comment.selection, comment.suggestion);
        textReplacementsCount++;
        applied = true;
      }
    }
    // Solo marcamos como resuelto automáticamente si hubo una sustitución textual efectiva en disco
    if (applied) {
      comment.resolved = true;
      comment.resolvedAt = new Date().toISOString();
    }
  }

  if (proposalContent && textReplacementsCount > 0) {
    await fs.writeFile(proposalPath, proposalContent, "utf8");
  }
  await saveChangeReviews(repoRoot, changeId, comments);

  const remaining = comments.filter((c) => !c.resolved).length;
  return {
    appliedCount: textReplacementsCount,
    unresolvedCount: remaining,
    message: textReplacementsCount > 0
      ? `Applied ${textReplacementsCount} direct textual replacements to proposal.md.`
      : "No direct textual replacements were matched in proposal.md.",
  };
}

/**
 * Despacha los comentarios y solicitudes de ajuste al asistente de IA en su sesión de chat/terminal,
 * aplicando reemplazos textuales directos y transicionando el estado de la sesión a 'processing_feedback'.
 */
export async function dispatchReviewsToAgent(
  repoRoot: string,
  changeId: string,
  commentIds?: string[],
): Promise<{ dispatchedCount: number; appliedCount: number; unresolvedCount: number; message: string }> {
  const applyResult = await applyReviewSuggestionsToSpec(repoRoot, changeId, commentIds);
  const comments = await loadChangeReviews(repoRoot, changeId);
  const remainingActive = comments.filter((c) => !c.resolved);

  // Notificar al asistente y bloquear la UI temporalmente contra aprobaciones de planes obsoletos
  await setAgentSessionStatus(repoRoot, "processing_feedback", {
    changeId,
    activity: remainingActive.length > 0
      ? `Asistente procesando ${remainingActive.length} ajuste(s) y reformulando plan en el chat`
      : "Ajustes textuales aplicados directamente a la propuesta",
  });

  return {
    dispatchedCount: remainingActive.length,
    appliedCount: applyResult.appliedCount,
    unresolvedCount: remainingActive.length,
    message: remainingActive.length > 0
      ? `${remainingActive.length} ajuste(s) enviados al asistente en el chat para reformular el plan.`
      : "Todos los ajustes textuales fueron aplicados directamente a la propuesta.",
  };
}

async function syncFeedbackMarkdown(
  repoRoot: string,
  changeId: string,
  comments: ReviewComment[],
): Promise<void> {
  const feedbackPath = getFeedbackMarkdownPath(repoRoot, changeId);
  const activeComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  if (comments.length === 0) {
    try {
      await fs.rm(feedbackPath, { force: true });
    } catch {
      // ignore
    }
    return;
  }

  let content = `# Human Review Feedback for Change \`${changeId}\`\n\n`;
  content += `> Total active review comments: ${activeComments.length}\n`;
  content += `> Total resolved/applied comments: ${resolvedComments.length}\n`;
  content += `> Last updated: ${new Date().toISOString()}\n\n`;

  const listToRender = activeComments.length > 0 ? activeComments : comments;
  for (const c of listToRender) {
    const statusTag = c.resolved
      ? "✓ [APPLIED VIA UI]"
      : c.type === "change_request"
        ? "⚠️ [CHANGE REQUEST]"
        : "💬 [COMMENT]";
    content += `### ${statusTag} Section: ${c.sectionTitle || c.sectionId}\n`;
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
