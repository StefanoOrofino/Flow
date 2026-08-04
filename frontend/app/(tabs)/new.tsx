import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { H1, Body } from "@/src/components";

export default function NewProjectChoice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useTranslation("createProject");
  const styles = useMemo(() => createStyles(C), [C]);

  const cards = [
    { key: "upload", icon: "cloud-upload-outline" as const, title: t("opt1Title"), desc: t("opt1Desc"), btn: t("opt1Btn"), route: "/brief-upload", testID: "choice-upload" },
    { key: "manual", icon: "add-circle-outline" as const, title: t("opt2Title"), desc: t("opt2Desc"), btn: t("opt2Btn"), route: "/manual-project", testID: "choice-manual" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="choice-back"><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <Text style={styles.headerTitle}>{t("chooseTitle")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 40, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        <H1 style={{ marginBottom: 4 }}>{t("chooseTitle")}</H1>
        <Body muted style={{ marginBottom: S.xl }}>{t("chooseSubtitle")}</Body>

        {cards.map((c, i) => (
          <Animated.View key={c.key} entering={FadeInDown.delay(i * 80).duration(300)}>
            <Pressable onPress={() => router.push(c.route)} testID={c.testID} style={({ pressed }) => [styles.card, pressed && { borderColor: C.brand, transform: [{ scale: 0.995 }] }]}>
              <View style={styles.cardIcon}><Ionicons name={c.icon} size={26} color={C.brand} /></View>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardDesc}>{c.desc}</Text>
              <View style={styles.cardBtn}>
                <Text style={styles.cardBtnTxt}>{c.btn}</Text>
                <Ionicons name="arrow-forward" size={16} color={C.onBrand} />
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  card: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xl, marginBottom: S.lg },
  cardIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.md },
  cardTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 24, fontWeight: "500" },
  cardDesc: { color: C.onSurface2, fontFamily: F.text, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: S.lg },
  cardBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 14, minHeight: 50 },
  cardBtnTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
});
