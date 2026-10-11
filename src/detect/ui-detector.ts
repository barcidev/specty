import fs from "node:fs/promises";
import path from "node:path";
import type { DetectedUiStyle, DetectedUiToken } from "./types.js";

const KNOWN_UI_DEPENDENCIES: Array<{
  pattern: RegExp;
  name: string;
}> = [
  { pattern: /^tailwindcss$|^@tailwindcss\//, name: "Tailwind CSS" },
  { pattern: /^@radix-ui\//, name: "Radix UI" },
  { pattern: /^@shadcn\/ui$|^shadcn-ui$/, name: "shadcn/ui" },
  { pattern: /^@mui\/material$|^@material-ui\/core$|^@mui\/joy$/, name: "Material UI (MUI)" },
  { pattern: /^antd$/, name: "Ant Design" },
  { pattern: /^@chakra-ui\/react$/, name: "Chakra UI" },
  { pattern: /^@mantine\/core$/, name: "Mantine" },
  { pattern: /^@taiga-ui\//, name: "Taiga UI" },
  { pattern: /^vuetify$/, name: "Vuetify" },
  { pattern: /^lucide-react$|^lucide-vue-next$|^lucide-angular$|^lucide$/, name: "Lucide Icons" },
  { pattern: /^framer-motion$|^motion$/, name: "Framer Motion" },
  { pattern: /^@nextui-org\/react$|^@heroui\/react$/, name: "HeroUI / NextUI" },
  { pattern: /^daisyui$/, name: "DaisyUI" },
  { pattern: /^@tabler\/icons-react$/, name: "Tabler Icons" },
  { pattern: /^styled-components$/, name: "Styled Components" },
  { pattern: /^@emotion\/react$/, name: "Emotion" },
  { pattern: /^sass$/, name: "Sass / SCSS" },
];

const COMMON_STYLESHEET_PATHS = [
  "src/globals.css",
  "app/globals.css",
  "src/app/globals.css",
  "src/index.css",
  "src/styles.css",
  "src/styles/globals.css",
  "src/styles/tokens.css",
  "src/styles/theme.css",
  "src/styles/index.css",
  "src/App.css",
  "styles/globals.css",
  "styles.css",
  "globals.css",
  "index.css",
];

const SIGNIFICANT_TOKEN_PREFIXES = [
  "--primary",
  "--background",
  "--foreground",
  "--accent",
  "--secondary",
  "--muted",
  "--border",
  "--radius",
  "--card",
  "--ring",
];

function parseRadius(value: string): "rounded" | "semi-rounded" | "sharp" | undefined {
  const clean = value.trim().toLowerCase();
  if (clean === "0" || clean === "0px" || clean === "0rem") {
    return "sharp";
  }

  const pxMatch = clean.match(/^([0-9]+(?:\.[0-9]+)?)px$/);
  if (pxMatch?.[1]) {
    const px = Number.parseFloat(pxMatch[1]);
    if (px >= 12) return "rounded";
    if (px >= 4) return "semi-rounded";
    return "sharp";
  }

  const remMatch = clean.match(/^([0-9]+(?:\.[0-9]+)?)rem$/);
  if (remMatch?.[1]) {
    const rem = Number.parseFloat(remMatch[1]);
    if (rem >= 0.75) return "rounded";
    if (rem >= 0.25) return "semi-rounded";
    return "sharp";
  }

  return undefined;
}

export async function detectProjectUiStyle(repoRoot: string): Promise<DetectedUiStyle> {
  const librariesSet = new Set<string>();
  const evidence: string[] = [];
  const tokens: DetectedUiToken[] = [];
  const tokenNamesSet = new Set<string>();

  let hasDarkTheme = false;
  let detectedRadius: "rounded" | "semi-rounded" | "sharp" | undefined;

  // 1. Inspect package.json
  const pkgPath = path.join(repoRoot, "package.json");
  try {
    const pkgContent = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    for (const [dep] of Object.entries(allDeps)) {
      for (const { pattern, name } of KNOWN_UI_DEPENDENCIES) {
        if (pattern.test(dep)) {
          librariesSet.add(name);
          evidence.push(`package.json: ${dep}`);
        }
      }
      if (dep === "next-themes") {
        hasDarkTheme = true;
        evidence.push("package.json: next-themes");
      }
    }
  } catch {
    // package.json does not exist or invalid JSON
  }

  // 2. Check UI configuration files
  const configFiles = [
    { file: "components.json", library: "shadcn/ui" },
    { file: "tailwind.config.js", library: "Tailwind CSS" },
    { file: "tailwind.config.ts", library: "Tailwind CSS" },
    { file: "tailwind.config.mjs", library: "Tailwind CSS" },
    { file: "tailwind.config.cjs", library: "Tailwind CSS" },
  ];

  for (const { file, library } of configFiles) {
    try {
      await fs.access(path.join(repoRoot, file));
      librariesSet.add(library);
      evidence.push(file);
    } catch {
      // not found
    }
  }

  // 3. Inspect Flutter / Dart UI
  try {
    const pubspecPath = path.join(repoRoot, "pubspec.yaml");
    const pubspec = await fs.readFile(pubspecPath, "utf-8");
    if (pubspec.includes("flutter:") || pubspec.includes("sdk: flutter")) {
      librariesSet.add("Flutter UI");
      evidence.push("pubspec.yaml: flutter");
    }
  } catch {
    // not Flutter
  }

  // 4. Scan stylesheet files for tokens and themes
  for (const relStylePath of COMMON_STYLESHEET_PATHS) {
    const fullStylePath = path.join(repoRoot, relStylePath);
    try {
      const content = await fs.readFile(fullStylePath, "utf-8");
      evidence.push(relStylePath);

      if (
        content.includes(".dark") ||
        content.includes("[data-theme='dark']") ||
        content.includes('[data-theme="dark"]') ||
        content.includes("prefers-color-scheme: dark")
      ) {
        hasDarkTheme = true;
      }

      // Regex for CSS variable declarations: --var-name: value;
      const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
      let match: RegExpExecArray | null = varRegex.exec(content);
      while (match !== null) {
        const varName = match[1]?.trim() ?? "";
        const varValue = match[2]?.trim() ?? "";

        if (varName && varValue) {
          const isSignificant = SIGNIFICANT_TOKEN_PREFIXES.some((prefix) =>
            varName.startsWith(prefix),
          );

          if (isSignificant && !tokenNamesSet.has(varName)) {
            tokenNamesSet.add(varName);
            tokens.push({ name: varName, value: varValue });
          }

          if ((varName === "--radius" || varName === "--border-radius") && !detectedRadius) {
            detectedRadius = parseRadius(varValue);
          }
        }

        match = varRegex.exec(content);
      }
    } catch {
      // file does not exist, continue
    }
  }

  const libraries = Array.from(librariesSet);
  const hasGui = libraries.length > 0 || tokens.length > 0 || evidence.length > 0;

  let colorMode: "both" | "dark" | "light" | undefined;
  if (hasDarkTheme) {
    colorMode = "both";
  } else if (hasGui) {
    colorMode = "light";
  }

  return {
    hasGui,
    libraries,
    colorMode,
    borderRadius: detectedRadius,
    tokens,
    evidence,
  };
}
