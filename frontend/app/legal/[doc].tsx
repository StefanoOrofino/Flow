import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/ThemeProvider";
import { useLanguage } from "@/src/LanguageProvider";
import { S, F, MAX_W } from "@/src/theme";
import { LEGAL, LegalDoc } from "@/src/content/legal";

export default function LegalScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const { currentLanguage } = useLanguage();
  const it = currentLanguage === "it";
  const styles = useMemo(() => createStyles(C), [C]);

  const key = (["privacy", "terms", "cookies"].includes(String(doc)) ? doc : "privacy") as keyof typeof LEGAL;
  const d: LegalDoc = LEGAL[key][it ? "it" : "en"];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="legal-back">
          <Ionicons name="arrow-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{d.title}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 60, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        <Text style={styles.h1}>{d.title}</Text>
        <Text style={styles.updated}>{it ? "Ultimo aggiornamento" : "Last updated"}: {d.updated}</Text>
        <Text style={styles.intro}>{d.intro}</Text>

        {d.sections.map((s, i) => (
          <View key={i} style={{ marginTop: S.xl }}>
            <Text style={styles.h2}>{s.h}</Text>
            <Text style={styles.body}>{s.b}</Text>
          </View>
        ))}

        <View style={styles.tabs}>
          {(["privacy", "terms", "cookies"] as const).map((k) => (
            <Pressable key={k} onPress={() => router.replace(`/legal/${k}`)} style={[styles.tab, k === key && styles.tabActive]} testID={`legal-tab-${k}`}>
              <Text style={[styles.tabTxt, k === key && { color: C.brand }]}>{LEGAL[k][it ? "it" : "en"].title}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.disclaimer}>{it
          ? "Questo documento è un modello di base. Ti consigliamo di farlo revisionare da un legale prima della pubblicazione definitiva."
          : "This document is a starting template. We recommend having it reviewed by a lawyer before final publication."}</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingBottom: S.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, gap: 12 },
  headerTitle: { flex: 1, color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600", textAlign: "center" },
  h1: { color: C.onSurface, fontFamily: F.display, fontSize: 30, letterSpacing: -0.5 },
  updated: { color: C.onSurface3, fontFamily: F.text, fontSize: 12.5, marginTop: 6 },
  intro: { color: C.onSurface2, fontFamily: F.text, fontSize: 15, lineHeight: 23, marginTop: S.lg },
  h2: { color: C.onSurface, fontFamily: F.display, fontSize: 19, marginBottom: 6 },
  body: { color: C.onSurface2, fontFamily: F.text, fontSize: 14.5, lineHeight: 23 },
  tabs: { flexDirection: "row", gap: 8, marginTop: S.xxl, flexWrap: "wrap" },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2 },
  tabActive: { borderColor: C.brand, backgroundColor: C.brandTint },
  tabTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, fontWeight: "600" },
  disclaimer: { color: C.onSurface3, fontFamily: F.text, fontSize: 12, lineHeight: 18, marginTop: S.xl, fontStyle: "italic" },
});
