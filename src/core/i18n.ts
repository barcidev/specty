export type SupportedLanguage = "en" | "es";

export const DEFAULT_LANGUAGE: SupportedLanguage = "es";

export interface TranslationDictionary {
  cli: {
    name: string;
    description: string;
    initDescription: string;
    doctorDescription: string;
    statusDescription: string;
    approveDescription: string;
    verifyDescription: string;
    checkApprovalDescription: string;
    syncDescription: string;
    langSetDescription: string;
    mcpDescription: string;
    indexDescription: string;
    metricsDescription: string;
    updateDescription: string;
    uninstallDescription: string;
  };
  init: {
    welcome: string;
    languagePrompt: string;
    detectingStack: string;
    stackDetected: string;
    projectKindPrompt: string;
    projectKindNew: string;
    projectKindExisting: string;
    structurePrompt: string;
    structureMonolith: string;
    structureMonorepo: string;
    structureWorkspace: string;
    monorepoToolPrompt: string;
    workspaceComponentsPrompt: string;
    newProjectLanguagePrompt: string;
    newProjectFrameworkPrompt: string;
    toolsPrompt: string;
    enginePrompt: string;
    mcpPrompt: string;
    autoIndexPrompt: string;
    hooksPrompt: string;
    ciPrompt: string;
    gitWorkflowPrompt: string;
    commitConventionPrompt: string;
    hasGuiPrompt: string;
    uiCustomizePrompt: string;
    uiCustomizeOptionCustom: string;
    uiCustomizeOptionDefault: string;
    uiPurposePrompt: string;
    uiAudiencePrompt: string;
    uiBorderRadiusPrompt: string;
    uiVisualEffectsPrompt: string;
    uiColorModePrompt: string;
    uiDetectedLibraries: string;
    uiMissingLibrariesPrompt: string;
    uiMissingLibrariesPlaceholder: string;
    uiStyleNotice: string;
    summaryTitle: string;
    confirmPrompt: string;
    canceled: string;
    success: string;
  };
  doctor: {
    checkingEnvironment: string;
    openspecOk: string;
    openspecMismatch: string;
    filesSynced: string;
    filesOutOfSync: string;
    hooksInstalled: string;
    hooksMissing: string;
  };
  governance: {
    noApprovedChange: string;
    changeApproved: string;
    hashMismatchReapprove: string;
    bypassUsed: string;
    verifySuccess: string;
    verifyFailure: string;
  };
  errors: {
    outsideRepo: string;
    sensitiveFile: string;
    fileNotFound: string;
    configInvalid: string;
    unsupportedLanguage: string;
  };
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    cli: {
      name: "specty",
      description: "Specification-driven AI assistant governance and scaffolding CLI",
      initDescription: "interactive onboarding and complete repository scaffolding",
      doctorDescription: "diagnose installation, OpenSpec version, and configuration sync",
      statusDescription: "list changes with status, progress, and pending tasks",
      approveDescription: "mark a change as approved recording approver, timestamp, and hash",
      verifyDescription: "run stack and spec verification commands and store results",
      checkApprovalDescription: "verify that code modifications belong to an approved change",
      syncDescription: "regenerate AI tool files from AGENTS.md without overwriting edits",
      langSetDescription: "change generated files language and update unedited blocks",
      mcpDescription: "start the local MCP server (stdio) for code graph and metrics",
      indexDescription: "build or incrementally update the code graph index",
      metricsDescription: "display or export flow metrics (JSON / CSV)",
      updateDescription: "refresh templates and rules respecting user customizations",
      uninstallDescription:
        "remove specty configuration, adapters, or purge all traces from project",
    },
    init: {
      welcome: "Welcome to specty - AI assistant governance setup",
      languagePrompt: "Select the language for generated configuration and specs:",
      detectingStack: "Analyzing repository stack and frameworks...",
      stackDetected: "Detected stack:",
      projectKindPrompt: "Is this a new or existing project?",
      projectKindNew: "New project (guided architecture setup)",
      projectKindExisting: "Existing project (brownfield analysis and incremental specs)",
      structurePrompt: "What repository structure will this project use?",
      structureMonolith: "Monolith (Single Project)",
      structureMonorepo: "Monorepo (Multi-package / Orchestrated)",
      structureWorkspace: "Workspace (Polyglot / Multi-stack)",
      monorepoToolPrompt: "Select the monorepo orchestration tool:",
      workspaceComponentsPrompt: "Select workspace components, frameworks, and languages:",
      newProjectLanguagePrompt: "Select the programming language for the new project:",
      newProjectFrameworkPrompt: "Select the primary framework or runtime environment:",
      toolsPrompt: "Select AI assistant tools to configure:",
      enginePrompt: "Select spec engine:",
      mcpPrompt: "Enable MCP code graph server and metrics?",
      autoIndexPrompt: "Index repository into codebase-memory knowledge graph upon completion?",
      hooksPrompt: "Configure git pre-commit hooks and IDE guards?",
      ciPrompt: "Generate CI workflow template?",
      gitWorkflowPrompt: "Select Git branching workflow:",
      commitConventionPrompt: "Select commit message convention:",
      hasGuiPrompt: "Will the project have a graphical user interface (web, mobile, or desktop)?",
      uiCustomizePrompt:
        "Do you want to customize the interface visual style now or use the default neutral style?",
      uiCustomizeOptionCustom:
        "Customize now (purpose, audience, borders, effects, and color mode)",
      uiCustomizeOptionDefault:
        "Use recommended general-purpose neutral style by default (clean, adaptable)",
      uiPurposePrompt: "What is the primary focus / purpose of the application?",
      uiAudiencePrompt: "Who is the primary target audience for the interface?",
      uiBorderRadiusPrompt: "Select corner / border radius geometry for components and cards:",
      uiVisualEffectsPrompt: "Select surface treatment, shadows, and transparency effects:",
      uiColorModePrompt: "Select color scheme mode (dark, light, or both):",
      uiDetectedLibraries: "Detected UI libraries and styling:",
      uiMissingLibrariesPrompt:
        "Are any UI libraries or frameworks missing? (enter comma-separated names, or press Enter to skip):",
      uiMissingLibrariesPlaceholder: "e.g. lucide-react, framer-motion, @tanstack/react-query",
      uiStyleNotice:
        "UI style directives and token rules generated at .specty/rules/core/ui-style.md. You can declare specific component libraries in that file.",
      summaryTitle: "Setup configuration summary",
      confirmPrompt: "Apply this configuration to the repository?",
      canceled: "Setup canceled by user.",
      success: "specty initialization completed successfully!",
    },
    doctor: {
      checkingEnvironment: "Checking specty installation and environment...",
      openspecOk: "OpenSpec version 1.14.1 is properly installed.",
      openspecMismatch: "OpenSpec version mismatch or not installed.",
      filesSynced: "All tool files are synchronized with AGENTS.md.",
      filesOutOfSync: "Some tool files are out of sync with AGENTS.md.",
      hooksInstalled: "Git governance hooks are active.",
      hooksMissing: "Git governance hooks are missing or not executable.",
    },
    governance: {
      noApprovedChange: "Error: Source code modifications detected without an approved change.",
      changeApproved: "Change approved successfully.",
      hashMismatchReapprove: "Warning: Spec content modified after approval. Re-approval required.",
      bypassUsed: "Audit: Emergency bypass used for commit.",
      verifySuccess: "Verification passed successfully.",
      verifyFailure: "Verification failed for one or more commands.",
    },
    errors: {
      outsideRepo: "Operation aborted: file path is outside the repository root.",
      sensitiveFile: "Operation aborted: attempt to access or modify sensitive/secret file.",
      fileNotFound: "File not found:",
      configInvalid: "Invalid .specty/config.yaml configuration:",
      unsupportedLanguage: "Unsupported language specified:",
    },
  },
  es: {
    cli: {
      name: "specty",
      description:
        "CLI de gobernanza y scaffolding para asistentes de IA guiados por especificaciones",
      initDescription: "onboarding interactivo y scaffolding completo del repositorio",
      doctorDescription: "diagnostica la instalacion, version de OpenSpec y sincronizacion",
      statusDescription: "lista los changes con estado, progreso y tareas pendientes",
      approveDescription: "marca un change como aprobado registrando persona, fecha y hash",
      verifyDescription: "ejecuta comandos de verificacion del stack y spec guardando resultados",
      checkApprovalDescription:
        "comprueba que los cambios de codigo correspondan a un change aprobado",
      syncDescription: "regenera los archivos de herramientas desde AGENTS.md sin pisar ediciones",
      langSetDescription: "cambia el idioma de los archivos generados y actualiza bloques intactos",
      mcpDescription: "inicia el servidor MCP local (stdio) de grafo de codigo y metricas",
      indexDescription: "construye o actualiza incrementalmente el grafo de codigo",
      metricsDescription: "muestra o exporta las metricas del flujo (JSON / CSV)",
      updateDescription: "refresca plantillas y reglas respetando personalizaciones",
      uninstallDescription:
        "eliminar la configuracion y adaptadores de specty, o purgar todos los registros del proyecto",
    },
    init: {
      welcome: "Bienvenido a specty - Configuracion de gobernanza para asistentes de IA",
      languagePrompt: "Selecciona el idioma para los archivos de configuracion y specs:",
      detectingStack: "Analizando stack y frameworks del repositorio...",
      stackDetected: "Stack detectado:",
      projectKindPrompt: "¿El proyecto es nuevo o existente?",
      projectKindNew: "Proyecto nuevo (seleccion guiada de arquitectura)",
      projectKindExisting: "Proyecto existente (analisis brownfield y specs incrementales)",
      structurePrompt: "¿Qué estructura tendrá el repositorio?",
      structureMonolith: "Monolito (Single Project)",
      structureMonorepo: "Monorepo (Multi-paquete / Orquestado)",
      structureWorkspace: "Workspace (Políglota / Multi-stack)",
      monorepoToolPrompt: "Selecciona la herramienta orquestadora del monorepo:",
      workspaceComponentsPrompt:
        "Selecciona los componentes, frameworks y lenguajes del workspace:",
      newProjectLanguagePrompt: "Selecciona el lenguaje de programación del nuevo proyecto:",
      newProjectFrameworkPrompt: "Selecciona el framework o entorno principal:",
      toolsPrompt: "Selecciona las herramientas de IA a configurar:",
      enginePrompt: "Selecciona el motor de specs:",
      mcpPrompt: "¿Activar servidor MCP de grafo de codigo y metricas?",
      autoIndexPrompt: "¿Indexar el repositorio en el grafo de codebase-memory al finalizar?",
      hooksPrompt: "¿Configurar hooks pre-commit de git y compuertas de IDE?",
      ciPrompt: "¿Generar plantilla de CI para integracion continua?",
      gitWorkflowPrompt: "Selecciona el flujo de trabajo de Git (branching workflow):",
      commitConventionPrompt: "Selecciona la convención para los mensajes de commit:",
      hasGuiPrompt: "¿El proyecto contará con interfaz gráfica (web, móvil o escritorio)?",
      uiCustomizePrompt:
        "¿Deseas personalizar el estilo visual de la interfaz ahora o usar el estilo neutral por defecto?",
      uiCustomizeOptionCustom:
        "Personalizar ahora (propósito, audiencia, bordes, efectos y colores)",
      uiCustomizeOptionDefault:
        "Usar estilo neutral de propósito general por defecto (limpio, profesional, adaptable)",
      uiPurposePrompt: "¿Hacia dónde está enfocada la aplicación / qué propósito tiene?",
      uiAudiencePrompt: "¿Qué tipo de usuarios utilizarán principalmente la interfaz?",
      uiBorderRadiusPrompt: "Selecciona la geometría de bordes para componentes y tarjetas:",
      uiVisualEffectsPrompt: "Selecciona el tratamiento de superficies, sombras y transparencias:",
      uiColorModePrompt: "Selecciona el esquema de color (oscuro, claro o ambos):",
      uiDetectedLibraries: "Librerías y estilos de interfaz detectados:",
      uiMissingLibrariesPrompt:
        "¿Falta alguna librería de interfaz gráfica por registrar? (escribe nombres separados por comas, o Enter para omitir):",
      uiMissingLibrariesPlaceholder: "ej: lucide-react, framer-motion, @tanstack/react-query",
      uiStyleNotice:
        "Directivas de estilo de interfaz y reglas de tokens generadas en .specty/rules/core/ui-style.md. Puedes declarar bibliotecas de componentes en dicho archivo.",
      summaryTitle: "Resumen de configuracion",
      confirmPrompt: "¿Aplicar esta configuracion al repositorio?",
      canceled: "Configuracion cancelada por el usuario.",
      success: "¡Inicializacion de specty completada con exito!",
    },
    doctor: {
      checkingEnvironment: "Comprobando instalacion y entorno de specty...",
      openspecOk: "OpenSpec version 1.14.1 instalado correctamente.",
      openspecMismatch: "Version de OpenSpec desfasada o no instalada.",
      filesSynced: "Todos los archivos de herramientas estan sincronizados con AGENTS.md.",
      filesOutOfSync: "Algunos archivos de herramientas estan desincronizados de AGENTS.md.",
      hooksInstalled: "Los hooks de gobernanza de git estan activos.",
      hooksMissing: "Los hooks de git no estan instalados o no tienen permisos de ejecucion.",
    },
    governance: {
      noApprovedChange: "Error: Se detectaron cambios en codigo fuente sin un change aprobado.",
      changeApproved: "Change aprobado correctamente.",
      hashMismatchReapprove:
        "Aviso: El spec fue modificado despues de ser aprobado. Requiere nueva aprobacion.",
      bypassUsed: "Auditoria: Salida de emergencia utilizada para el commit.",
      verifySuccess: "Verificacion completada con exito.",
      verifyFailure: "La verificacion fallo en uno o mas comandos.",
    },
    errors: {
      outsideRepo: "Operacion abortada: la ruta se encuentra fuera de la raiz del repositorio.",
      sensitiveFile:
        "Operacion abortada: intento de acceder o modificar un archivo sensible o secreto.",
      fileNotFound: "Archivo no encontrado:",
      configInvalid: "Configuracion invalida en .specty/config.yaml:",
      unsupportedLanguage: "Idioma no soportado:",
    },
  },
};

export function normalizeLanguage(langInput?: string): SupportedLanguage {
  if (!langInput) {
    return DEFAULT_LANGUAGE;
  }
  const clean = langInput.trim().toLowerCase();
  if (clean === "es" || clean.startsWith("es-") || clean === "spanish" || clean === "español") {
    return "es";
  }
  if (clean === "en" || clean.startsWith("en-") || clean === "english" || clean === "ingles") {
    return "en";
  }
  return DEFAULT_LANGUAGE;
}

export function getDictionary(lang: SupportedLanguage = DEFAULT_LANGUAGE): TranslationDictionary {
  return translations[lang] ?? translations[DEFAULT_LANGUAGE];
}
