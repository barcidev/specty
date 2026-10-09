import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupportedLanguage } from "../core/i18n.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Finds the absolute path to the templates directory.
 */
export function getTemplatesRootDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../templates"),
    path.resolve(__dirname, "../templates"),
    path.resolve(__dirname, "./templates"),
    path.resolve(process.cwd(), "templates"),
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? path.resolve(process.cwd(), "templates");
}

/**
 * Renders a string template by replacing {{key}} tokens.
 */
export function renderTemplateString(
  template: string,
  variables: Record<string, string | number | boolean | undefined>,
): string {
  return template.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, key: string) => {
    const val = variables[key];
    if (val !== undefined && val !== null) {
      return String(val);
    }
    return match;
  });
}

/**
 * Reads a template file from templates/<lang>/<relPath> and returns its content.
 */
export async function loadTemplate(lang: SupportedLanguage, relativePath: string): Promise<string> {
  const root = getTemplatesRootDir();
  const filePath = path.join(root, lang, relativePath);

  try {
    return await fs.readFile(filePath, "utf8");
  } catch (_err: unknown) {
    // Fallback to English if not found in requested language
    if (lang !== "en") {
      const fallbackPath = path.join(root, "en", relativePath);
      return await fs.readFile(fallbackPath, "utf8");
    }
    throw new Error(`Template not found: "${relativePath}" (searched in ${filePath})`);
  }
}
