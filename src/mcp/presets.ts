import type { McpServerDefinition } from "../core/config.js";

export interface McpPreset {
  id: string;
  name: string;
  description: string;
  server: McpServerDefinition;
}

export const MCP_PRESETS: Record<string, McpPreset> = {
  jira: {
    id: "jira",
    name: "Atlassian Jira",
    description: "Atlassian Jira issues and sprint tracking",
    server: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-jira"],
      env: {
        JIRA_URL: "https://your-domain.atlassian.net",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional env var placeholder
        JIRA_API_TOKEN: "${JIRA_API_TOKEN}",
        JIRA_EMAIL: "dev@example.com",
      },
      transport: "stdio",
      description: "Atlassian Jira project & issue tracking",
      roles: ["orchestrator"],
    },
  },
  "azure-devops": {
    id: "azure-devops",
    name: "Azure DevOps",
    description: "Azure DevOps boards, work items, and pull requests",
    server: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-azure-devops"],
      env: {
        AZURE_DEVOPS_ORG_URL: "https://dev.azure.com/your-org",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional env var placeholder
        AZURE_DEVOPS_PAT: "${AZURE_DEVOPS_PAT}",
      },
      transport: "stdio",
      description: "Azure DevOps work items & pipelines",
      roles: ["orchestrator", "security-review"],
    },
  },
  postgres: {
    id: "postgres",
    name: "PostgreSQL Database",
    description: "PostgreSQL schema inspection, tables, and read-only queries",
    server: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/app_db"],
      transport: "stdio",
      description: "PostgreSQL database schema and queries",
      roles: ["data", "backend"],
    },
  },
  figma: {
    id: "figma",
    name: "Figma Design",
    description: "Figma design system tokens, assets, and UI components",
    server: {
      command: "npx",
      args: ["-y", "figma-mcp-server"],
      env: {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional env var placeholder
        FIGMA_ACCESS_TOKEN: "${FIGMA_ACCESS_TOKEN}",
      },
      transport: "stdio",
      description: "Figma design system tokens and component specs",
      roles: ["frontend"],
    },
  },
  github: {
    id: "github",
    name: "GitHub",
    description: "GitHub repositories, issues, releases, and PR tracking",
    server: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional env var placeholder
        GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}",
      },
      transport: "stdio",
      description: "GitHub issues and repository automation",
      roles: ["orchestrator", "testing"],
    },
  },
};

export function getMcpPreset(id: string): McpPreset | undefined {
  return MCP_PRESETS[id];
}

export function listMcpPresets(): McpPreset[] {
  return Object.values(MCP_PRESETS);
}
