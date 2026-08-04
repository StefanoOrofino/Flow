import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { LogoMark, LOGO_VARIANTS, LogoVariant } from "@/src/brand/FrameFlowLogo";

// Brand palette for the exploration (fixed — independent of app theme).
const GOLD = "#C5A059";
const INK = "#141518";
const INK2 = "#1F2126";
const CREAM = "#F5F1E8";
const MONO = "#9A9A9A";

function Wordmark({ tone, size = 22 }: { tone: "light" | "dark"; size?: number }) {
  const base = tone === "light" ? CREAM : INK;
  return (
    <View>
      <Text style={{ fontFamily: F.display, fontSize: size, letterSpacing: 0.3 }}>
        <Text style={{ color: base }}>Frame</Text>
        <Text style={{ color: GOLD }}>Flow</Text>
      </Text>
      <Text style={{ fontFamily: F.text, fontSize: size * 0.34, letterSpacing: size * 0.22, color: tone === "light" ? "rgba(245,241,232,0.7)" : "rgba(20,21,24,0.6)", marginTop: 2 }}>
        STUDIO
      </Text>
    </View>
  );
}

function Tile({ label, bg, border, children, styles }: any) {
  return (
    <View style={styles.tileWrap}>
      <View style={[styles.tile, { backgroundColor: bg, borderColor: border || "transparent" }]}>
        {children}
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function VariantCard({ v, styles }: { v: { id: LogoVariant; name: string; note: string }; styles: any }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.badge}><Text style={styles.badgeTxt}>{String(v.id).padStart(2, "0")}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{v.name}</Text>
          <Text style={styles.cardNote}>{v.note}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Tile label="Dark background" bg={INK} styles={styles}>
          <LogoMark variant={v.id} color={CREAM} size={62} />
        </Tile>
        <Tile label="Light background" bg={CREAM} styles={styles}>
          <LogoMark variant={v.id} color={INK} size={62} />
        </Tile>
        <Tile label="Gold accent" bg={INK} styles={styles}>
          <LogoMark variant={v.id} color={GOLD} size={62} />
        </Tile>
        <Tile label="Monochrome" bg="#FFFFFF" border="#E7E3D9" styles={styles}>
          <LogoMark variant={v.id} color={MONO} size={62} />
        </Tile>

        <Tile label="Horizontal lockup" bg={INK} styles={styles} >
          <View style={styles.lockup}>
            <LogoMark variant={v.id} color={GOLD} size={44} />
            <Wordmark tone="light" size={20} />
          </View>
        </Tile>
        <Tile label="Icon only" bg={INK2} styles={styles}>
          <LogoMark variant={v.id} color={GOLD} size={56} />
        </Tile>

        <Tile label="App icon" bg="transparent" styles={styles}>
          <View style={styles.appIcon}>
            <LogoMark variant={v.id} color={GOLD} size={64} />
          </View>
        </Tile>
        <Tile label="Favicon" bg="#FFFFFF" border="#E7E3D9" styles={styles}>
          <View style={styles.faviconRow}>
            <View style={styles.faviBox}><LogoMark variant={v.id} color={GOLD} size={16} /></View>
            <View style={styles.faviBox}><LogoMark variant={v.id} color={INK} size={24} /></View>
            <View style={styles.faviBoxDark}><LogoMark variant={v.id} color={GOLD} size={32} /></View>
          </View>
        </Tile>
      </View>
    </View>
  );
}

export default function LogoExploration() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="logo-back">
          <Ionicons name="arrow-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Logo Exploration</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 80, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        <Text style={styles.hero}>Flow Forward</Text>
        <Text style={styles.sub}>
          Six refined variations of one direction: a negative-space “F” built from cinematic frames with
          forward motion. Choose the direction to take into final brand implementation.
        </Text>

        <View style={styles.pillRow}>
          {["Negative-space F", "Cinematic frames", "Premium SaaS", "Simple", "Scalable", "Balanced"].map((p) => (
            <View key={p} style={styles.pill}><Text style={styles.pillTxt}>{p}</Text></View>
          ))}
        </View>

        {LOGO_VARIANTS.map((v) => <VariantCard key={v.id} v={v} styles={styles} />)}

        <Text style={styles.footNote}>
          Exploration board only — not the production logo. Tell me which number to refine and lock in.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  hero: { color: C.onSurface, fontFamily: F.display, fontSize: 40, lineHeight: 44 },
  sub: { color: C.onSurface2, fontFamily: F.text, fontSize: 14, lineHeight: 21, marginTop: S.sm, marginBottom: S.lg },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: S.xl },
  pill: { backgroundColor: C.surface3, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  pillTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },

  card: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.lg },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: S.md },
  badge: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  badgeTxt: { color: C.brand, fontFamily: F.display, fontSize: 18, fontWeight: "700" },
  cardTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 16, fontWeight: "600" },
  cardNote: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, marginTop: 1 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tileWrap: { width: 150, maxWidth: "47%", flexGrow: 1 },
  tile: { height: 108, borderRadius: R.md, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  tileLabel: { color: C.onSurface3, fontFamily: F.text, fontSize: 11, marginTop: 6, textAlign: "center" },

  lockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  appIcon: { width: 72, height: 72, borderRadius: 16, backgroundColor: INK, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(197,160,89,0.25)" },
  faviconRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  faviBox: { alignItems: "center", justifyContent: "center" },
  faviBoxDark: { backgroundColor: INK, borderRadius: 6, padding: 4, alignItems: "center", justifyContent: "center" },

  footNote: { color: C.onSurface3, fontFamily: F.text, fontSize: 12.5, textAlign: "center", marginTop: S.md, fontStyle: "italic" },
});
