import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEUTRAL_UI_CONFIG,
  getUiAudienceOptions,
  getUiBorderRadiusOptions,
  getUiColorModeOptions,
  getUiPurposeOptions,
  getUiVisualEffectsOptions,
} from "../../../src/cli/commands/ui-style-options.js";

describe("cli/commands/ui-style-options", () => {
  it("provides default neutral UI configuration", () => {
    expect(DEFAULT_NEUTRAL_UI_CONFIG).toEqual({
      purpose: "general-purpose",
      targetAudience: "general-public",
      borderRadius: "semi-rounded",
      visualEffects: "subtle-elevation",
      colorMode: "both",
    });
  });

  it("returns purpose options in both Spanish and English with matching values", () => {
    const es = getUiPurposeOptions("es");
    const en = getUiPurposeOptions("en");

    expect(es.length).toBe(9);
    expect(en.length).toBe(9);
    expect(es.map((o) => o.value)).toEqual(en.map((o) => o.value));
    expect(es[0].value).toBe("general-purpose");
    expect(es.some((o) => o.value === "ecommerce")).toBe(true);
    expect(es.some((o) => o.value === "fintech")).toBe(true);
  });

  it("returns target audience options in both languages", () => {
    const es = getUiAudienceOptions("es");
    const en = getUiAudienceOptions("en");

    expect(es.length).toBe(5);
    expect(en.length).toBe(5);
    expect(es.map((o) => o.value)).toEqual(en.map((o) => o.value));
    expect(es.some((o) => o.value === "developers")).toBe(true);
    expect(es.some((o) => o.value === "professionals")).toBe(true);
  });

  it("returns border radius options including semi-rounded, rounded, and sharp", () => {
    const es = getUiBorderRadiusOptions("es");
    const en = getUiBorderRadiusOptions("en");

    expect(es.length).toBe(3);
    expect(en.length).toBe(3);
    expect(es.map((o) => o.value)).toEqual(["semi-rounded", "rounded", "sharp"]);
  });

  it("returns visual effects options in both languages", () => {
    const es = getUiVisualEffectsOptions("es");
    const en = getUiVisualEffectsOptions("en");

    expect(es.length).toBe(4);
    expect(en.length).toBe(4);
    expect(es.map((o) => o.value)).toEqual([
      "subtle-elevation",
      "glassmorphism",
      "hard-contrast",
      "minimal-flat",
    ]);
  });

  it("returns color mode options in both languages", () => {
    const es = getUiColorModeOptions("es");
    const en = getUiColorModeOptions("en");

    expect(es.length).toBe(3);
    expect(en.length).toBe(3);
    expect(es.map((o) => o.value)).toEqual(["both", "dark", "light"]);
  });
});
