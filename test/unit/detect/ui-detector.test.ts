import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultDetectorRegistry } from "../../../src/detect/detector-registry.js";
import { detectProjectUiStyle } from "../../../src/detect/ui-detector.js";

describe("detect/ui-detector", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-ui-detect-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("detects brownfield UI stack with Tailwind, shadcn, Radix and Lucide", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          tailwindcss: "^3.4.0",
          "@radix-ui/react-dialog": "^1.0.0",
          "lucide-react": "^0.300.0",
          "framer-motion": "^11.0.0",
        },
      }),
    );
    await fs.writeFile(path.join(tempDir, "components.json"), "{}");

    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "src", "globals.css"),
      `:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
}`,
    );

    const result = await detectProjectUiStyle(tempDir);

    expect(result.hasGui).toBe(true);
    expect(result.libraries).toContain("Tailwind CSS");
    expect(result.libraries).toContain("shadcn/ui");
    expect(result.libraries).toContain("Radix UI");
    expect(result.libraries).toContain("Lucide Icons");
    expect(result.libraries).toContain("Framer Motion");
    expect(result.colorMode).toBe("both");
    expect(result.borderRadius).toBe("semi-rounded");

    const tokenNames = result.tokens.map((t) => t.name);
    expect(tokenNames).toContain("--primary");
    expect(tokenNames).toContain("--background");
    expect(tokenNames).toContain("--radius");
  });

  it("detects rounded border radius geometry from 16px or 1rem", async () => {
    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "src", "index.css"),
      `:root {
  --primary: #2563eb;
  --radius: 16px;
}`,
    );

    const result = await detectProjectUiStyle(tempDir);
    expect(result.hasGui).toBe(true);
    expect(result.borderRadius).toBe("rounded");
    expect(result.colorMode).toBe("light");
  });

  it("detects sharp border radius geometry from 0px", async () => {
    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "src", "index.css"),
      `:root {
  --primary: #000000;
  --radius: 0px;
}`,
    );

    const result = await detectProjectUiStyle(tempDir);
    expect(result.hasGui).toBe(true);
    expect(result.borderRadius).toBe("sharp");
  });

  it("detects next-themes and config files", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          "next-themes": "^0.2.1",
          antd: "^5.0.0",
        },
      }),
    );
    await fs.writeFile(path.join(tempDir, "tailwind.config.ts"), "export default {};");

    const result = await detectProjectUiStyle(tempDir);
    expect(result.hasGui).toBe(true);
    expect(result.libraries).toContain("Ant Design");
    expect(result.libraries).toContain("Tailwind CSS");
    expect(result.colorMode).toBe("both");
  });

  it("returns hasGui: false for pure backend project without UI", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          express: "^4.18.0",
          cors: "^2.8.5",
        },
      }),
    );

    const result = await detectProjectUiStyle(tempDir);
    expect(result.hasGui).toBe(false);
    expect(result.libraries).toEqual([]);
    expect(result.tokens).toEqual([]);
  });

  it("integrates ui detection into DetectorRegistry.detectRepository", async () => {
    await fs.writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          vue: "^3.0.0",
          vuetify: "^3.0.0",
        },
      }),
    );

    const repoResult = await defaultDetectorRegistry.detectRepository(tempDir);
    expect(repoResult.ui).toBeDefined();
    expect(repoResult.ui?.hasGui).toBe(true);
    expect(repoResult.ui?.libraries).toContain("Vuetify");
  });
});
