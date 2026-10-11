import type {
  UiBorderRadius,
  UiColorMode,
  UiPurpose,
  UiTargetAudience,
  UiVisualEffects,
} from "../../core/config.js";

export const DEFAULT_NEUTRAL_UI_CONFIG = {
  purpose: "general-purpose" as UiPurpose,
  targetAudience: "general-public" as UiTargetAudience,
  borderRadius: "semi-rounded" as UiBorderRadius,
  visualEffects: "subtle-elevation" as UiVisualEffects,
  colorMode: "both" as UiColorMode,
};

export interface PromptOption<T> {
  value: T;
  name: string;
}

export function getUiPurposeOptions(lang: "es" | "en"): PromptOption<UiPurpose>[] {
  if (lang === "es") {
    return [
      {
        value: "general-purpose",
        name: "Proposito General / Neutro (Equilibrado, limpio y adaptable a cualquier app)",
      },
      {
        value: "saas-dashboard",
        name: "SaaS / Dashboard Administrativo (Analitica, tablas, KPIs y metricas B2B)",
      },
      {
        value: "ecommerce",
        name: "E-Commerce / Tienda Online (Catalogo de productos, conversion y checkout)",
      },
      {
        value: "landing-marketing",
        name: "Landing Page / Marketing (Impacto de marca, conversion visual y portafolio)",
      },
      {
        value: "mobile-social",
        name: "App Movil / Comunidad Social (Feeds, interacciones agiles y mensajeria)",
      },
      {
        value: "content-docs",
        name: "Contenido / Documentacion / Blog (Lectura inmersiva y tipografia cuidada)",
      },
      {
        value: "fintech",
        name: "Fintech / Finanzas / Cripto (Seguridad visual, alta precision y datos en vivo)",
      },
      {
        value: "health-wellness",
        name: "Salud / Bienestar / Clinicas (Sensacion de calma, confianza y claridad)",
      },
      {
        value: "education",
        name: "Educacion / LMS / Cursos (Interactividad didactica y seguimiento de progreso)",
      },
    ];
  }

  return [
    {
      value: "general-purpose",
      name: "General Purpose / Neutral (Balanced, clean, adaptable to any application)",
    },
    {
      value: "saas-dashboard",
      name: "SaaS / Admin Dashboard (Analytics, dense tables, KPIs, and B2B workflows)",
    },
    {
      value: "ecommerce",
      name: "E-Commerce / Online Store (Product catalog, high conversion, and checkout)",
    },
    {
      value: "landing-marketing",
      name: "Landing Page / Marketing (Brand impact, visual storytelling, and showcase)",
    },
    {
      value: "mobile-social",
      name: "Mobile App / Social Community (Feeds, reactive interactions, and messaging)",
    },
    {
      value: "content-docs",
      name: "Content / Documentation / Blog (Focused reading and elegant typography)",
    },
    {
      value: "fintech",
      name: "Fintech / Banking / Crypto (Trust, visual security, and financial precision)",
    },
    {
      value: "health-wellness",
      name: "Health / Wellness / Clinics (Calming, reassuring, and high clarity)",
    },
    {
      value: "education",
      name: "Education / LMS / E-Learning (Interactive learning and progress tracking)",
    },
  ];
}

export function getUiAudienceOptions(lang: "es" | "en"): PromptOption<UiTargetAudience>[] {
  if (lang === "es") {
    return [
      {
        value: "general-public",
        name: "Publico General (B2C) - Maxima intuicion, visualmente amigable y sin friccion",
      },
      {
        value: "professionals",
        name: "Profesionales / Empresas (B2B) - Alta densidad de datos, productividad y atajos",
      },
      {
        value: "developers",
        name: "Desarrolladores / Tecnicos - Orientado a teclado, tipografia monospace y DevTools",
      },
      {
        value: "youth-students",
        name: "Jovenes / Estudiantes - Elementos dinamicos, colores vivos y gamificacion",
      },
      {
        value: "elderly-accessible",
        name: "Accesibilidad Reforzada / Adultos Mayores - Tipografia grande y contraste AAA",
      },
    ];
  }

  return [
    {
      value: "general-public",
      name: "General Public (B2C) - Maximum intuition, visually friendly, and low friction",
    },
    {
      value: "professionals",
      name: "Professionals / Enterprise (B2B) - High data density, productivity, and shortcuts",
    },
    {
      value: "developers",
      name: "Developers / Engineers - Keyboard-driven, monospace accents, and DevTools layout",
    },
    {
      value: "youth-students",
      name: "Youth / Students - Dynamic elements, vibrant tones, and subtle gamification",
    },
    {
      value: "elderly-accessible",
      name: "Enhanced Accessibility / Seniors - Large typography, high targets, and WCAG AAA",
    },
  ];
}

export function getUiBorderRadiusOptions(lang: "es" | "en"): PromptOption<UiBorderRadius>[] {
  if (lang === "es") {
    return [
      {
        value: "semi-rounded",
        name: "Semi-redondeados (Recomendado) - 6px a 8px (rounded-md/lg), profesional y equilibrado",
      },
      {
        value: "rounded",
        name: "Redondeados pronunciados - 12px a 20px (rounded-xl/2xl), amigable, suave y moderno",
      },
      {
        value: "sharp",
        name: "Rectos / Esquinas vivas - 0px (sharp corners), tecnico, sobrio y contundente",
      },
    ];
  }

  return [
    {
      value: "semi-rounded",
      name: "Semi-rounded (Recommended) - 6px to 8px (rounded-md/lg), balanced and professional",
    },
    {
      value: "rounded",
      name: "Prominent rounded - 12px to 20px (rounded-xl/2xl), soft, friendly, and organic",
    },
    {
      value: "sharp",
      name: "Sharp / Right angles - 0px (sharp corners), technical, austere, and bold",
    },
  ];
}

export function getUiVisualEffectsOptions(lang: "es" | "en"): PromptOption<UiVisualEffects>[] {
  if (lang === "es") {
    return [
      {
        value: "subtle-elevation",
        name: "Sombras suaves y superficies solidas (Recomendado) - Elevacion natural y limpia",
      },
      {
        value: "glassmorphism",
        name: "Transparencias Glassmorphism - Paneles con desenfoque de fondo (backdrop-blur)",
      },
      {
        value: "hard-contrast",
        name: "Sombras duras proyectadas - Bloque 3-4px sin difuminado estilo retro o neo-brutalista",
      },
      {
        value: "minimal-flat",
        name: "Plano minimalista sin sombras - Separacion exclusiva con bordes sutiles de 1px",
      },
    ];
  }

  return [
    {
      value: "subtle-elevation",
      name: "Subtle soft shadows & solid surfaces (Recommended) - Natural, clean elevation",
    },
    {
      value: "glassmorphism",
      name: "Translucent Glassmorphism - Frosted glass panels with backdrop-blur",
    },
    {
      value: "hard-contrast",
      name: "Hard offset shadows - 3-4px block shadow without blur, high contrast",
    },
    {
      value: "minimal-flat",
      name: "Minimal flat without shadows - Pure 1px borders and neutral background shifts",
    },
  ];
}

export function getUiColorModeOptions(lang: "es" | "en"): PromptOption<UiColorMode>[] {
  if (lang === "es") {
    return [
      {
        value: "both",
        name: "Ambos (Recomendado) - Soporte completo para Modo Claro y Modo Oscuro con selector",
      },
      {
        value: "dark",
        name: "Modo Oscuro exclusivo / prioritario - Lienzo oscuro inmersivo para la app",
      },
      {
        value: "light",
        name: "Modo Claro exclusivo / prioritario - Lienzo claro limpio de alto contraste",
      },
    ];
  }

  return [
    {
      value: "both",
      name: "Both (Recommended) - Full Dark and Light mode support with theme toggle",
    },
    {
      value: "dark",
      name: "Dark Mode only / primary - Immersive deep canvas for the interface",
    },
    {
      value: "light",
      name: "Light Mode only / primary - Clean, bright canvas with crisp contrast",
    },
  ];
}
