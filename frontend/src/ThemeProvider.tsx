import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ThemeTokens,
  Palette,
  lightTokens,
  darkTokens,
  toPalette,
} from "./theme";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type Density = "compact" | "comfortable" | "large";

const KEY_MODE = "frameflow.theme.mode";
const KEY_DENSITY = "frameflow.theme.density";
const KEY_REDUCE_MOTION = "frameflow.a11y.reduceMotion";
const KEY_HIGH_CONTRAST = "frameflow.a11y.highContrast";

const DEFAULT_MODE: ThemeMode = "dark"; // first-launch default
const DEFAULT_DENSITY: Density = "comfortable";

/** Phone breakpoint: below this we consider the device a phone. */
export const MOBILE_MAX = 700;

/** Font/scale multiplier per density. */
const DENSITY_SCALE: Record<Density, number> = {
  compact: 0.92,
  comfortable: 1,
  large: 1.14,
};

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  tokens: ThemeTokens;
  /** Flat semantic palette used by existing screens via createStyles(C). */
  C: Palette;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isSystem: boolean;
  // Workspace density
  density: Density;
  setDensity: (d: Density) => void;
  /** Density font/scale multiplier (accounts for compact being disabled on phones). */
  scale: number;
  // Accessibility
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  // Layout
  isPhone: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isValidMode = (v: unknown): v is ThemeMode =>
  v === "light" || v === "dark" || v === "system";
const isValidDensity = (v: unknown): v is Density =>
  v === "compact" || v === "comfortable" || v === "large";

/** Slightly stronger borders / text for the high-contrast accessibility mode. */
function applyHighContrast(t: ThemeTokens, on: boolean): ThemeTokens {
  if (!on) return t;
  return {
    ...t,
    border: { ...t.border, subtle: t.border.default, default: t.border.strong },
    text: { ...t.text, secondary: t.text.primary, tertiary: t.text.secondary },
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const { width } = useWindowDimensions();
  const isPhone = width < MOBILE_MAX;

  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [highContrast, setHighContrastState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted preferences once on startup.
  useEffect(() => {
    (async () => {
      try {
        const [m, d, rm, hc] = await AsyncStorage.multiGet([
          KEY_MODE, KEY_DENSITY, KEY_REDUCE_MOTION, KEY_HIGH_CONTRAST,
        ]);
        if (isValidMode(m[1])) setModeState(m[1] as ThemeMode);
        if (isValidDensity(d[1])) setDensityState(d[1] as Density);
        if (rm[1] === "1") setReduceMotionState(true);
        if (hc[1] === "1") setHighContrastState(true);
      } catch {
        // ignore — fall back to defaults
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY_MODE, m).catch(() => {});
  }, []);
  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    AsyncStorage.setItem(KEY_DENSITY, d).catch(() => {});
  }, []);
  const setReduceMotion = useCallback((v: boolean) => {
    setReduceMotionState(v);
    AsyncStorage.setItem(KEY_REDUCE_MOTION, v ? "1" : "0").catch(() => {});
  }, []);
  const setHighContrast = useCallback((v: boolean) => {
    setHighContrastState(v);
    AsyncStorage.setItem(KEY_HIGH_CONTRAST, v ? "1" : "0").catch(() => {});
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (mode === "system") return systemScheme === "dark" ? "dark" : "light";
    return mode;
  }, [mode, systemScheme]);

  const toggleTheme = useCallback(() => {
    setMode(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setMode]);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = resolvedTheme === "dark";
    const base = isDark ? darkTokens : lightTokens;
    const tokens = applyHighContrast(base, highContrast);
    // Compact is unavailable on phones — treat as comfortable there.
    const effectiveDensity: Density = isPhone && density === "compact" ? "comfortable" : density;
    return {
      mode,
      resolvedTheme,
      tokens,
      C: toPalette(tokens),
      setMode,
      toggleTheme,
      isDark,
      isSystem: mode === "system",
      density,
      setDensity,
      scale: DENSITY_SCALE[effectiveDensity],
      reduceMotion,
      setReduceMotion,
      highContrast,
      setHighContrast,
      isPhone,
    };
  }, [mode, resolvedTheme, density, reduceMotion, highContrast, isPhone, setMode, toggleTheme, setDensity, setReduceMotion, setHighContrast]);

  // Avoid a first-frame flash of the wrong theme before hydration.
  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
