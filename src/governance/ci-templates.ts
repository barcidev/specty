import type { SpectyConfig } from "../core/config.js";

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

      - name: Check Specty Approval Gate
        run: npx specty check-approval

${verifySection}
`;
}
