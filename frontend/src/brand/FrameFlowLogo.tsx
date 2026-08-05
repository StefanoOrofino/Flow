/**
 * FrameFlow Studio — OFFICIAL logo ("FRAME F" direction).
 *
 * Concept: the letter F built from a cinematic filmstrip stem (sprocket holes)
 * and two solid bars. Single foreground colour by default; optional metallic
 * gold gradient for hero use. Scales 16px → 1024px.
 */
import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Defs, LinearGradient, Stop, Mask, G } from "react-native-svg";
import { F } from "@/src/theme";

// Official brand palette (fixed — from the approved board).
export const BRAND = {
  gold: "#C5A059",
  ink: "#232333",
  light: "#F7F5EF",
  mono: "#8C8C93",
};

const SPROCKETS = [19, 29, 39, 49, 59, 69];

/**
 * The bare mark — "FRAME F": a letter F built from a filmstrip stem (sprocket
 * holes) plus two solid bars. Cinematic, recognisable. Single foreground colour
 * by default; pass `gradient` for the metallic gold hero treatment.
 * Geometry viewBox 0 0 100 100: stem x20 y14 w24 h72 + arms at y15 (w42) & y42 (w30).
 */
export function LogoMark({ color = BRAND.gold, size = 64, gradient = false }: { color?: string; size?: number; gradient?: boolean }) {
  const uid = React.useId().replace(/[:]/g, "");
  const gid = `ffg${uid}`, mid = `ffm${uid}`;
  const fill = gradient ? `url(#${gid})` : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        {gradient ? (
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#EBD08A" />
            <Stop offset="0.5" stopColor="#C5A059" />
            <Stop offset="1" stopColor="#9A7B3C" />
          </LinearGradient>
        ) : null}
        <Mask id={mid}>
          <Rect x={20} y={14} width={24} height={72} rx={3} fill="white" />
          {SPROCKETS.map((y, i) => (
            <G key={i}>
              <Rect x={23.5} y={y} width={4} height={5} rx={1} fill="black" />
              <Rect x={36.5} y={y} width={4} height={5} rx={1} fill="black" />
            </G>
          ))}
        </Mask>
      </Defs>
      <Rect x={20} y={14} width={24} height={72} rx={3} fill={fill} mask={`url(#${mid})`} />
      <Rect x={42} y={15} width={42} height={16} rx={3} fill={fill} />
      <Rect x={42} y={42} width={30} height={16} rx={3} fill={fill} />
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
