import { type ParseError, type ParseOptions, parse, stripComments } from "jsonc-parser";

export interface ParseJsoncOptions extends ParseOptions {
  /**
   * If true, syntax errors during parsing will cause the function to return the fallback value.
   * Default: true
   */
  strictOnError?: boolean;
}

/**
 * Safely parses a JSONC (JSON with Comments and Trailing Commas) string.
 *
 * @param text The input JSONC or JSON string.
 * @param fallback Optional fallback value if parsing fails or input is invalid.
 * @param options Parse options passed to jsonc-parser.
 */
export function parseJsonc<T = Record<string, unknown>>(
  text: string,
  fallback: T,
  options?: ParseJsoncOptions,
): T;
export function parseJsonc<T = Record<string, unknown>>(
  text: string,
  fallback?: undefined,
  options?: ParseJsoncOptions,
): T | undefined;
export function parseJsonc<T = Record<string, unknown>>(
  text: string,
  fallback?: T,
  options?: ParseJsoncOptions,
): T | undefined {
  if (typeof text !== "string" || text.trim() === "") {
    return fallback;
  }

  const errors: ParseError[] = [];
  const parseOptions: ParseOptions = {
    allowTrailingComma: options?.allowTrailingComma ?? true,
    disallowComments: options?.disallowComments ?? false,
    allowEmptyContent: options?.allowEmptyContent ?? true,
  };

  const result = parse(text, errors, parseOptions);

  const strictOnError = options?.strictOnError ?? true;
  if (strictOnError && errors.length > 0) {
    return fallback;
  }

  if (result === undefined) {
    return fallback;
  }

  return result as T;
}

/**
 * Strips comments from a JSONC string while preserving structure.
 */
export function stripJsoncComments(text: string, replaceCh?: string): string {
  if (typeof text !== "string") {
    return "";
  }
  return stripComments(text, replaceCh);
}
