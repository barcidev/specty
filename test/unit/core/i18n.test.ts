import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  getDictionary,
  normalizeLanguage,
  translations,
} from "../../../src/core/i18n.js";

describe("core/i18n", () => {
  it("normalizes languages properly", () => {
    expect(normalizeLanguage("es")).toBe("es");
    expect(normalizeLanguage("ES")).toBe("es");
    expect(normalizeLanguage("es-MX")).toBe("es");
    expect(normalizeLanguage("Spanish")).toBe("es");
    expect(normalizeLanguage("español")).toBe("es");

    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("EN")).toBe("en");
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage("English")).toBe("en");

    expect(normalizeLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
    expect(normalizeLanguage("unknown")).toBe(DEFAULT_LANGUAGE);
  });

  it("provides dictionary for each supported language", () => {
    const esDict = getDictionary("es");
    const enDict = getDictionary("en");

    expect(esDict.cli.name).toBe("specty");
    expect(enDict.cli.name).toBe("specty");
  });

  it("enforces complete key parity between en and es translation dictionaries", () => {
    const getKeysDeep = (obj: Record<string, unknown>, prefix = ""): string[] => {
      let keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          keys = keys.concat(getKeysDeep(value as Record<string, unknown>, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    };

    const enKeys = getKeysDeep(translations.en as unknown as Record<string, unknown>);
    const esKeys = getKeysDeep(translations.es as unknown as Record<string, unknown>);

    expect(enKeys).toEqual(esKeys);
  });
});
