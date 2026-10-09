import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertSafeRepoPath, isSensitivePath, normalizePath } from "../../../src/core/paths.js";

describe("core/paths", () => {
  it("normalizes backslashes to forward slashes", () => {
    expect(normalizePath("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("permits safe paths inside repo root", () => {
    const root = path.resolve("/fake/repo");
    const target = assertSafeRepoPath(root, "src/index.ts");
    expect(normalizePath(target)).toBe(normalizePath(path.join(root, "src/index.ts")));
  });

  it("throws on path traversal outside repo root", () => {
    const root = path.resolve("/fake/repo");
    expect(() => assertSafeRepoPath(root, "../secret.txt")).toThrow("Security error");
    expect(() => assertSafeRepoPath(root, "../../etc/passwd")).toThrow("Security error");
  });

  it("detects sensitive and secret paths", () => {
    expect(isSensitivePath(".env")).toBe(true);
    expect(isSensitivePath(".env.local")).toBe(true);
    expect(isSensitivePath("id_rsa")).toBe(true);
    expect(isSensitivePath("server.key")).toBe(true);
    expect(isSensitivePath("cert.pem")).toBe(true);
    expect(isSensitivePath("src/index.ts")).toBe(false);
    expect(isSensitivePath("README.md")).toBe(false);
  });
});
