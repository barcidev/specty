import type { SpectyConfig } from "../core/config.js";

function getVerifyCommands(config: SpectyConfig): string[] {
  const commands: string[] = [];
  for (const scope of config.scopes) {
    for (const [_key, cmd] of Object.entries(scope.verify)) {
      if (cmd) {
        if (scope.path === ".") {
          commands.push(cmd);
        } else {
          commands.push(`(cd ${scope.path} && ${cmd})`);
        }
      }
    }
  }
  return commands.length > 0 ? commands : ["npm test || true"];
}

export function generateGitHubWorkflow(config: SpectyConfig): string {
  const verifySteps: string[] = [];

  for (const scope of config.scopes) {
    for (const [key, cmd] of Object.entries(scope.verify)) {
      if (cmd) {
        verifySteps.push(
          `      - name: Verify ${scope.path} (${key})\n        run: ${cmd}\n        working-directory: ${scope.path === "." ? "." : scope.path}`,
        );
      }
    }
  }

  const verifySection =
    verifySteps.length > 0
      ? verifySteps.join("\n")
      : "      - name: Verify build\n        run: npm test || true";

  return `name: Specty Governance & Verification

on:
  pull_request:
    branches: [main, master, develop]
  push:
    branches: [main, master]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  governance-gate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci || npm install

      - name: Check Specty Approval Gate & PR Report
        run: npx specty gate --comment
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

${verifySection}
`;
}

export function generateGitLabCi(config: SpectyConfig): string {
  const verifyCommands = getVerifyCommands(config);
  const verifySection = verifyCommands.map((cmd) => `    - ${cmd}`).join("\n");

  return `stages:
  - governance
  - verify

default:
  image: node:22

variables:
  GIT_DEPTH: 0

specty-governance-gate:
  stage: governance
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main" || $CI_COMMIT_BRANCH == "develop"
  before_script:
    - npm ci || npm install
  script:
    - npx specty gate --output-comment specty-gate-report.md
  artifacts:
    when: always
    paths:
      - specty-gate-report.md
    expire_in: 1 week

specty-verify:
  stage: verify
  dependencies:
    - specty-governance-gate
  before_script:
    - npm ci || npm install
  script:
${verifySection}
`;
}

export function generateAzurePipelines(config: SpectyConfig): string {
  const verifyCommands = getVerifyCommands(config);
  const verifySteps = verifyCommands
    .map((cmd, i) => `  - script: ${cmd}\n    displayName: 'Verify Step ${i + 1}'`)
    .join("\n");

  return `trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - checkout: self
    fetchDepth: 0

  - task: NodeTool@0
    inputs:
      versionSpec: '22.x'
    displayName: 'Install Node.js 22'

  - script: npm ci || npm install
    displayName: 'Install dependencies'

  - script: npx specty gate --output-comment $(Build.ArtifactStagingDirectory)/specty-gate-report.md
    displayName: 'Check Specty Approval Gate'

${verifySteps}
`;
}

export function generateBitbucketPipelines(config: SpectyConfig): string {
  const verifyCommands = getVerifyCommands(config);
  const verifySection = verifyCommands.map((cmd) => `            - ${cmd}`).join("\n");

  return `image: node:22

pipelines:
  pull-requests:
    '**':
      - step:
          name: Specty Governance Gate & Verification
          clone:
            depth: full
          caches:
            - node
          script:
            - npm ci || npm install
            - npx specty gate --output-comment specty-gate-report.md
${verifySection}
  branches:
    '{main,master,develop}':
      - step:
          name: Specty Verification
          clone:
            depth: full
          caches:
            - node
          script:
            - npm ci || npm install
            - npx specty gate
${verifySection}
`;
}

export function generateCiPipeline(
  config: SpectyConfig,
): { relativePath: string; content: string } | null {
  const ciProvider = config.governance.ci;
  switch (ciProvider) {
    case "github":
      return {
        relativePath: ".github/workflows/specty.yml",
        content: generateGitHubWorkflow(config),
      };
    case "gitlab":
      return {
        relativePath: ".gitlab-ci.yml",
        content: generateGitLabCi(config),
      };
    case "azure":
      return {
        relativePath: "azure-pipelines.yml",
        content: generateAzurePipelines(config),
      };
    case "bitbucket":
      return {
        relativePath: "bitbucket-pipelines.yml",
        content: generateBitbucketPipelines(config),
      };
    default:
      return null;
  }
}
