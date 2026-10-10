import type { CommitConvention, GitWorkflow } from "../../core/config.js";
import type { SupportedLanguage } from "../../core/i18n.js";

export interface GitWorkflowOption {
  value: GitWorkflow;
  label: string;
  hint: string;
  example: string;
}

export interface CommitConventionOption {
  value: CommitConvention;
  label: string;
  hint: string;
  example: string;
}

export function getGitWorkflowOptions(lang: SupportedLanguage = "es"): GitWorkflowOption[] {
  if (lang === "en") {
    return [
      {
        value: "feature-branch",
        label: "Feature Branch Workflow",
        hint: "Short-lived task branches merged into main via PR (Ex: feature/login-auth -> PR -> main)",
        example: "feature/login-auth -> PR -> main",
      },
      {
        value: "gitflow",
        label: "GitFlow",
        hint: "Parallel main/develop with feature/*, release/*, hotfix/* (Ex: feature/cart -> develop -> release/v1.0 -> main)",
        example: "feature/cart -> develop -> release/v1.0 -> main",
      },
      {
        value: "trunk-based",
        label: "Trunk-Based Development",
        hint: "Continuous trunk integration with short-lived branches < 1 day (Ex: short auth-fix -> daily merge to main)",
        example: "short auth-fix -> daily merge to main",
      },
      {
        value: "centralized",
        label: "Centralized Workflow",
        hint: "Direct commits to main branch without separate feature branches (Ex: git commit directly on main)",
        example: "git commit directly on main",
      },
      {
        value: "forking",
        label: "Forking Workflow",
        hint: "Developer-owned repository forks submitting PRs to upstream (Ex: fork:feature/api -> PR to upstream:main)",
        example: "fork:feature/api -> PR to upstream:main",
      },
    ];
  }

  return [
    {
      value: "feature-branch",
      label: "Feature Branch Workflow",
      hint: "Ramas cortas por tarea integradas vía PR a main (Ej: feature/login-auth -> PR -> main)",
      example: "feature/login-auth -> PR -> main",
    },
    {
      value: "gitflow",
      label: "GitFlow",
      hint: "Ramas main y develop con feature/*, release/*, hotfix/* (Ej: feature/cart -> develop -> release/v1.0 -> main)",
      example: "feature/cart -> develop -> release/v1.0 -> main",
    },
    {
      value: "trunk-based",
      label: "Trunk-Based Development",
      hint: "Integración continua en main con ramas cortas < 1 día (Ej: auth-fix -> merge diario en main)",
      example: "auth-fix -> merge diario en main",
    },
    {
      value: "centralized",
      label: "Centralizado (Centralized Workflow)",
      hint: "Commits directos en main sin ramas de funcionalidad (Ej: git commit directo en main)",
      example: "git commit directo en main",
    },
    {
      value: "forking",
      label: "Forking Workflow",
      hint: "Bifurcaciones (forks) independientes con PRs hacia upstream (Ej: fork:feature/api -> PR a upstream:main)",
      example: "fork:feature/api -> PR a upstream:main",
    },
  ];
}

export function getCommitConventionOptions(
  lang: SupportedLanguage = "es",
): CommitConventionOption[] {
  if (lang === "en") {
    return [
      {
        value: "conventional",
        label: "Conventional Commits",
        hint: "Semantic type(scope): message (Ex: feat(auth): add google oauth2 login)",
        example: "feat(auth): add google oauth2 login",
      },
      {
        value: "classic",
        label: "Classic / Standard",
        hint: "Concise imperative title without tags (Ex: Add Google OAuth2 login authentication)",
        example: "Add Google OAuth2 login authentication",
      },
      {
        value: "gitmoji",
        label: "Gitmoji",
        hint: "Semantic emojis categorizing intention (Ex: ✨ Add Google OAuth2 login authentication)",
        example: "✨ Add Google OAuth2 login authentication",
      },
      {
        value: "ticket",
        label: "Ticket-based (Issue / Task ID)",
        hint: "Ticket code prefix (Ex: [PROJ-123] Add Google OAuth2 login authentication)",
        example: "[PROJ-123] Add Google OAuth2 login authentication",
      },
      {
        value: "gitmoji-conventional",
        label: "Hybrid: Gitmoji + Conventional Commits",
        hint: "Emoji followed by type(scope) (Ex: ✨ feat(auth): add google oauth2 login)",
        example: "✨ feat(auth): add google oauth2 login",
      },
      {
        value: "conventional-ticket",
        label: "Hybrid: Conventional Commits + Tickets",
        hint: "Type(scope) with ticket code integrated (Ex: feat(auth): [PROJ-123] add google oauth2 login)",
        example: "feat(auth): [PROJ-123] add google oauth2 login",
      },
      {
        value: "gitmoji-ticket",
        label: "Hybrid: Gitmoji + Tickets",
        hint: "Emoji followed by ticket code (Ex: ✨ [PROJ-123] Add Google OAuth2 login authentication)",
        example: "✨ [PROJ-123] Add Google OAuth2 login authentication",
      },
      {
        value: "gitmoji-conventional-ticket",
        label: "Hybrid: Gitmoji + Conventional + Tickets",
        hint: "Emoji with type(scope) and ticket code combined (Ex: ✨ feat(auth): [PROJ-123] add google oauth2 login)",
        example: "✨ feat(auth): [PROJ-123] add google oauth2 login",
      },
    ];
  }

  return [
    {
      value: "conventional",
      label: "Conventional Commits",
      hint: "Formato estructurado tipo(alcance): mensaje (Ej: feat(auth): add google oauth2 login)",
      example: "feat(auth): add google oauth2 login",
    },
    {
      value: "classic",
      label: "Estándar Clásico",
      hint: "Título imperativo claro y conciso sin prefijos (Ej: Add Google OAuth2 login authentication)",
      example: "Add Google OAuth2 login authentication",
    },
    {
      value: "gitmoji",
      label: "Gitmoji",
      hint: "Emojis semánticos al inicio para categorizar el cambio (Ej: ✨ Add Google OAuth2 login authentication)",
      example: "✨ Add Google OAuth2 login authentication",
    },
    {
      value: "ticket",
      label: "Basada en Tickets",
      hint: "Código de ticket o issue como prefijo (Ej: [PROJ-123] Add Google OAuth2 login authentication)",
      example: "[PROJ-123] Add Google OAuth2 login authentication",
    },
    {
      value: "gitmoji-conventional",
      label: "Híbrido: Gitmoji + Conventional Commits",
      hint: "Emoji semántico seguido de tipo(alcance) (Ej: ✨ feat(auth): add google oauth2 login)",
      example: "✨ feat(auth): add google oauth2 login",
    },
    {
      value: "conventional-ticket",
      label: "Híbrido: Conventional Commits + Tickets",
      hint: "Tipo(alcance) con código de ticket integrado (Ej: feat(auth): [PROJ-123] add google oauth2 login)",
      example: "feat(auth): [PROJ-123] add google oauth2 login",
    },
    {
      value: "gitmoji-ticket",
      label: "Híbrido: Gitmoji + Basada en Tickets",
      hint: "Emoji semántico seguido de código de ticket (Ej: ✨ [PROJ-123] Add Google OAuth2 login authentication)",
      example: "✨ [PROJ-123] Add Google OAuth2 login authentication",
    },
    {
      value: "gitmoji-conventional-ticket",
      label: "Híbrido: Gitmoji + Conventional Commits + Tickets",
      hint: "Emoji semántico con tipo(alcance) y ticket combinados (Ej: ✨ feat(auth): [PROJ-123] add google oauth2 login)",
      example: "✨ feat(auth): [PROJ-123] add google oauth2 login",
    },
  ];
}
