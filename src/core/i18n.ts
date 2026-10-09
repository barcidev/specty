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
  };
  init: {
    welcome: string;
    languagePrompt: string;
    detectingStack: string;
    stackDetected: string;
    projectKindPrompt: string;
    projectKindNew: string;
    projectKindExisting: string;
    toolsPrompt: string;
    enginePrompt: string;
    mcpPrompt: string;
    hooksPrompt: string;
    ciPrompt: string;
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
    },
    init: {
      welcome: "Welcome to specty - AI assistant governance setup",
      languagePrompt: "Select the language for generated configuration and specs:",
      detectingStack: "Analyzing repository stack and frameworks...",
      stackDetected: "Detected stack:",
      projectKindPrompt: "Is this a new or existing project?",
      projectKindNew: "New project (guided architecture setup)",
      projectKindExisting: "Existing project (brownfield analysis and incremental specs)",
      toolsPrompt: "Select AI assistant tools to configure:",
      enginePrompt: "Select spec engine:",
      mcpPrompt: "Enable MCP code graph server and metrics?",
      hooksPrompt: "Configure git pre-commit hooks and IDE guards?",
      ciPrompt: "Generate CI workflow template?",
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
    },
    init: {
      welcome: "Bienvenido a specty - Configuracion de gobernanza para asistentes de IA",
      languagePrompt: "Selecciona el idioma para los archivos de configuracion y specs:",
      detectingStack: "Analizando stack y frameworks del repositorio...",
      stackDetected: "Stack detectado:",
      projectKindPrompt: "¿El proyecto es nuevo o existente?",
      projectKindNew: "Proyecto nuevo (seleccion guiada de arquitectura)",
      projectKindExisting: "Proyecto existente (analisis brownfield y specs incrementales)",
      toolsPrompt: "Selecciona las herramientas de IA a configurar:",
      enginePrompt: "Selecciona el motor de specs:",
      mcpPrompt: "¿Activar servidor MCP de grafo de codigo y metricas?",
      hooksPrompt: "¿Configurar hooks pre-commit de git y compuertas de IDE?",
      ciPrompt: "¿Generar plantilla de CI para integracion continua?",
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
