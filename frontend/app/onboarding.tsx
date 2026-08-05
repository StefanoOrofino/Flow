import React, { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/ThemeProvider";
import { storage } from "@/src/utils/storage";
import { LogoMark } from "@/src/brand/FrameFlowLogo";
import { S, R, F } from "@/src/theme";

export const ONBOARDING_KEY = "ff_onboarding_done_v1";

type Slide = { icon: string; title: string; body: string };

export default function Onboarding() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const { t } = useTranslation("onboarding");
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(C), [C]);
  const scRef = useRef<ScrollView>(null);
  const [idx, setIdx] = useState(0);

  const slides = (t("slides", { returnObjects: true }) as unknown as Slide[]) || [];
  const last = idx >= slides.length - 1;
  const W = Math.min(width, 640);

  const finish = async () => {
    await storage.setItem(ONBOARDING_KEY, true);
    if (replay) router.back();
    else router.replace("/(tabs)/dashboard");
  };

  const next = () => {
    if (last) return finish();
    const to = idx + 1;
    setIdx(to);
    scRef.current?.scrollTo({ x: to * W, animated: true });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + S.sm }]}>
        <View style={styles.brandRow}>
          <LogoMark color={C.brand} size={22} gradient />
          <Text style={styles.brand}>FrameFlow</Text>
        </View>
        <Pressable onPress={finish} hitSlop={10} testID="onboarding-skip">
          <Text style={styles.skip}>{t("skip")}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
        style={{ flex: 1 }}
      >
        {slides.map((s, i) => (
          <View key={i} style={[styles.slide, { width: W }]}>
            <View style={styles.iconTile}><Ionicons name={s.icon as any} size={54} color={C.brand} /></View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + S.lg }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={next} testID="onboarding-next">
          <Text style={styles.ctaText}>{last ? t("start") : t("next")}</Text>
          <Ionicons name={last ? "sparkles" : "arrow-forward"} size={17} color={C.onBrand} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.sm },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { color: C.onSurface, fontFamily: F.display, fontSize: 17 },
  skip: { color: C.onSurface2, fontFamily: F.text, fontSize: 14 },

  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: S.xxl, gap: S.md },
  iconTile: { width: 120, height: 120, borderRadius: 32, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.lg },
  title: { color: C.onSurface, fontFamily: F.display, fontSize: 28, letterSpacing: -0.5, textAlign: "center" },
  body: { color: C.onSurface2, fontFamily: F.text, fontSize: 15.5, lineHeight: 24, textAlign: "center", maxWidth: 420 },

  bottom: { paddingHorizontal: S.xl, gap: S.lg, alignSelf: "center", width: "100%", maxWidth: 640 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive: { backgroundColor: C.brand, width: 22 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, borderRadius: R.pill, paddingVertical: 16, minHeight: 52 },
  ctaText: { color: C.onBrand, fontFamily: F.text, fontSize: 16, fontWeight: "700" },
});
