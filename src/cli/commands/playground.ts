import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import { execa } from "execa";
import pc from "picocolors";
import { logger } from "../../core/logger.js";
import { executeInit } from "./init.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface PlaygroundInitOptions {
  dir?: string;
  lang?: string;
  tool?: string | string[];
  specEngine?: "openspec" | "builtin";
  yes?: boolean;
}

export interface PlaygroundCleanOptions {
  dir?: string;
}

export interface StackDescriptor {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const AVAILABLE_STACKS: StackDescriptor[] = [
  {
    id: "angular-app",
    name: "Angular 19",
    category: "Frontend Web",
    description: "Angular standalone components con TypeScript",
  },
  {
    id: "react-vite",
    name: "React 19 + Vite",
    category: "Frontend Web",
    description: "Single-Page Application con Vite y TypeScript",
  },
  {
    id: "nextjs-app",
    name: "Next.js 15",
    category: "Fullstack Web",
    description: "Next.js App Router con React Server Components",
  },
  {
    id: "nestjs-prisma",
    name: "NestJS 10 + Prisma",
    category: "Backend Node",
    description: "API REST modular con Prisma ORM",
  },
  {
    id: "django-app",
    name: "Django 5",
    category: "Backend Python",
    description: "Aplicación web completa con Django",
  },
  {
    id: "fastapi-app",
    name: "FastAPI",
    category: "Backend Python",
    description: "API asíncrona de alto rendimiento con Python",
  },
  {
    id: "go-service",
    name: "Go Service",
    category: "Backend Go",
    description: "Microservicio REST con Gin Framework y Go 1.23",
  },
  {
    id: "dotnet-webapi",
    name: ".NET 8 Web API",
    category: "Backend .NET",
    description: "ASP.NET Core Web API con C#",
  },
  {
    id: "flutter-app",
    name: "Flutter",
    category: "Mobile",
    description: "Aplicación multiplataforma con Dart",
  },
  {
    id: "spring-boot-maven",
    name: "Spring Boot 3",
    category: "Backend Java",
    description: "Servicio REST corporativo con Maven",
  },
  {
    id: "ktor-gradle",
    name: "Ktor",
    category: "Backend Kotlin",
    description: "Servidor asíncrono liviano con Gradle Kotlin DSL",
  },
  {
    id: "rails-app",
    name: "Ruby on Rails 7",
    category: "Fullstack Ruby",
    description: "Framework MVC ágil en Ruby",
  },
  {
    id: "laravel-app",
    name: "Laravel 11",
    category: "Fullstack PHP",
    description: "Aplicación web PHP moderna con Artisan",
  },
  {
    id: "rust-cli",
    name: "Rust App",
    category: "Systems / Rust",
    description: "Servicio o CLI en Rust con Actix / Tokio",
  },
  {
    id: "cpp-cmake",
    name: "C++ CMake",
    category: "Systems / C++",
    description: "Proyecto C++ nativo con compilación CMake",
  },
  {
    id: "monorepo-polyglot",
    name: "Monorepo Políglota",
    category: "Monorepo",
    description: "Workspace pnpm con frontend Next.js, API Go y worker Python",
  },
];

export function resolveFixturesBaseDir(): string {
  const candidates = [
    path.resolve(__dirname, "../test/fixtures"),
    path.resolve(__dirname, "../../test/fixtures"),
    path.resolve(process.cwd(), "test/fixtures"),
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), "test/fixtures");
}

export async function executePlaygroundList(): Promise<void> {
  console.log(`\n${pc.bold(pc.cyan("specty playground - Stacks Disponibles"))}\n`);
  console.log(
    pc.dim(
      "Instancia cualquiera de estos proyectos para probar specty y asistentes de IA interactivamente.\n",
    ),
  );

  const categories = [...new Set(AVAILABLE_STACKS.map((s) => s.category))];

  for (const cat of categories) {
    console.log(pc.bold(pc.yellow(`[${cat}]`)));
    const items = AVAILABLE_STACKS.filter((s) => s.category === cat);
    for (const item of items) {
      console.log(
        `  ${pc.green(item.id.padEnd(20))} ${pc.bold(item.name.padEnd(22))} ${pc.dim(item.description)}`,
      );
    }
    console.log();
  }

  console.log(
    pc.dim("Ejecuta 'specty playground init <stack>' para instanciar uno en ./playground/<stack>"),
  );
}

export async function executePlaygroundInit(
  stackArg?: string,
  options: PlaygroundInitOptions = {},
): Promise<string> {
  let selectedStack = stackArg;

  if (!selectedStack) {
    const res = await p.select({
      message: "Selecciona el stack para instanciar el Playground:",
      options: AVAILABLE_STACKS.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.id})`,
        hint: s.description,
      })),
    });

    if (p.isCancel(res)) {
      p.cancel("Operación cancelada.");
      process.exit(0);
    }

    selectedStack = String(res);
  }

  const stackDef = AVAILABLE_STACKS.find((s) => s.id === selectedStack);
  if (!stackDef) {
    throw new Error(
      `Stack desconocido: '${selectedStack}'. Ejecuta 'specty playground list' para ver las opciones.`,
    );
  }

  const fixturesBase = resolveFixturesBaseDir();
  const sourceFixtureDir = path.join(fixturesBase, selectedStack);

  const targetDir = options.dir
    ? path.resolve(options.dir)
    : path.resolve(process.cwd(), "playground", selectedStack);

  logger.info(`Preparando Playground '${selectedStack}' en: ${targetDir}`);

  // Clean existing target if exists
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  // Copy fixture files
  await fs.cp(sourceFixtureDir, targetDir, { recursive: true });

  // Initialize git repo
  try {
    await execa("git", ["init", "-b", "main"], { cwd: targetDir });
    await execa("git", ["config", "user.name", "Specty Tester"], { cwd: targetDir });
    await execa("git", ["config", "user.email", "test@specty.dev"], { cwd: targetDir });
    await execa("git", ["add", "."], { cwd: targetDir });
    await execa("git", ["commit", "-m", "chore: initial commit"], { cwd: targetDir });
  } catch (err) {
    logger.warn(`No se pudo inicializar git en el playground: ${err}`);
  }

  // Run specty init
  const lang = options.lang || "es";
  const specEngine = options.specEngine || "builtin";
  const tools = options.tool || ["antigravity", "cursor", "claude", "github-copilot"];

  await executeInit({
    cwd: targetDir,
    yes: true,
    lang,
    specEngine,
    tool: tools,
  });

  // Create PLAYGROUND_GUIDE.md
  const guideContent = `# Guía del Playground de specty: ${stackDef.name}

Este entorno está listo para probar la gobernanza de asistentes de IA (Cursor, Antigravity, Claude Code, GitHub Copilot) en un proyecto real de **${stackDef.name}**.

---

## 🚀 Flujo de Prueba Recomendado

### 1. Abre este directorio en tu editor
\`\`\`bash
cd "${targetDir}"
# Para Cursor:
cursor .
# Para VS Code / Antigravity:
code .
\`\`\`

### 2. Comprueba las directivas de soberanía
Observa los archivos generados:
- \`AGENTS.md\`: Fuente soberana de verdad sobre arquitectura y restricciones.
- \`.specty/config.yaml\`: Configuración del proyecto y comandos de verificación.
- \`.cursor/rules/\`, \`CLAUDE.md\`, \`.github/copilot-instructions.md\`: Reglas sincronizadas para cada IA.

### 3. Pide a la IA que cree una especificación de cambio
Indícale al asistente:
> "Crea una propuesta de cambio para agregar un endpoint de health check con OpenSpec en openspec/changes/001-health-check"

Debe crear:
- \`openspec/changes/001-health-check/proposal.md\`
- \`openspec/changes/001-health-check/tasks.md\`

### 4. Prueba la Puerta de Gobernanza Git (Pre-commit)
Si la IA modifica código fuente antes de aprobar la especificación:
\`\`\`bash
git add .
git commit -m "feat: bypass gate"
\`\`\`
**Resultado esperado:** El commit será bloqueado indicando que no hay cambios aprobados.

### 5. Aprueba el cambio humano
\`\`\`bash
npx @barcidev/specty approve 001-health-check
\`\`\`

### 6. Aplica los cambios de código y confirma
Ahora el commit funcionará normalmente porque la especificación está aprobada y el hash SHA-256 coincide.
\`\`\`bash
git commit -m "feat(health): implement endpoint"
\`\`\`

### 7. Comprueba el estado y diagnósticos
\`\`\`bash
npx @barcidev/specty status
npx @barcidev/specty doctor
\`\`\`

### 8. Simula un traspaso entre roles (Handoff)
\`\`\`bash
npx @barcidev/specty handoff create 001-health-check --from backend --to qa
\`\`\`
`;

  await fs.writeFile(path.join(targetDir, "PLAYGROUND_GUIDE.md"), guideContent, "utf8");

  console.log(`\n${pc.bold(pc.green("✓ ¡Playground instanciado con éxito!"))}`);
  console.log(`📁 Directorio: ${pc.cyan(targetDir)}`);
  console.log(`📖 Guía de prueba: ${pc.yellow(path.join(targetDir, "PLAYGROUND_GUIDE.md"))}`);
  console.log(`\nComienza ejecutando:`);
  console.log(`  ${pc.bold(`cd "${targetDir}"`)}`);
  console.log(`  ${pc.bold("cursor .  # o code .")}\n`);

  return targetDir;
}

export async function executePlaygroundClean(options: PlaygroundCleanOptions = {}): Promise<void> {
  const targetDir = options.dir
    ? path.resolve(options.dir)
    : path.resolve(process.cwd(), "playground");

  await fs.rm(targetDir, { recursive: true, force: true });
  console.log(`\n${pc.green("✓ Directorio de playgrounds limpiado:")} ${targetDir}\n`);
}
