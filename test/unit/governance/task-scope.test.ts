import { describe, expect, it } from "vitest";
import {
  getActiveTask,
  getAllTasksFileGlobs,
  isPathMatchingGlobs,
  parseTasksWithScope,
} from "../../../src/governance/task-scope.js";

describe("task-scope", () => {
  const sampleTasks = `# Tasks: Sample Change

## 1. Data Layer
- [x] 1.1 Define database schema [agent: data] [files: prisma/schema.prisma, src/db/**]
      verify: npx prisma validate

## 2. Business Logic
- [ ] 2.1 Implement auth service [agent: backend] [files: src/auth/**, src/services/auth.ts]
      verify: npm run test:auth

## 3. Frontend Integration
- [ ] 3.1 Build login form [agent: frontend] [files: src/ui/login.tsx]
`;

  it("parses tasks correctly with role, files globs, and verify commands", () => {
    const tasks = parseTasksWithScope(sampleTasks);
    expect(tasks).toHaveLength(3);

    expect(tasks[0]).toEqual({
      id: "1.1",
      description:
        "1.1 Define database schema [agent: data] [files: prisma/schema.prisma, src/db/**]",
      completed: true,
      role: "data",
      filesGlobs: ["prisma/schema.prisma", "src/db/**"],
      verifyCommand: "npx prisma validate",
    });

    expect(tasks[1]).toEqual({
      id: "2.1",
      description:
        "2.1 Implement auth service [agent: backend] [files: src/auth/**, src/services/auth.ts]",
      completed: false,
      role: "backend",
      filesGlobs: ["src/auth/**", "src/services/auth.ts"],
      verifyCommand: "npm run test:auth",
    });

    expect(tasks[2]).toEqual({
      id: "3.1",
      description: "3.1 Build login form [agent: frontend] [files: src/ui/login.tsx]",
      completed: false,
      role: "frontend",
      filesGlobs: ["src/ui/login.tsx"],
      verifyCommand: null,
    });
  });

  it("identifies the active task as the first incomplete task", () => {
    const tasks = parseTasksWithScope(sampleTasks);
    const active = getActiveTask(tasks);
    expect(active?.id).toBe("2.1");
    expect(active?.role).toBe("backend");
  });

  it("aggregates all file scope globs across all tasks", () => {
    const tasks = parseTasksWithScope(sampleTasks);
    const globs = getAllTasksFileGlobs(tasks);
    expect(globs).toEqual([
      "prisma/schema.prisma",
      "src/db/**",
      "src/auth/**",
      "src/services/auth.ts",
      "src/ui/login.tsx",
    ]);
  });

  it("matches paths against globs properly", () => {
    const globs = ["src/auth/**", "src/services/auth.ts", "prisma/*.prisma"];

    expect(isPathMatchingGlobs("src/auth/jwt.ts", globs)).toBe(true);
    expect(isPathMatchingGlobs("src/services/auth.ts", globs)).toBe(true);
    expect(isPathMatchingGlobs("./src/auth/nested/util.ts", globs)).toBe(true);
    expect(isPathMatchingGlobs("prisma/schema.prisma", globs)).toBe(true);

    expect(isPathMatchingGlobs("src/ui/login.tsx", globs)).toBe(false);
    expect(isPathMatchingGlobs("src/services/user.ts", globs)).toBe(false);
    expect(isPathMatchingGlobs("README.md", globs)).toBe(false);
  });
});
