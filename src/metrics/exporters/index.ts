import fs from "node:fs/promises";
import path from "node:path";
import { computeGovernanceAnalytics } from "../analytics.js";
import type { ExportReportOptions, ExportResult, GovernanceExecutiveReport } from "../types.js";
import { generateHtmlReport } from "./html-exporter.js";
import { generateMarkdownReport } from "./markdown-exporter.js";

export * from "./html-exporter.js";
export * from "./markdown-exporter.js";

export async function exportGovernanceReport(
  repoRoot: string,
  options: ExportReportOptions = {},
): Promise<ExportResult> {
  const report: GovernanceExecutiveReport = await computeGovernanceAnalytics(repoRoot, {
    period: options.period,
    title: options.title,
  });

  const nowIsoDate = new Date().toISOString().slice(0, 10);
  const defaultDir = path.join(repoRoot, ".specty", "reports");
  await fs.mkdir(defaultDir, { recursive: true });

  const generatedFiles: { format: "html" | "markdown"; path: string }[] = [];

  let format = options.format;
  if (!format) {
    if (options.outputPath?.endsWith(".md")) {
      format = "markdown";
    } else if (options.outputPath?.endsWith(".html")) {
      format = "html";
    } else {
      format = "html";
    }
  }

  if (format === "html" || format === "all") {
    let htmlPath = options.outputPath;
    if (!htmlPath) {
      htmlPath = path.join(defaultDir, `governance-report-${nowIsoDate}.html`);
    } else if (htmlPath.endsWith(".md")) {
      htmlPath = htmlPath.replace(/\.md$/, ".html");
    } else if (!htmlPath.endsWith(".html")) {
      htmlPath = `${htmlPath}.html`;
    }

    const parentDir = path.dirname(htmlPath);
    await fs.mkdir(parentDir, { recursive: true });

    const htmlContent = generateHtmlReport(report);
    await fs.writeFile(htmlPath, htmlContent, "utf8");
    generatedFiles.push({ format: "html", path: htmlPath });
  }

  if (format === "markdown" || format === "all") {
    let mdPath = options.outputPath;
    if (!mdPath) {
      mdPath = path.join(defaultDir, `governance-report-${nowIsoDate}.md`);
    } else if (mdPath.endsWith(".html")) {
      mdPath = mdPath.replace(/\.html$/, ".md");
    } else if (!mdPath.endsWith(".md")) {
      mdPath = `${mdPath}.md`;
    }

    const parentDir = path.dirname(mdPath);
    await fs.mkdir(parentDir, { recursive: true });

    const mdContent = generateMarkdownReport(report);
    await fs.writeFile(mdPath, mdContent, "utf8");
    generatedFiles.push({ format: "markdown", path: mdPath });
  }

  return { report, generatedFiles };
}
