import { Platform } from "react-native";

/* ------------------------------------------------------------------ *
 * FrameFlow Studio — Design System Tokens
 * Single semantic token contract shared by Light & Dark themes so that
 * components never branch on the active theme. Brand accent is a fixed
 * gold (#C5A059) with per-theme derived variants for AA contrast.
 * ------------------------------------------------------------------ */

export interface ThemeTokens {
  background: {
    app: string;
    elevated: string;
    overlay: string;
  };
  surface: {
    default: string;
    subtle: string;
    elevated: string;
    interactive: string;
    hover: string;
    active: string;
  };
  card: {
    background: string;
    elevated: string;
    border: string;
    hover: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
    focus: string;
  };
  primary: {
    default: string;
    hover: string;
    active: string;
    foreground: string;
    subtle: string;
  };
  accent: {
    default: string;
    hover: string;
    foreground: string;
    subtle: string;
    onSubtle: string;
  };
  success: {
    default: string;
    foreground: string;
    background: string;
    border: string;
    onTint: string;
  };
  warning: {
    default: string;
    foreground: string;
    background: string;
    border: string;
    onTint: string;
  };
  danger: {
    default: string;
    foreground: string;
    background: string;
    border: string;
    onTint: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    disabled: string;
    link: string;
  };
  muted: {
    background: string;
    foreground: string;
    border: string;
  };
}

/* ------------------------------ DARK ------------------------------ *
 * Layered neutral darks (no pure black), soft off-white text.        */
export const darkTokens: ThemeTokens = {
  background: {
    app: "#0E0F12",
    elevated: "#16171B",
    overlay: "rgba(0,0,0,0.66)",
  },
  surface: {
    default: "#16171B",
    subtle: "#121317",
    elevated: "#1E2025",
    interactive: "#1E2025",
    hover: "#26282E",
    active: "#2E3037",
  },
  card: {
    background: "#16171B",
    elevated: "#1E2025",
    border: "#26282E",
    hover: "#1E2025",
  },
  border: {
    subtle: "#1C1D21",
    default: "#212327",
    strong: "#33353B",
    focus: "#C5A059",
  },
  primary: {
    default: "#C5A059",
    hover: "#D4B26E",
    active: "#B08D48",
    foreground: "#0E0F12",
    subtle: "rgba(197,160,89,0.14)",
  },
  accent: {
    default: "#C5A059",
    hover: "#D4B26E",
    foreground: "#0E0F12",
    subtle: "rgba(197,160,89,0.14)",
    onSubtle: "#E8C98B",
  },
  success: {
    default: "#4CAF7D",
    foreground: "#0E0F12",
    background: "rgba(76,175,125,0.16)",
    border: "rgba(76,175,125,0.42)",
    onTint: "#7FD3A3",
  },
  warning: {
    default: "#E0A458",
    foreground: "#0E0F12",
    background: "rgba(224,164,88,0.16)",
    border: "rgba(224,164,88,0.42)",
    onTint: "#EEC28A",
  },
  danger: {
    default: "#E5645C",
    foreground: "#0E0F12",
    background: "rgba(229,100,92,0.16)",
    border: "rgba(229,100,92,0.42)",
    onTint: "#F2A9A3",
  },
  text: {
    primary: "#F2F1ED",
    secondary: "#ADADA8",
    tertiary: "#7C7C78",
    inverse: "#16171B",
    disabled: "#5A5A57",
    link: "#C5A059",
  },
  muted: {
    background: "#1E2025",
    foreground: "#8A8A86",
    border: "#2A2C31",
  },
};

/* ------------------------------ LIGHT ----------------------------- *
 * Warm off-white surfaces, soft neutral borders, warm charcoal text. */
export const lightTokens: ThemeTokens = {
  background: {
    app: "#FAF9F6",
    elevated: "#FFFFFF",
    overlay: "rgba(20,18,14,0.38)",
  },
  surface: {
    default: "#FFFFFF",
    subtle: "#F4F2EC",
    elevated: "#FFFFFF",
    interactive: "#F4F2EC",
    hover: "#EFEDE6",
    active: "#E7E4DB",
  },
  card: {
    background: "#FFFFFF",
    elevated: "#FFFFFF",
    border: "#E7E3D9",
    hover: "#FBFAF7",
  },
  border: {
    subtle: "#F1EDE4",
    default: "#ECE8DF",
    strong: "#D8D2C6",
    focus: "#C5A059",
  },
  primary: {
    default: "#C5A059",
    hover: "#B8954F",
    active: "#9E7E40",
    foreground: "#1A1712",
    subtle: "rgba(197,160,89,0.16)",
  },
  accent: {
    default: "#B08D48",
    hover: "#9E7E40",
    foreground: "#1A1712",
    subtle: "rgba(197,160,89,0.16)",
    onSubtle: "#8A6E34",
  },
  success: {
    default: "#2E8B57",
    foreground: "#FFFFFF",
    background: "rgba(46,139,87,0.12)",
    border: "rgba(46,139,87,0.34)",
    onTint: "#2E8B57",
  },
  warning: {
    default: "#B8801F",
    foreground: "#FFFFFF",
    background: "rgba(184,128,31,0.12)",
    border: "rgba(184,128,31,0.34)",
    onTint: "#8A5F17",
  },
  danger: {
    default: "#C0392B",
    foreground: "#FFFFFF",
    background: "rgba(192,57,43,0.10)",
    border: "rgba(192,57,43,0.30)",
    onTint: "#C0392B",
  },
  text: {
    primary: "#1E1B16",
    secondary: "#57544D",
    tertiary: "#8A867C",
    inverse: "#FAF9F6",
    disabled: "#B3AFA4",
    link: "#9A7C3C",
  },
  muted: {
    background: "#F4F2EC",
    foreground: "#6E6B63",
    border: "#E1DCD0",
  },
};

/* ------------------------------------------------------------------ *
 * Flat semantic palette — a convenience projection of ThemeTokens
 * consumed by existing screens via createStyles(C). Keys stay semantic
 * (surface/onSurface/brand/border...) — no visual color names.
 * ------------------------------------------------------------------ */
export interface Palette {
  surface: string;
  surface2: string;
  surface3: string;
  onSurface: string;
  onSurface2: string;
  onSurface3: string;
  brand: string;
  onBrand: string;
  brand2: string;
  brandTint: string;
  onBrandTint: string;
  success: string;
  successTint: string;
  onSuccessTint: string;
  warning: string;
  error: string;
  errorTint: string;
  onErrorTint: string;
  border: string;
  borderStrong: string;
  overlay: string;
  focus: string;
}

export function toPalette(t: ThemeTokens): Palette {
  return {
    surface: t.background.app,
    surface2: t.surface.default,
    surface3: t.surface.elevated,
    onSurface: t.text.primary,
    onSurface2: t.text.secondary,
    onSurface3: t.text.tertiary,
    brand: t.primary.default,
    onBrand: t.primary.foreground,
    brand2: t.primary.active,
    brandTint: t.primary.subtle,
    onBrandTint: t.accent.onSubtle,
    success: t.success.default,
    successTint: t.success.background,
    onSuccessTint: t.success.onTint,
    warning: t.warning.default,
    error: t.danger.default,
    errorTint: t.danger.background,
    onErrorTint: t.danger.onTint,
    border: t.border.default,
    borderStrong: t.border.strong,
    overlay: t.background.overlay,
    focus: t.border.focus,
  };
}

export const lightPalette = toPalette(lightTokens);
export const darkPalette = toPalette(darkTokens);

/* Static (theme-independent) design primitives — strict 8pt system (4pt sub-steps) */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const R = { sm: 8, md: 12, lg: 18, pill: 999 };

export const F = {
  display: Platform.select({ web: "'Cormorant Garamond', Georgia, serif", default: "serif" }) as string,
  text: Platform.select({ web: "'Geist', system-ui, sans-serif", default: "System" }) as string,
};

export const MAX_W = 1080;

/* Fallback static palette (dark) for any non-hook context. Prefer useTheme(). */
export const C: Palette = darkPalette;
