import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addReviewComment,
  applyReviewSuggestionsToSpec,
  deleteReviewComment,
  getFeedbackMarkdownPath,
  loadChangeReviews,
  updateReviewComment,
} from "../../../src/ui/reviews.js";

describe("ui/reviews", () => {
  let tempDir: string;
  const changeId = "feature-auth";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-ui-reviews-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("adds, lists, updates, and deletes review comments", async () => {
    const comment1 = await addReviewComment(tempDir, changeId, {
      sectionId: "why",
      sectionTitle: "Why",
      comment: "Necesitamos clarificar el impacto en OAuth 2.0",
      type: "change_request",
      author: "alice",
    });

    expect(comment1.id).toMatch(/^rev-/);
    expect(comment1.resolved).toBe(false);

    let reviews = await loadChangeReviews(tempDir, changeId);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].comment).toBe("Necesitamos clarificar el impacto en OAuth 2.0");

    // Add second comment
    const comment2 = await addReviewComment(tempDir, changeId, {
      sectionId: "impact",
      sectionTitle: "Impact",
      selection: "Node.js 18",
      comment: "Actualizar a Node.js 22",
      suggestion: "Node.js 22 LTS",
      type: "comment",
      author: "bob",
    });

    reviews = await loadChangeReviews(tempDir, changeId);
    expect(reviews).toHaveLength(2);

    // Verify feedback markdown file was generated
    const feedbackMdPath = getFeedbackMarkdownPath(tempDir, changeId);
    const feedbackMd = await fs.readFile(feedbackMdPath, "utf8");
    expect(feedbackMd).toContain("Human Review Feedback for Change `feature-auth`");
    expect(feedbackMd).toContain("OAuth 2.0");
    expect(feedbackMd).toContain("Node.js 22 LTS");

    // Update / resolve first comment
    const updated = await updateReviewComment(tempDir, changeId, comment1.id, {
      resolved: true,
    });
    expect(updated?.resolved).toBe(true);
    expect(updated?.resolvedAt).toBeDefined();

    // Delete second comment
    const deleted = await deleteReviewComment(tempDir, changeId, comment2.id);
    expect(deleted).toBe(true);

    const remaining = await loadChangeReviews(tempDir, changeId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(comment1.id);
  });

  it("applies direct text suggestions to proposal.md", async () => {
    const changeDir = path.join(tempDir, "openspec", "changes", changeId);
    await fs.mkdir(changeDir, { recursive: true });

    const initialProposal = [
      "# Change Proposal: Auth Overhaul",
      "",
      "## Why",
      "Current auth uses basic auth tokens.",
      "",
      "## Impact",
      "We target Node.js 18 and Redis 6.",
    ].join("\n");

    await fs.writeFile(path.join(changeDir, "proposal.md"), initialProposal, "utf8");

    // Add review comment with suggestion
    await addReviewComment(tempDir, changeId, {
      sectionId: "impact",
      selection: "Node.js 18 and Redis 6",
      comment: "Actualizar versiones soportadas",
      suggestion: "Node.js 22 LTS and Redis 7",
      type: "change_request",
      author: "lead-dev",
    });

    const result = await applyReviewSuggestionsToSpec(tempDir, changeId);
    expect(result.appliedCount).toBe(1);
    expect(result.unresolvedCount).toBe(0);

    const updatedProposal = await fs.readFile(path.join(changeDir, "proposal.md"), "utf8");
    expect(updatedProposal).toContain("We target Node.js 22 LTS and Redis 7.");

    // Comment should now be resolved
    const reviews = await loadChangeReviews(tempDir, changeId);
    expect(reviews[0].resolved).toBe(true);
  });
});
