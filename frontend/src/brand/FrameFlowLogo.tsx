/**
 * FrameFlow Studio — OFFICIAL logo (refined "Flow Forward" direction).
 *
 * Concept: two cinematic (widescreen) frames flowing into each other, offset
 * diagonally up-and-right to read as forward motion / creative progression.
 * The old solid "play" triangle is removed — the mark is now purely two
 * overlapping rounded frame outlines. Single foreground color, no gradients,
 * no shadows, rounded corners consistent with the app UI. Scales 16px → 1024px.
 *
 * Geometry (viewBox 0 0 100 100):
 *   back frame  : x10  y36  w52 h40  rx12
 *   front frame : x38  y22  w52 h40  rx12   (offset +28, -14)
 *   stroke      : 9    (round joins/caps)
 */
import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { F } from "@/src/theme";

// Official brand palette (fixed — from the approved board).
export const BRAND = {
  gold: "#C5A059",
  ink: "#232333",
  light: "#F7F5EF",
  mono: "#8C8C93",
};

const STROKE = 9;

/** The bare mark — two overlapping cinematic frames flowing forward. */
export function LogoMark({ color = BRAND.gold, size = 64 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Rect x={10} y={36} width={52} height={40} rx={12} stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
      <Rect x={38} y={22} width={52} height={40} rx={12} stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
    </Svg>
  );
}

/** App-icon lockup — rounded square container with the mark centered. */
export function AppIcon({
  size = 96,
  bg = BRAND.ink,
  fg = BRAND.gold,
  border,
}: {
  size?: number;
  bg?: string;
  fg?: string;
  border?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: border ? 1 : 0,
        borderColor: border,
        overflow: "hidden",
      }}
    >
      <LogoMark color={fg} size={size * 0.66} />
    </View>
  );
}

/** Wordmark — "FRAMEFLOW" over a ruled "STUDIO" line. */
export function Wordmark({
  color = BRAND.light,
  accent = BRAND.gold,
  size = 26,
  align = "flex-start",
}: {
  color?: string;
  accent?: string;
  size?: number;
  align?: "flex-start" | "center";
}) {
  const studio = Math.max(8, size * 0.34);
  return (
    <View style={{ alignItems: align }}>
      <Text style={{ fontFamily: F.display, fontSize: size, letterSpacing: size * 0.14, color, lineHeight: size * 1.05 }}>
        FRAMEFLOW
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: size * 0.16 }}>
        <View style={{ width: size * 0.5, height: 1, backgroundColor: accent, opacity: 0.8 }} />
        <Text style={{ fontFamily: F.text, fontSize: studio, letterSpacing: studio * 0.5, color: accent, marginHorizontal: size * 0.28 }}>
          STUDIO
        </Text>
        <View style={{ width: size * 0.5, height: 1, backgroundColor: accent, opacity: 0.8 }} />
      </View>
    </View>
  );
}

/** Horizontal lockup — mark + wordmark side by side. */
export function HorizontalLogo({ tone = "dark", size = 56 }: { tone?: "dark" | "light"; size?: number }) {
  const color = tone === "dark" ? BRAND.light : BRAND.ink;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.22 }}>
      <LogoMark color={BRAND.gold} size={size} />
      <Wordmark color={color} accent={BRAND.gold} size={size * 0.46} />
    </View>
  );
}

/** Vertical lockup — mark stacked above the wordmark. */
export function VerticalLogo({ tone = "dark", size = 84 }: { tone?: "dark" | "light"; size?: number }) {
  const color = tone === "dark" ? BRAND.light : BRAND.ink;
  return (
    <View style={{ alignItems: "center", gap: size * 0.14 }}>
      <LogoMark color={BRAND.gold} size={size} />
      <Wordmark color={color} accent={BRAND.gold} size={size * 0.34} align="center" />
    </View>
  );
}
