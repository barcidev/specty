import * as diff from "diff";

export function hasDifferences(oldContent: string, newContent: string): boolean {
  return oldContent !== newContent;
}

export function createUnifiedDiff(
  oldContent: string,
  newContent: string,
  fileName = "file",
): string {
  const patch = diff.createPatch(fileName, oldContent, newContent, "current", "proposed");
  return patch;
}
