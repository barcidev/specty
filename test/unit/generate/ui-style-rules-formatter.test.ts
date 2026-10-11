import { describe, expect, it } from "vitest";
import type { SpectyUiConfig } from "../../../src/core/config.js";
import { formatUiStyleRule } from "../../../src/generate/ui-style-rules-formatter.js";

describe("generate/ui-style-rules-formatter", () => {
  it("formats Spanish UI style rule with mandatory token protocol and user libraries block", () => {
    const config: SpectyUiConfig = {
      has_gui: true,
      is_customized: true,
      purpose: "ecommerce",
      target_audience: "general-public",
      border_radius: "rounded",
      visual_effects: "subtle-elevation",
      color_mode: "both",
    };

    const output = formatUiStyleRule(config, "es");

    expect(output).toContain("# Directivas de Estilo Visual y Diseno de Interfaces");
    expect(output).toContain("E-Commerce / Tienda Online");
    expect(output).toContain("Publico General (B2C)");
    expect(output).toContain("Redondeados pronunciados");
    expect(output).toContain("Regla del Primer Toque");
    expect(output).toContain("Priorizacion de Colores e Identidad en Proyectos Existentes");
    expect(output).toContain("Inferencia Armonica en Proyectos Nuevos");
    expect(output).toContain("Prohibicion Terminante de Estilos Hardcodeados");
    expect(output).toContain("<!-- USER_LIBRARIES_START -->");
    expect(output).toContain("<!-- USER_LIBRARIES_END -->");
  });

  it("formats English UI style rule with glassmorphism and sharp borders", () => {
    const config: SpectyUiConfig = {
      has_gui: true,
      is_customized: true,
      purpose: "saas-dashboard",
      target_audience: "developers",
      border_radius: "sharp",
      visual_effects: "glassmorphism",
      color_mode: "dark",
    };

    const output = formatUiStyleRule(config, "en");

    expect(output).toContain("# Visual Style & UI Design Directives");
    expect(output).toContain("SaaS / Admin Dashboard");
    expect(output).toContain("Developers / Engineers");
    expect(output).toContain("--radius: 0px;");
    expect(output).toContain("surface-blur");
    expect(output).toContain("First-Touch Rule");
    expect(output).toContain("Color Prioritization in Existing Projects");
    expect(output).toContain("Strict Prohibition of Hardcoded Styles");
    expect(output).toContain("<!-- USER_LIBRARIES_START -->");
  });

  it("formats default neutral general-purpose rule when customization is skipped", () => {
    const config: SpectyUiConfig = {
      has_gui: true,
      is_customized: false,
      purpose: "general-purpose",
      target_audience: "general-public",
      border_radius: "semi-rounded",
      visual_effects: "subtle-elevation",
      color_mode: "both",
    };

    const output = formatUiStyleRule(config, "es");

    expect(output).toContain("Proposito General / Neutro");
    expect(output).toContain("Semi-redondeados equilibrados");
    expect(output).toContain("--radius: 0.5rem;");
    expect(output).toContain("--shadow-card: 0 4px 16px -2px rgba(0,0,0,0.08);");
  });
});
