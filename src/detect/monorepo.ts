import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import yaml from "yaml";
import type { MonorepoDetection } from "./types.js";

export async function detectMonorepo(repoRoot: string): Promise<MonorepoDetection> {
  // 1. Melos (Flutter / Dart)
  try {
    const melosPath = path.join(repoRoot, "melos.yaml");
    const raw = await fs.readFile(melosPath, "utf8");
    const parsed = yaml.parse(raw) || {};
    const globs = Array.isArray(parsed.packages) ? parsed.packages : ["packages/*"];
    const pkgPaths = await resolveGlobsToDirs(repoRoot, globs);
    return {
      isMonorepo: true,
      kind: "melos",
      packageGlobs: globs,
      packagePaths: pkgPaths,
    };
  } catch {
    // not melos
  }

  // 2. pnpm workspace
  try {
    const pnpmPath = path.join(repoRoot, "pnpm-workspace.yaml");
    const raw = await fs.readFile(pnpmPath, "utf8");
    const parsed = yaml.parse(raw) || {};
    const globs = Array.isArray(parsed.packages) ? parsed.packages : ["packages/*"];
    const pkgPaths = await resolveGlobsToDirs(repoRoot, globs);
    return {
      isMonorepo: true,
      kind: "pnpm",
      packageGlobs: globs,
      packagePaths: pkgPaths,
    };
  } catch {
    // not pnpm
  }

  // 3. package.json workspaces (npm / yarn / bun)
  try {
    const pkgPath = path.join(repoRoot, "package.json");
    const raw = await fs.readFile(pkgPath, "utf8");
    const parsed = JSON.parse(raw) || {};
    let globs: string[] = [];

    if (Array.isArray(parsed.workspaces)) {
      globs = parsed.workspaces;
    } else if (parsed.workspaces && Array.isArray(parsed.workspaces.packages)) {
      globs = parsed.workspaces.packages;
    }

    if (globs.length > 0) {
      // Check nx / turbo / lerna
      let kind: "npm" | "nx" | "turbo" | "lerna" = "npm";
      try {
        await fs.access(path.join(repoRoot, "turbo.json"));
        kind = "turbo";
      } catch {
        try {
          await fs.access(path.join(repoRoot, "nx.json"));
          kind = "nx";
        } catch {
          try {
            await fs.access(path.join(repoRoot, "lerna.json"));
            kind = "lerna";
          } catch {
            // plain npm
          }
        }
      }

      const pkgPaths = await resolveGlobsToDirs(repoRoot, globs);
      return {
        isMonorepo: true,
        kind,
        packageGlobs: globs,
        packagePaths: pkgPaths,
      };
    }
  } catch {
    // not package.json
  }

  // 4. .NET sln with multiple projects
  const slnFiles = await fg("*.sln", { cwd: repoRoot, onlyFiles: true });
  if (slnFiles.length > 0) {
    const csprojFiles = await fg("**/*.csproj", { cwd: repoRoot, onlyFiles: true });
    if (csprojFiles.length > 1) {
      const packagePaths = [
        ...new Set(csprojFiles.map((f) => path.dirname(f).replace(/\\/g, "/"))),
      ];
      return {
        isMonorepo: true,
        kind: "dotnet-sln",
        packageGlobs: ["**/*.csproj"],
        packagePaths,
      };
    }
  }

  // 5. Cargo workspace (Rust)
  try {
    const cargoPath = path.join(repoRoot, "Cargo.toml");
    const raw = await fs.readFile(cargoPath, "utf8");
    if (raw.includes("[workspace]")) {
      let globs = ["crates/*"];
      const membersMatch = raw.match(/members\s*=\s*\[([\s\S]*?)\]/);
      if (membersMatch?.[1]) {
        const parsedMembers = membersMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
        if (parsedMembers.length > 0) {
          globs = parsedMembers;
        }
      }
      const pkgPaths = await resolveGlobsToDirs(repoRoot, globs);
      return {
        isMonorepo: true,
        kind: "cargo",
        packageGlobs: globs,
        packagePaths: pkgPaths,
      };
    }
  } catch {
    // not cargo
  }

  return {
    isMonorepo: false,
    packageGlobs: [],
    packagePaths: [],
  };
}

async function resolveGlobsToDirs(repoRoot: string, globs: string[]): Promise<string[]> {
  const dirs: string[] = [];
  for (const pattern of globs) {
    const entries = await fg(pattern, {
      cwd: repoRoot,
      onlyDirectories: true,
    });
    for (const entry of entries) {
      dirs.push(entry.replace(/\\/g, "/"));
    }
  }
  return [...new Set(dirs)].sort();
}
