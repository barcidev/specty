import type { SpectyUiConfig } from "../core/config.js";

export function formatUiStyleRule(ui: SpectyUiConfig, lang: "es" | "en" = "es"): string {
  const isEs = lang === "es";

  const purposeLabels: Record<string, { es: string; en: string }> = {
    "general-purpose": {
      es: "Proposito General / Neutro (Equilibrado, limpio y adaptable)",
      en: "General Purpose / Neutral (Balanced, clean, and adaptable)",
    },
    "saas-dashboard": {
      es: "SaaS / Dashboard Administrativo (Analitica, tablas de datos, KPIs y metricas B2B)",
      en: "SaaS / Admin Dashboard (Analytics, dense data tables, KPIs, and B2B workflows)",
    },
    ecommerce: {
      es: "E-Commerce / Tienda Online (Catalogo de productos, conversion alta y checkout)",
      en: "E-Commerce / Online Store (Product catalog, high conversion, and checkout flow)",
    },
    "landing-marketing": {
      es: "Landing Page / Marketing (Impacto de marca, visual storytelling y captacion)",
      en: "Landing Page / Marketing (Brand impact, visual storytelling, and showcase)",
    },
    "mobile-social": {
      es: "App Movil / Comunidad Social (Feeds dinamicos, mensajeria e interaccion rapida)",
      en: "Mobile App / Social Community (Dynamic feeds, messaging, and responsive touch)",
    },
    "content-docs": {
      es: "Contenido / Documentacion / Blog (Lectura inmersiva, jerarquia y tipografia cuidada)",
      en: "Content / Documentation / Blog (Focused reading, hierarchy, and refined typography)",
    },
    fintech: {
      es: "Fintech / Finanzas / Cripto (Seguridad visual, precision numerica y datos en tiempo real)",
      en: "Fintech / Banking / Crypto (Trust, visual security, numerical precision, and real-time feeds)",
    },
    "health-wellness": {
      es: "Salud / Bienestar / Clinicas (Sensacion de calma, confianza y alta legibilidad)",
      en: "Health / Wellness / Clinics (Calming atmosphere, reassuring tone, and high clarity)",
    },
    education: {
      es: "Educacion / LMS / Cursos (Interactividad didactica y seguimiento de progreso)",
      en: "Education / LMS / E-Learning (Didactic interactivity and progress tracking)",
    },
  };

  const audienceLabels: Record<string, { es: string; en: string }> = {
    "general-public": {
      es: "Publico General (B2C) - Maxima intuicion, visualmente amigable y cero friccion",
      en: "General Public (B2C) - Maximum intuition, visually friendly, and zero friction",
    },
    professionals: {
      es: "Profesionales / Empresas (B2B) - Alta densidad de datos, productividad y atajos",
      en: "Professionals / Enterprise (B2B) - High data density, productivity, and shortcuts",
    },
    developers: {
      es: "Desarrolladores / Tecnicos - Orientado a teclado, monospace y temas tecnicos",
      en: "Developers / Engineers - Keyboard-driven, monospace accents, and DevTools layout",
    },
    "youth-students": {
      es: "Jovenes / Estudiantes - Elementos dinamicos, colores vivos y gamificacion",
      en: "Youth / Students - Dynamic elements, vibrant tones, and subtle gamification",
    },
    "elderly-accessible": {
      es: "Accesibilidad Reforzada / Adultos Mayores - Tipografia grande y contraste WCAG AAA",
      en: "Enhanced Accessibility / Seniors - Large typography, high targets, and WCAG AAA",
    },
  };

  const borderRadiusLabels: Record<string, { es: string; en: string; token: string; css: string }> =
    {
      rounded: {
        es: "Redondeados pronunciados (12px a 20px / rounded-xl a 2xl)",
        en: "Prominent rounded (12px to 20px / rounded-xl to 2xl)",
        token: "--radius: 1rem; /* 16px */",
        css: "Tarjetas y modales usan 16px-20px; botones e inputs usan 12px-14px. Formas suaves y amigables.",
      },
      "semi-rounded": {
        es: "Semi-redondeados equilibrados (6px a 8px / rounded-md a lg)",
        en: "Balanced semi-rounded (6px to 8px / rounded-md to lg)",
        token: "--radius: 0.5rem; /* 8px */",
        css: "Tarjetas y contenedores usan 8px; controles e inputs usan 6px. Estandar profesional de software.",
      },
      sharp: {
        es: "Rectos / Esquinas vivas (0px / sharp corners)",
        en: "Sharp / Right angles (0px / sharp corners)",
        token: "--radius: 0px;",
        css: "Esquinas vivas a 90 grados o con biseles leves. Estilo tecnico, contundente o brutalista.",
      },
    };

  const visualEffectsLabels: Record<string, { es: string; en: string; css: string }> = {
    "subtle-elevation": {
      es: "Sombras suaves difusas y superficies solidas limpias",
      en: "Subtle soft shadows and clean solid surfaces",
      css: "--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);\n--shadow-card: 0 4px 16px -2px rgba(0,0,0,0.08);",
    },
    glassmorphism: {
      es: "Transparencias Glassmorphism con desenfoque de fondo",
      en: "Translucent Glassmorphism with background blur",
      css: "--surface-bg: rgba(255, 255, 255, 0.05);\n--surface-blur: 16px;\n--surface-border: 1px solid rgba(255, 255, 255, 0.08);",
    },
    "hard-contrast": {
      es: "Sombras duras proyectadas en bloque y bordes contrastados",
      en: "Hard offset block shadows and bold contrast borders",
      css: "--shadow-hard: 3px 3px 0px var(--border-color);\n--border-width: 2px;",
    },
    "minimal-flat": {
      es: "Plano minimalista sin sombras artificiales",
      en: "Minimal flat without artificial shadows",
      css: "--shadow-card: none;\n--border-card: 1px solid var(--border-subtle);",
    },
  };

  const defaultPurpose = {
    es: "Proposito General / Neutro (Equilibrado, limpio y adaptable)",
    en: "General Purpose / Neutral (Balanced, clean, and adaptable)",
  };
  const defaultAudience = {
    es: "Publico General (B2C) - Maxima intuicion, visualmente amigable y cero friccion",
    en: "General Public (B2C) - Maximum intuition, visually friendly, and zero friction",
  };
  const defaultRadius = {
    es: "Semi-redondeados equilibrados (6px a 8px / rounded-md a lg)",
    en: "Balanced semi-rounded (6px to 8px / rounded-md to lg)",
    token: "--radius: 0.5rem; /* 8px */",
    css: "Tarjetas y contenedores usan 8px; controles e inputs usan 6px. Estandar profesional de software.",
  };
  const defaultEffects = {
    es: "Sombras suaves difusas y superficies solidas limpias",
    en: "Subtle soft shadows and clean solid surfaces",
    css: "--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);\n--shadow-card: 0 4px 16px -2px rgba(0,0,0,0.08);",
  };

  const purposeMeta = (ui.purpose ? purposeLabels[ui.purpose] : undefined) ?? defaultPurpose;
  const audienceMeta =
    (ui.target_audience ? audienceLabels[ui.target_audience] : undefined) ?? defaultAudience;
  const radiusMeta =
    (ui.border_radius ? borderRadiusLabels[ui.border_radius] : undefined) ?? defaultRadius;
  const effectsMeta =
    (ui.visual_effects ? visualEffectsLabels[ui.visual_effects] : undefined) ?? defaultEffects;

  const purposeText = isEs ? purposeMeta.es : purposeMeta.en;
  const audienceText = isEs ? audienceMeta.es : audienceMeta.en;
  const radiusText = isEs ? radiusMeta.es : radiusMeta.en;
  const effectsText = isEs ? effectsMeta.es : effectsMeta.en;

  const colorModeDescription =
    ui.color_mode === "dark"
      ? isEs
        ? "Modo Oscuro exclusivo / prioritario (lienzo oscuro profundo e inmersivo)"
        : "Dark Mode only / primary (immersive deep dark canvas)"
      : ui.color_mode === "light"
        ? isEs
          ? "Modo Claro exclusivo / prioritario (lienzo limpio de alto contraste)"
          : "Light Mode only / primary (clean bright canvas with crisp contrast)"
        : isEs
          ? "Ambos (Modo Claro y Modo Oscuro con soporte completo y selector)"
          : "Both (Full Light & Dark mode support with theme toggle)";

  if (isEs) {
    return `# Directivas de Estilo Visual y Diseno de Interfaces

Este documento establece las reglas obligatorias de diseno, estetica y tokens para cualquier modificacion o creacion de interfaz grafica en el proyecto.

## 1. Contexto de Producto y Diseno
- **Proposito de la aplicacion:** ${purposeText}
- **Audiencia objetivo:** ${audienceText}
- **Geometria de bordes:** ${radiusText}
- **Tratamiento de superficies:** ${effectsText}
- **Modo de color:** ${colorModeDescription}

---

## 2. Protocolo Obligatorio de Creacion de Tokens Visuales (Mandatorio para Agentes)
Cualquier agente de IA que genere o modifique codigo de interfaz debe acatar estrictamente las siguientes reglas:

1. **Regla del Primer Toque:**
   - Si es la primera vez que un agente implementa o modifica interfaces graficas y **no existe aun un sistema centralizado de tokens de diseno** (ej. \`src/styles/tokens.css\`, \`src/styles/theme.css\` o variables globales equivalentes), el agente **TIENE LA OBLIGACION INELUDIBLE de crearlo como primer paso** antes de codificar cualquier componente o pantalla.

2. **Priorizacion de Colores e Identidad en Proyectos Existentes:**
   - Si el proyecto ya cuenta con estilos, codigo o plantillas existentes, el agente **DEBE inspeccionar y extraer** los colores de marca, acentos y tipografias ya presentes para preservar la identidad existente y evitar inconsistencias visuales.

3. **Inferencia Armonica en Proyectos Nuevos:**
   - Si el proyecto es nuevo o no posee colores previos, el agente debe derivar una paleta profesional, accesible (WCAG AA minimo) y armoniosa coherente con el proposito (**${purposeText}**) y la audiencia (**${audienceText}**), con soporte para **${colorModeDescription}**.

4. **Prohibicion Terminante de Estilos Hardcodeados:**
   - Queda estrictamente prohibido utilizar colores en formato hexadecimal o RGB dispersos en componentes. Todo boton, tarjeta, input, modal o texto debe consumir los tokens semanticos del sistema.

---

## 3. Tokens y Geometria Vinculantes
- **Radio de Bordes (\`--radius\`):**
  \`\`\`css
  ${radiusMeta.token}
  \`\`\`
  ${radiusMeta.css}

- **Superficies, Sombras y Efectos:**
  \`\`\`css
  ${effectsMeta.css}
  \`\`\`

- **Tokens Semanticos Minimos Obligatorios:**
  - \`--bg-canvas\`: Color del lienzo principal.
  - \`--bg-surface\`: Fondo de tarjetas, paneles y contenedores.
  - \`--border-subtle\`: Bordes divisorios y separadores.
  - \`--text-primary\`: Texto de alta jerarquia y encabezados.
  - \`--text-muted\`: Descripciones, metadatos y etiquetas secundarias.
  - \`--accent-primary\`: Accion principal, enlaces activos y botones destacados.
  - \`--focus-ring\`: Anillo de foco accesible para navegacion por teclado.

---

## 4. Estados Interactivos y Accesibilidad
- **Estados Interactivos:** Todo elemento clickable debe definir estilos explicitos para \`:hover\`, \`:active\`, \`:disabled\` y \`:focus-visible\` con transiciones fluidas de 150ms a 200ms.
- **Accesibilidad:** Garantizar un contraste de al menos 4.5:1 para texto normal y 3:1 para controles e iconos respecto a su fondo.
- **Prohibicion de Wireframes Planos:** No generar interfaces que parezcan maquetas sin terminar o disenos MVP descuidados.

<!-- USER_LIBRARIES_START -->
## 5. Bibliotecas y Componentes Especificos del Proyecto
<!-- Si deseas que los agentes utilicen librerias especificas de UI (ej: shadcn/ui, Tailwind CSS v4, Lucide Icons, Radix UI, Framer Motion, Taiga UI, Ant Design, Material UI), declaralas aqui -->
- Bibliotecas declaradas: (Ninguna especificada aun. Los agentes utilizaran estilos nativos y utilidades base consumiendo los tokens).
<!-- USER_LIBRARIES_END -->
`;
  }

  return `# Visual Style & UI Design Directives

This document defines the mandatory design principles, visual aesthetics, and tokens for any graphical user interface code in the repository.

## 1. Product & Design Context
- **Application Focus / Purpose:** ${purposeText}
- **Target Audience:** ${audienceText}
- **Corner / Border Geometry:** ${radiusText}
- **Surface & Elevation Treatment:** ${effectsText}
- **Color Scheme Mode:** ${colorModeDescription}

---

## 2. Mandatory Visual Token Protocol for AI Agents
Any AI assistant implementing or modifying user interface code must strictly adhere to the following rules:

1. **First-Touch Rule:**
   - If this is the first time an agent implements or touches graphical UI code and **no centralized design token system exists yet** (e.g. \`src/styles/tokens.css\`, \`src/styles/theme.css\`, or equivalent global variables), the agent **MUST create and consolidate the token file as its mandatory first step** before coding any component.

2. **Color Prioritization in Existing Projects:**
   - If the project already has styles, existing code, or branding, the agent **MUST inspect and extract** the colors, accents, and fonts already in use to ensure visual continuity and brand fidelity.

3. **Harmonic Inference in New Projects:**
   - If the project is brand new without prior colors, the agent must derive a professional, accessible (WCAG AA minimum), and harmonious palette aligned with the purpose (**${purposeText}**) and target audience (**${audienceText}**), tailored to **${colorModeDescription}**.

4. **Strict Prohibition of Hardcoded Styles:**
   - Hardcoded hex/RGB colors or ad-hoc magic values inside component files are strictly prohibited. Every card, button, modal, or input must consume semantic tokens.

---

## 3. Binding Tokens & Geometry
- **Border Radius (\`--radius\`):**
  \`\`\`css
  ${radiusMeta.token}
  \`\`\`
  ${radiusMeta.css}

- **Surfaces, Shadows & Effects:**
  \`\`\`css
  ${effectsMeta.css}
  \`\`\`

- **Mandatory Semantic Tokens:**
  - \`--bg-canvas\`: Base canvas background.
  - \`--bg-surface\`: Card, panel, and dialog surface background.
  - \`--border-subtle\`: Container borders and divider lines.
  - \`--text-primary\`: High-contrast headings and primary text.
  - \`--text-muted\`: Secondary descriptions, timestamps, and metadata.
  - \`--accent-primary\`: Primary action, CTA buttons, and highlighted states.
  - \`--focus-ring\`: Accessible focus ring for keyboard navigation.

---

## 4. Interactive States & Accessibility
- **Interactive Feedback:** All clickable elements must specify explicit \`:hover\`, \`:active\`, \`:disabled\`, and \`:focus-visible\` states with smooth 150ms-200ms transitions.
- **Accessibility:** Ensure at least 4.5:1 contrast for regular text and 3:1 for interactive controls.
- **No Flat Wireframes:** Agents must never produce plain MVP wireframes or unstyled placeholders.

<!-- USER_LIBRARIES_START -->
## 5. Specific Component Libraries & Design Systems
<!-- If you wish AI agents to use specific UI libraries (e.g., shadcn/ui, Tailwind CSS v4, Lucide Icons, Radix UI, Framer Motion, Taiga UI, Ant Design, Material UI), declare them here -->
- Declared Libraries: (None specified yet. Agents will use native styling and tokens).
<!-- USER_LIBRARIES_END -->
`;
}
