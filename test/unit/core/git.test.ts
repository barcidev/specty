import { describe, expect, it } from "vitest";
import { getCurrentBranch, getGitUser, isInsideGitRepo } from "../../../src/core/git.js";

describe("core/git", () => {
  it("detects current repository environment", async () => {
    const isRepo = await isInsideGitRepo(process.cwd());
    expect(isRepo).toBe(true);

    const branch = await getCurrentBranch(process.cwd());
    expect(branch).toBeTruthy();
    expect(typeof branch).toBe("string");

    const user = await getGitUser(process.cwd());
    expect(user.name).toBeDefined();
    expect(user.email).toBeDefined();
  });
});
