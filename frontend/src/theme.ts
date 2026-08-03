import { Platform } from "react-native";

export const C = {
  surface: "#0A0A0A",
  onSurface: "#F2F2F2",
  surface2: "#1A1A1A",
  onSurface2: "#A3A3A3",
  surface3: "#262626",
  onSurface3: "#D4D4D4",
  brand: "#C5A059",
  onBrand: "#0A0A0A",
  brand2: "#8C7335",
  brandTint: "#2E2413",
  onBrandTint: "#E8C98B",
  success: "#3E6646",
  warning: "#8C6335",
  error: "#8B2B2B",
  border: "#262626",
  borderStrong: "#404040",
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const R = { sm: 6, md: 12, lg: 20, pill: 999 };

export const F = {
  display: Platform.select({ web: "'Cormorant Garamond', Georgia, serif", default: "serif" }) as string,
  text: Platform.select({ web: "'Geist', system-ui, sans-serif", default: "System" }) as string,
};

export const MAX_W = 960;
