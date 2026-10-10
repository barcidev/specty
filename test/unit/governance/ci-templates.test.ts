import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "../../../src/core/config.js";
import {
  generateAzurePipelines,
  generateBitbucketPipelines,
  generateCiPipeline,
  generateGitHubWorkflow,
  generateGitLabCi,
} from "../../../src/governance/ci-templates.js";

describe("CI Templates Generation", () => {
  const sampleConfig = createDefaultConfig({
    scopes: [
      {
        path: ".",
        stack: { language: "typescript", frameworks: [] },
        verify: {
          lint: "npm run lint",
          test: "npm test",
        },
      },
    ],
  });

  it("generates GitHub Actions workflow", () => {
    const content = generateGitHubWorkflow(sampleConfig);
    expect(content).toContain("name: Specty Governance & Verification");
    expect(content).toContain("specty gate --comment");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm test");
  });

  it("generates GitLab CI configuration", () => {
    const content = generateGitLabCi(sampleConfig);
    expect(content).toContain("specty-governance-gate:");
    expect(content).toContain("specty gate --output-comment");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm test");
  });

  it("generates Azure Pipelines configuration", () => {
    const content = generateAzurePipelines(sampleConfig);
    expect(content).toContain("vmImage: 'ubuntu-latest'");
    expect(content).toContain("specty gate --output-comment");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm test");
  });

  it("generates Bitbucket Pipelines configuration", () => {
    const content = generateBitbucketPipelines(sampleConfig);
    expect(content).toContain("pipelines:");
    expect(content).toContain("specty gate --output-comment");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm test");
  });

  it("dispatches correctly using generateCiPipeline", () => {
    const ghRes = generateCiPipeline({
      ...sampleConfig,
      governance: { ...sampleConfig.governance, ci: "github" },
    });
    expect(ghRes?.relativePath).toBe(".github/workflows/specty.yml");

    const glRes = generateCiPipeline({
      ...sampleConfig,
      governance: { ...sampleConfig.governance, ci: "gitlab" },
    });
    expect(glRes?.relativePath).toBe(".gitlab-ci.yml");

    const azRes = generateCiPipeline({
      ...sampleConfig,
      governance: { ...sampleConfig.governance, ci: "azure" },
    });
    expect(azRes?.relativePath).toBe("azure-pipelines.yml");

    const bbRes = generateCiPipeline({
      ...sampleConfig,
      governance: { ...sampleConfig.governance, ci: "bitbucket" },
    });
    expect(bbRes?.relativePath).toBe("bitbucket-pipelines.yml");

    const noneRes = generateCiPipeline({
      ...sampleConfig,
      governance: { ...sampleConfig.governance, ci: "none" },
    });
    expect(noneRes).toBeNull();
  });
});
