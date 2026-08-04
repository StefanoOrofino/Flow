import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { H1, Body, AnimIn, Skeleton } from "@/src/components";
import { TEMPLATE_CATEGORIES } from "@/src/options";

const ICONS: Record<string, string> = {
  Commercial: "megaphone-outline", Corporate: "business-outline", Product: "cube-outline",
  "Music Video": "musical-notes-outline", Interview: "mic-outline", Documentary: "film-outline",
  TikTok: "logo-tiktok", "Instagram Reel": "logo-instagram", YouTube: "logo-youtube",
  Event: "sparkles-outline", Wedding: "heart-outline", Fashion: "shirt-outline",
};

export default function Templates() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const { width } = useWindowDimensions();
  const cols = width > 720 ? 2 : 1;
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("All");

  useFocusEffect(useCallback(() => {
    (async () => { try { setTemplates(await api.templates()); } catch {} finally { setLoading(false); } })();
  }, []));

  const list = useMemo(() => cat === "All" ? templates : templates.filter((t) => t.category === cat), [templates, cat]);

  const use = (t: any) => router.push({ pathname: "/new", params: {
    title: t.name, video_type: t.video_type, platform: t.platform, duration: t.duration,
    aspect_ratio: t.aspect_ratio, num_scenes: String(t.num_scenes), crew_size: t.crew_size,
    visual_style: t.visual_style, mood: t.mood } });

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.lg }]}>
        <H1>Templates</H1>
        <Body muted style={{ marginTop: 4 }}>Start faster with a proven production format.</Body>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingVertical: S.md }}>
          {TEMPLATE_CATEGORIES.map((cc) => (
            <Pressable key={cc} onPress={() => setCat(cc)} style={[styles.chip, cat === cc && styles.chipActive]} testID={`cat-${cc}`}>
              <Text style={[styles.chipText, cat === cc && { color: C.onBrand }]}>{cc}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        {loading ? (
          <View style={{ gap: S.md }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={150} radius={20} />)}</View>
        ) : (
          <View style={[styles.grid, cols === 1 && { flexDirection: "column" }]}>
            {list.map((t, i) => (
              <AnimIn key={t.id} delay={i * 40} style={{ width: cols === 2 ? "48.5%" : "100%" }}>
                <Pressable style={styles.card} onPress={() => use(t)} testID={`template-${t.id}`}>
                  <View style={styles.cardTop}>
                    <LinearGradient colors={["#2a2416", "#0e0e0e"]} style={StyleSheet.absoluteFill} />
                    <View style={styles.iconBox}><Ionicons name={(ICONS[t.category] || "albums-outline") as any} size={22} color={C.brand} /></View>
                    <Text style={styles.catTag}>{t.category}</Text>
                  </View>
                  <View style={{ padding: S.lg }}>
                    <Text style={styles.title}>{t.name}</Text>
                    <Body muted style={{ marginTop: 4, fontSize: 13 }} numberOfLines={2}>{t.description}</Body>
                    <View style={styles.tags}>
                      <Tag>{t.platform}</Tag><Tag>{t.duration}</Tag><Tag>{t.aspect_ratio}</Tag><Tag>{t.num_scenes} scenes</Tag>
                    </View>
                    <View style={styles.useRow}><Text style={styles.useText}>Use template</Text><Ionicons name="arrow-forward" size={15} color={C.brand} /></View>
                  </View>
                </Pressable>
              </AnimIn>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Tag({ children }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return <View style={styles.tag}><Text style={styles.tagText}>{children}</Text></View>;
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { paddingHorizontal: S.lg, paddingBottom: S.xs, borderBottomWidth: 1, borderBottomColor: C.border },
  chip: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 13, paddingVertical: 7, flexShrink: 0 },
  chipActive: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: S.md },
  card: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.md },
  cardTop: { height: 92, justifyContent: "center", paddingHorizontal: S.lg },
  iconBox: { width: 46, height: 46, borderRadius: R.md, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  catTag: { position: "absolute", top: S.md, right: S.md, color: C.onBrandTint, fontFamily: F.text, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  title: { color: C.onSurface, fontFamily: F.display, fontSize: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: S.md },
  tag: { backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { color: C.onSurface3, fontFamily: F.text, fontSize: 11 },
  useRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: S.lg },
  useText: { color: C.brand, fontFamily: F.text, fontSize: 14, fontWeight: "500" },
});
