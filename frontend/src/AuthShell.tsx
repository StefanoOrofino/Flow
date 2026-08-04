import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Animated, Easing, Platform, useWindowDimensions, KeyboardAvoidingView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, R, F, Palette, darkPalette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { useTranslation } from "react-i18next";

// The marketing Hero is an intentional, always-cinematic dark panel (like
// Linear/Arc auth). It uses the fixed dark palette regardless of app theme.
const D = darkPalette;

const SHOWCASE: { icon: any; title: string; desc: string }[] = [
  { icon: "grid-outline", title: "Storyboards", desc: "Scene-by-scene, inline & drag-to-order." },
  { icon: "list-outline", title: "Shot Lists", desc: "Live-synced production tables." },
  { icon: "calendar-outline", title: "Production Plans", desc: "Schedule, crew & shooting order." },
  { icon: "sparkles-outline", title: "AI Director", desc: "Iteratively refine the whole project." },
  { icon: "image-outline", title: "Visual Frames", desc: "AI-generated storyboard frames." },
];

const glass = (extra?: any) => [
  { backgroundColor: "rgba(26,26,26,0.55)", borderWidth: 1, borderColor: "rgba(197,160,89,0.22)" },
  Platform.OS === "web" ? ({ backdropFilter: "blur(14px)" } as any) : null,
  extra,
];

function Hero() {
  const idx = useRef(new Animated.Value(0)).current;      // cross-fade
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const [i, setI] = useState(0);

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const loop = (v: Animated.Value, delay: number) => Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 3200, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    loop(floatA, 0); loop(floatB, 900);
    const t = setInterval(() => {
      Animated.timing(idx, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
        setI((p) => (p + 1) % SHOWCASE.length);
        Animated.timing(idx, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      });
    }, 3000);
    idx.setValue(1);
    return () => clearInterval(t);
  }, []);

  const card = SHOWCASE[i];
  const cardOpacity = idx;
  const cardTranslate = idx.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const fA = floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const fB = floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const enterY = enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <View style={s.hero}>
      <LinearGradient colors={["#161206", "#0A0A0A", "#05060A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* soft light blobs */}
      <View style={[s.blob, { top: -80, left: -60, backgroundColor: "rgba(197,160,89,0.16)" }]} />
      <View style={[s.blob, { bottom: -120, right: -80, width: 360, height: 360, backgroundColor: "rgba(140,115,53,0.14)" }]} />
      <View style={[s.grid, StyleSheet.absoluteFill as any]} />

      <Animated.View style={{ opacity: enter, transform: [{ translateY: enterY }], flex: 1, justifyContent: "space-between" }}>
        <View style={s.brandRow}>
          <View style={s.brandMark}><Ionicons name="film-outline" size={18} color={D.brand} /></View>
          <Text style={s.brandText}>FRAMEFLOW STUDIO</Text>
        </View>

        <View>
          <Text style={s.kicker}>THE AI OPERATING SYSTEM</Text>
          <Text style={s.headline}>The AI Operating System{"\n"}for Video Production</Text>
          <Text style={s.sub}>From concept to camera. Build professional productions with AI.</Text>

          {/* rotating showcase card */}
          <Animated.View style={[...glass(s.showcase), { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
            <View style={s.showIcon}><Ionicons name={card.icon} size={20} color={D.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.showTitle}>{card.title}</Text>
              <Text style={s.showDesc}>{card.desc}</Text>
            </View>
            <View style={s.dots}>
              {SHOWCASE.map((_, k) => <View key={k} style={[s.dot, k === i && s.dotOn]} />)}
            </View>
          </Animated.View>

          {/* floating glass chips */}
          <View style={s.floatRow}>
            <Animated.View style={[...glass(s.floatChip), { transform: [{ translateY: fA }] }]}>
              <Ionicons name="videocam-outline" size={14} color={D.onBrandTint} /><Text style={s.floatText}>4K · 24fps</Text>
            </Animated.View>
            <Animated.View style={[...glass(s.floatChip), { transform: [{ translateY: fB }] }]}>
              <Ionicons name="color-palette-outline" size={14} color={D.onBrandTint} /><Text style={s.floatText}>Cinematic grade</Text>
            </Animated.View>
          </View>
        </View>

        <Text style={s.footer}>Trusted by filmmakers, videographers & creative teams.</Text>
      </Animated.View>
    </View>
  );
}

export default function AuthShell({ title, subtitle, children }: any) {
  const { C } = useTheme();
  const { t } = useTranslation();
  const r = useMemo(() => createRightStyles(C), [C]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(enter, { toValue: 1, duration: 700, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  const y = enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        {wide && <View style={{ flex: 1.05 }}><Hero /></View>}
        <View style={r.rightWrap}>
          <ScrollView contentContainerStyle={[r.rightContent, { paddingTop: insets.top + (wide ? S.xxxl : S.xxl), paddingBottom: insets.bottom + S.xxl }]} showsVerticalScrollIndicator={false}>
            <Animated.View style={[r.card, { opacity: enter, transform: [{ translateY: y }] }]}>
              <View style={r.logoRow}>
                <View style={r.brandMark}><Ionicons name="film-outline" size={18} color={C.brand} /></View>
                <Text style={r.logoText}>FRAMEFLOW STUDIO</Text>
              </View>
              <Text style={r.title}>{title}</Text>
              {subtitle ? <Text style={r.subtitle}>{subtitle}</Text> : null}
              <View style={{ marginTop: S.lg }}>{children}</View>
            </Animated.View>
            {!wide && <Text style={r.mobileTag}>{t("auth:tagline")}</Text>}
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Fixed cinematic-dark hero styles
const s = StyleSheet.create({
  hero: { flex: 1, overflow: "hidden", padding: S.xxxl, justifyContent: "space-between" },
  blob: { position: "absolute", width: 300, height: 300, borderRadius: 300 },
  grid: { opacity: 0.04, borderColor: D.brand },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: D.brandTint, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(197,160,89,0.3)" },
  brandText: { color: D.brand, fontFamily: F.text, fontSize: 13, letterSpacing: 3, fontWeight: "600" },
  kicker: { color: D.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 4, marginBottom: 14 },
  headline: { color: D.onSurface, fontFamily: F.display, fontSize: 46, lineHeight: 50, fontWeight: "500" },
  sub: { color: D.onSurface2, fontFamily: F.text, fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 440 },
  showcase: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: R.lg, padding: S.lg, marginTop: S.xxl, maxWidth: 460 },
  showIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: D.brandTint, alignItems: "center", justifyContent: "center" },
  showTitle: { color: D.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  showDesc: { color: D.onSurface2, fontFamily: F.text, fontSize: 12.5, marginTop: 2 },
  dots: { gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: D.borderStrong },
  dotOn: { backgroundColor: D.brand, height: 14 },
  floatRow: { flexDirection: "row", gap: 12, marginTop: S.lg },
  floatChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 8 },
  floatText: { color: D.onBrandTint, fontFamily: F.text, fontSize: 12 },
  footer: { color: D.onSurface2, fontFamily: F.text, fontSize: 12.5 },
});

// Themed right-side (form) styles
const createRightStyles = (C: Palette) => StyleSheet.create({
  rightWrap: { flex: 1, backgroundColor: C.surface },
  rightContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: S.xl },
  card: { width: "100%", maxWidth: 420, borderRadius: R.lg, padding: S.xl, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  brandMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: S.xl },
  logoText: { color: C.brand, fontFamily: F.text, fontSize: 12, letterSpacing: 2.5, fontWeight: "600" },
  title: { color: C.onSurface, fontFamily: F.display, fontSize: 32, fontWeight: "500" },
  subtitle: { color: C.onSurface2, fontFamily: F.text, fontSize: 14.5, marginTop: 6, lineHeight: 21 },
  mobileTag: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, textAlign: "center", marginTop: S.xl, letterSpacing: 0.5 },
});
