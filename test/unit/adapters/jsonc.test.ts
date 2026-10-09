import { describe, expect, it } from "vitest";
import { parseJsonc, stripJsoncComments } from "../../../src/adapters/jsonc.js";

describe("JSONC parser and comment stripping", () => {
  it("parses standard valid JSON without issues", () => {
    const raw = JSON.stringify({ name: "specty", version: "0.1.0", count: 42 });
    const result = parseJsonc(raw);
    expect(result).toEqual({ name: "specty", version: "0.1.0", count: 42 });
  });

  it("parses JSON with single-line comments", () => {
    const raw = `
    {
      // OpenCode configuration
      "name": "opencode",
      "enabled": true // inline comment
    }
    `;
    const result = parseJsonc<{ name: string; enabled: boolean }>(raw);
    expect(result).toEqual({ name: "opencode", enabled: true });
  });

  it("parses JSON with multi-line block comments", () => {
    const raw = `
    {
      /*
       * Multi-line block comment
       * explaining configuration
       */
      "theme": "dracula",
      /* another block */ "fontSize": 14
    }
    `;
    const result = parseJsonc<{ theme: string; fontSize: number }>(raw);
    expect(result).toEqual({ theme: "dracula", fontSize: 14 });
  });

  it("parses JSON with trailing commas in objects and arrays", () => {
    const raw = `
    {
      "instructions": [
        "AGENTS.md",
        "CUSTOM.md",
      ],
      "settings": {
        "autoSave": true,
      },
    }
    `;
    const result = parseJsonc<{ instructions: string[]; settings: { autoSave: boolean } }>(raw);
    expect(result?.instructions).toEqual(["AGENTS.md", "CUSTOM.md"]);
    expect(result?.settings).toEqual({ autoSave: true });
  });

  it("preserves strings containing slashes, URLs, and comment-like characters", () => {
    const raw = `
    {
      "$schema": "https://opencode.ai/config.json",
      "regex": "^//[a-z]+/*.*",
      "note": "Comment syntax: /* do not strip */ and // inside quotes"
    }
    `;
    const result = parseJsonc<Record<string, string>>(raw);
    expect(result?.$schema).toBe("https://opencode.ai/config.json");
    expect(result?.regex).toBe("^//[a-z]+/*.*");
    expect(result?.note).toBe("Comment syntax: /* do not strip */ and // inside quotes");
  });

  it("returns fallback for empty, whitespace, or invalid non-string input", () => {
    const fallback = { fallback: true };
    expect(parseJsonc("", fallback)).toEqual(fallback);
    expect(parseJsonc("   \n\t  ", fallback)).toEqual(fallback);
    expect(parseJsonc(null as unknown as string, fallback)).toEqual(fallback);
    expect(parseJsonc("")).toBeUndefined();
  });

  it("returns fallback when JSONC has unrecoverable syntax errors", () => {
    const fallback = { default: "structure" };
    const invalid = `{ "unclosed": "key", invalidToken: `;
    const result = parseJsonc(invalid, fallback);
    expect(result).toEqual(fallback);
  });

  it("returns undefined on invalid syntax when no fallback is provided", () => {
    const invalid = `{ "broken": `;
    const result = parseJsonc(invalid);
    expect(result).toBeUndefined();
  });

  it("strips comments cleanly using stripJsoncComments", () => {
    const raw = `
    // Leading comment
    {
      "key": "value" /* inline comment */
    }
    `;
    const stripped = stripJsoncComments(raw);
    expect(stripped).not.toContain("// Leading comment");
    expect(stripped).not.toContain("/* inline comment */");
    const parsed = JSON.parse(stripped);
    expect(parsed).toEqual({ key: "value" });
  });
});
