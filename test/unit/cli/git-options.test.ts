import { describe, expect, it } from "vitest";
import {
  getCommitConventionOptions,
  getGitWorkflowOptions,
} from "../../../src/cli/commands/git-options.js";
import {
  COMMIT_CONVENTIONS,
  type CommitConvention,
  GIT_WORKFLOWS,
} from "../../../src/core/config.js";
import { formatGitRuleContent } from "../../../src/generate/git-rules-formatter.js";

describe("cli/commands/git-options", () => {
  it("provides all Git workflow options with hints and examples in Spanish and English", () => {
    for (const lang of ["es", "en"] as const) {
      const options = getGitWorkflowOptions(lang);
      expect(options.length).toBe(GIT_WORKFLOWS.length);
      for (const opt of options) {
        expect(GIT_WORKFLOWS).toContain(opt.value);
        expect(opt.label).toBeTruthy();
        expect(opt.hint).toBeTruthy();
        expect(opt.example).toBeTruthy();
        expect(opt.hint).toContain(opt.example);
      }
    }
  });

  it("provides all 8 commit conventions (base and hybrid permutations) with concrete examples", () => {
    for (const lang of ["es", "en"] as const) {
      const options = getCommitConventionOptions(lang);
      expect(options.length).toBe(COMMIT_CONVENTIONS.length);
      expect(options.length).toBe(8);

      const values = options.map((o) => o.value);
      expect(values).toEqual([
        "conventional",
        "classic",
        "gitmoji",
        "ticket",
        "gitmoji-conventional",
        "conventional-ticket",
        "gitmoji-ticket",
        "gitmoji-conventional-ticket",
      ]);

      for (const opt of options) {
        expect(opt.label).toBeTruthy();
        expect(opt.hint).toBeTruthy();
        expect(opt.example).toBeTruthy();
        expect(opt.hint).toContain(opt.example);
      }
    }
  });

  it("formats git rules accurately for all workflows in Spanish and English", () => {
    for (const wf of GIT_WORKFLOWS) {
      const contentEs = formatGitRuleContent("es", wf, "conventional");
      expect(contentEs).toContain("Regla Core: Convenciones Git");
      expect(contentEs).toContain("feat(auth): add google oauth2 login");

      const contentEn = formatGitRuleContent("en", wf, "conventional");
      expect(contentEn).toContain("Core Rule: Git Conventions");
      expect(contentEn).toContain("feat(auth): add google oauth2 login");
    }
  });

  it("formats git rules accurately for all commit conventions including hybrid permutations", () => {
    const expectations: Record<string, string> = {
      conventional: "feat(auth): add google oauth2 login",
      classic: "Add Google OAuth2 login authentication",
      gitmoji: "✨ Add Google OAuth2 login authentication",
      ticket: "[PROJ-123] Add Google OAuth2 login authentication",
      "gitmoji-conventional": "✨ feat(auth): add google oauth2 login",
      "conventional-ticket": "feat(auth): [PROJ-123] add google oauth2 login",
      "gitmoji-ticket": "✨ [PROJ-123] Add Google OAuth2 login authentication",
      "gitmoji-conventional-ticket": "✨ feat(auth): [PROJ-123] add google oauth2 login",
    };

    for (const [conv, example] of Object.entries(expectations)) {
      const contentEs = formatGitRuleContent("es", "feature-branch", conv as CommitConvention);
      expect(contentEs).toContain(example);

      const contentEn = formatGitRuleContent("en", "feature-branch", conv as CommitConvention);
      expect(contentEn).toContain(example);
    }
  });
});
