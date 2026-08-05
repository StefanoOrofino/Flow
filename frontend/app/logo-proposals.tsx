import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { S, R, F, MAX_W } from "@/src/theme";
import { useLanguage } from "@/src/LanguageProvider";
import { BRAND, Wordmark } from "@/src/brand/FrameFlowLogo";
import { CONCEPTS, MarkProps } from "@/src/brand/LogoProposals";

/** Rounded-square app-icon container (dark) with a gradient mark centred. */
function IconTile({ Mark, size = 88, bg = BRAND.ink }: { Mark: React.ComponentType<MarkProps>; size?: number; bg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.225, backgroundColor: bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Mark gradient size={size * 0.62} />
    </View>
  );
}

export default function LogoProposals() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { currentLanguage } = useLanguage();
  const it = currentLanguage === "it";
  const styles = useMemo(() => createStyles(), []);
  const wide = width > 900;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="lp-back">
          <Ionicons name="arrow-back" size={22} color={BRAND.gold} />
        </Pressable>
        <Text style={styles.headerTitle}>FRAMEFLOW STUDIO — {it ? "CONCEPT LOGO" : "LOGO CONCEPTS"}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 60, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        <Text style={styles.intro}>
          {it
            ? "Tre direzioni nello stile che ti piace, con oro metallico. Dimmi il numero preferito e lo rifinisco e lo applico ovunque (header, landing, splash, icona app)."
            : "Three directions in the style you like, with metallic gold. Tell me your favourite number and I'll refine it and roll it out everywhere."}
        </Text>

        <View style={[styles.grid, wide && { flexDirection: "row" }]}>
          {CONCEPTS.map((c) => {
            const Mark = c.Mark;
            return (
              <View key={c.id} style={[styles.col, wide && { flex: 1 }]} testID={`concept-${c.id}`}>
                <View style={styles.badge}><Text style={styles.badgeTxt}>{it ? "CONCEPT" : "CONCEPT"} {c.n}</Text></View>
                <Text style={styles.name}>{c.name.toUpperCase()}</Text>
                <Text style={styles.desc}>{it ? c.descIt : c.descEn}</Text>

                {/* primary mark on cinematic dark */}
                <View style={styles.stage}>
                  <Mark gradient size={140} />
                </View>
                <View style={{ alignItems: "center", marginTop: S.md }}>
                  <Wordmark color={BRAND.light} accent={BRAND.gold} size={26} align="center" />
                </View>

                {/* icona + icona app */}
                <View style={styles.iconRow}>
                  <View style={styles.iconCell}>
                    <IconTile Mark={Mark} bg="#141416" />
                    <Text style={styles.iconLbl}>{it ? "ICONA" : "ICON"}</Text>
                  </View>
                  <View style={styles.iconCell}>
                    <IconTile Mark={Mark} bg={BRAND.ink} />
                    <Text style={styles.iconLbl}>{it ? "ICONA APP" : "APP ICON"}</Text>
                  </View>
                </View>

                {/* light mode strip */}
                <View style={styles.light}>
                  <Text style={styles.lightLbl}>LIGHT MODE</Text>
                  <View style={styles.lightRow}>
                    <View style={styles.lightTile}><Mark color={BRAND.ink} size={44} /></View>
                    <Wordmark color={BRAND.ink} accent={BRAND.gold} size={17} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* palette footer */}
        <View style={styles.palette}>
          {[["#C5A059", "GOLD"], ["#232333", "INK"], ["#F7F5EF", it ? "CREMA" : "CREAM"]].map(([hex, name]) => (
            <View key={hex} style={styles.swatchRow}>
              <View style={[styles.swatch, { backgroundColor: hex, borderColor: hex === "#F7F5EF" ? "rgba(255,255,255,0.2)" : "transparent" }]} />
              <Text style={styles.swatchTxt}>{name}  {hex}</Text>
            </View>
          ))}
        </View>
        <LinearGradient colors={["transparent", "transparent"]} style={{ height: 1 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0C" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(197,160,89,0.25)" },
  headerTitle: { color: BRAND.gold, fontFamily: F.text, fontSize: 12.5, fontWeight: "700", letterSpacing: 1 },

  intro: { color: "rgba(247,245,239,0.7)", fontFamily: F.text, fontSize: 14.5, lineHeight: 22, paddingHorizontal: S.xl, paddingTop: S.xl, paddingBottom: S.lg, maxWidth: 720 },

  grid: { gap: S.xl, paddingHorizontal: S.xl },
  col: { backgroundColor: "#111013", borderRadius: R.lg, borderWidth: 1, borderColor: "rgba(197,160,89,0.2)", padding: S.xl, alignItems: "center" },
  badge: { borderWidth: 1, borderColor: "rgba(197,160,89,0.5)", borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeTxt: { color: BRAND.gold, fontFamily: F.text, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  name: { color: BRAND.light, fontFamily: F.display, fontSize: 24, letterSpacing: 1, marginTop: S.md },
  desc: { color: "rgba(247,245,239,0.6)", fontFamily: F.text, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6, maxWidth: 300 },

  stage: { width: "100%", height: 200, alignItems: "center", justifyContent: "center", marginTop: S.lg },

  iconRow: { flexDirection: "row", gap: S.xl, marginTop: S.xl },
  iconCell: { alignItems: "center", gap: 8 },
  iconLbl: { color: "rgba(247,245,239,0.5)", fontFamily: F.text, fontSize: 10.5, letterSpacing: 1 },

  light: { backgroundColor: BRAND.light, borderRadius: R.md, padding: S.lg, marginTop: S.xl, width: "100%", alignItems: "center" },
  lightLbl: { color: "rgba(35,35,51,0.55)", fontFamily: F.text, fontSize: 10.5, letterSpacing: 1.5, marginBottom: S.md },
  lightRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  lightTile: { width: 70, height: 70, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(35,35,51,0.1)", alignItems: "center", justifyContent: "center" },

  palette: { flexDirection: "row", flexWrap: "wrap", gap: S.xl, justifyContent: "center", paddingVertical: S.xxl, paddingHorizontal: S.xl },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 22, height: 22, borderRadius: 5, borderWidth: 1 },
  swatchTxt: { color: "rgba(247,245,239,0.65)", fontFamily: F.text, fontSize: 12, letterSpacing: 0.5 },
});
