import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { LogoMark, AppIcon, HorizontalLogo, VerticalLogo, BRAND } from "@/src/brand/FrameFlowLogo";

function Section({ title, sub, styles, children }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.secTitle}>{title}</Text>
      {sub ? <Text style={styles.secSub}>{sub}</Text> : null}
      <View style={styles.secBody}>{children}</View>
    </View>
  );
}

function Panel({ bg, border, children, styles, flex = 1, h, full }: any) {
  return (
    <View style={[styles.panel, full && { flexBasis: "100%" }, { backgroundColor: bg, borderColor: border || "transparent", flexGrow: flex, minHeight: h || 120 }]}>
      {children}
    </View>
  );
}

export default function BrandLogo() {
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
        <Text style={styles.headerTitle}>Brand Identity</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 80, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        {/* Hero */}
        <Text style={styles.hero}>Flow Forward</Text>
        <Text style={styles.sub}>
          The official FrameFlow Studio mark — two cinematic frames flowing into each other with forward
          motion. Refined for perfect balance and scalability. Minimal, premium, no gradients, no shadows.
        </Text>

        <View style={styles.heroMark}>
          <LogoMark color={BRAND.gold} size={132} />
        </View>

        {/* Primary lockups */}
        <Section title="Horizontal logo" sub="Primary lockup for headers, documents and exports." styles={styles}>
          <Panel bg={BRAND.ink} styles={styles} h={104} full><HorizontalLogo tone="dark" size={40} /></Panel>
          <Panel bg={BRAND.light} border="#E7E3D9" styles={styles} h={104} full><HorizontalLogo tone="light" size={40} /></Panel>
        </Section>

        <Section title="Vertical logo" sub="Stacked lockup for splash screens and centered layouts." styles={styles}>
          <Panel bg={BRAND.ink} styles={styles} h={180} full><VerticalLogo tone="dark" size={72} /></Panel>
          <Panel bg={BRAND.light} border="#E7E3D9" styles={styles} h={180} full><VerticalLogo tone="light" size={72} /></Panel>
        </Section>

        {/* App icons */}
        <Section title="App icon" sub="Rounded square, radius matches the FrameFlow UI (22.5%)." styles={styles}>
          <Panel bg={C.surface3} styles={styles} h={170}>
            <AppIcon size={104} bg={BRAND.ink} fg={BRAND.gold} />
            <Text style={styles.cap}>Dark</Text>
          </Panel>
          <Panel bg={C.surface3} styles={styles} h={170}>
            <AppIcon size={104} bg={BRAND.light} fg={BRAND.ink} border="#E7E3D9" />
            <Text style={styles.cap}>Light</Text>
          </Panel>
        </Section>

        {/* Color versions */}
        <Section title="Color versions" sub="Single-color mark — works everywhere." styles={styles}>
          <Panel bg={BRAND.ink} styles={styles}><LogoMark color={BRAND.gold} size={64} /><Text style={styles.cap}>Gold #C5A059</Text></Panel>
          <Panel bg={BRAND.ink} styles={styles}><LogoMark color={BRAND.light} size={64} /><Text style={styles.cap}>On dark</Text></Panel>
          <Panel bg={BRAND.light} border="#E7E3D9" styles={styles}><LogoMark color={BRAND.ink} size={64} /><Text style={styles.capD}>On light</Text></Panel>
          <Panel bg="#FFFFFF" border="#E7E3D9" styles={styles}><LogoMark color={BRAND.mono} size={64} /><Text style={styles.capD}>Monochrome</Text></Panel>
        </Section>

        {/* Favicon */}
        <Section title="Favicon" sub="App-icon style for maximum legibility on browser tabs." styles={styles}>
          <Panel bg={C.surface3} styles={styles} h={130}>
            <View style={styles.faviRow}>
              <AppIcon size={16} />
              <AppIcon size={24} />
              <AppIcon size={32} />
              <AppIcon size={48} />
            </View>
            <Text style={styles.cap}>16 · 24 · 32 · 48 px</Text>
          </Panel>
          <Panel bg={C.surface3} styles={styles} h={130}>
            <View style={styles.tab}>
              <AppIcon size={16} />
              <Text style={styles.tabTxt}>FrameFlow Studio</Text>
              <Ionicons name="close" size={12} color={C.onSurface3} />
            </View>
            <Text style={styles.cap}>Browser tab</Text>
          </Panel>
        </Section>

        {/* Scalability */}
        <Section title="Scalability" sub="Crisp from 16px to 1024px — pure vector, even stroke weight." styles={styles}>
          <Panel bg={BRAND.ink} styles={styles} h={150}>
            <View style={styles.scaleRow}>
              <View style={styles.scaleItem}><LogoMark color={BRAND.gold} size={16} /><Text style={styles.tiny}>16</Text></View>
              <View style={styles.scaleItem}><LogoMark color={BRAND.gold} size={24} /><Text style={styles.tiny}>24</Text></View>
              <View style={styles.scaleItem}><LogoMark color={BRAND.gold} size={32} /><Text style={styles.tiny}>32</Text></View>
              <View style={styles.scaleItem}><LogoMark color={BRAND.gold} size={64} /><Text style={styles.tiny}>64</Text></View>
              <View style={styles.scaleItem}><LogoMark color={BRAND.gold} size={96} /><Text style={styles.tiny}>1024</Text></View>
            </View>
          </Panel>
        </Section>

        {/* Spacing / safe area */}
        <Section title="Clear space & safe area" sub="Keep clear space of one frame-height (X) on every side." styles={styles}>
          <Panel bg={C.surface3} styles={styles} h={200}>
            <View style={styles.safeOuter}>
              <View style={styles.safeInner}>
                <LogoMark color={BRAND.gold} size={92} />
              </View>
              <Text style={styles.safeTag}>X</Text>
            </View>
            <Text style={styles.cap}>Minimum clear space = X on all sides</Text>
          </Panel>
        </Section>

        {/* Palette */}
        <Section title="Brand palette" styles={styles}>
          {[["Gold", BRAND.gold, "#C5A059"], ["Ink", BRAND.ink, "#232333"], ["Light", BRAND.light, "#F7F5EF"]].map(([n, hex, code]) => (
            <Panel key={n as string} bg={C.surface3} styles={styles} h={110}>
              <View style={[styles.swatch, { backgroundColor: hex as string, borderColor: C.border }]} />
              <Text style={styles.cap}>{n} · {code}</Text>
            </Panel>
          ))}
        </Section>

        <Text style={styles.footNote}>
          Official direction — refined from Concept 2 “Flow Forward”. SVG source exported to
          assets/brand/. Tell me to wire it into the app header, splash and favicon to ship it.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  hero: { color: C.onSurface, fontFamily: F.display, fontSize: 40, lineHeight: 44 },
  sub: { color: C.onSurface2, fontFamily: F.text, fontSize: 14, lineHeight: 21, marginTop: S.sm },
  heroMark: { alignItems: "center", justifyContent: "center", paddingVertical: S.xl, marginTop: S.md, marginBottom: S.sm, backgroundColor: BRAND.ink, borderRadius: R.lg, borderWidth: 1, borderColor: C.border },

  section: { marginTop: S.xl },
  secTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 16, fontWeight: "700" },
  secSub: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, marginTop: 2, marginBottom: S.md },
  secBody: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: S.sm },

  panel: { flexBasis: "45%", borderRadius: R.md, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: S.md, overflow: "hidden" },
  cap: { color: "rgba(245,241,232,0.75)", fontFamily: F.text, fontSize: 11, marginTop: 8 },
  capD: { color: "rgba(35,35,51,0.7)", fontFamily: F.text, fontSize: 11, marginTop: 8 },
  tiny: { color: "rgba(245,241,232,0.6)", fontFamily: F.text, fontSize: 10, marginTop: 4 },

  faviRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  tab: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: BRAND.ink, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  tabTxt: { color: BRAND.light, fontFamily: F.text, fontSize: 12 },

  scaleRow: { flexDirection: "row", alignItems: "flex-end", gap: 18 },
  scaleItem: { alignItems: "center" },

  safeOuter: { padding: 22, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND.gold, borderRadius: 10, position: "relative" },
  safeInner: { padding: 22, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(197,160,89,0.4)", borderRadius: 8 },
  safeTag: { position: "absolute", top: 4, left: 8, color: BRAND.gold, fontFamily: F.text, fontSize: 11, fontWeight: "700" },

  swatch: { width: 60, height: 40, borderRadius: 8, borderWidth: 1 },

  footNote: { color: C.onSurface3, fontFamily: F.text, fontSize: 12.5, textAlign: "center", marginTop: S.xl, fontStyle: "italic" },
});
