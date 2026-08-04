import React, { useMemo, useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { api } from "@/src/api";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { H1, Body } from "@/src/components";

// Feature comparison values keyed by plan id. Tokens resolved via i18n at render.
function matrix(t: (k: string) => string) {
  return [
    { key: "active_projects", free: "3", pro: "25", studio: t("unlimited") },
    { key: "ai_director", free: t("basic"), pro: t("priority"), studio: t("priorityPlus") },
    { key: "ai_images", free: `10 ${t("perMo")}`, pro: `300 ${t("perMo")}`, studio: `1500 ${t("perMo")}` },
    { key: "brief_imports", free: `3 ${t("perMo")}`, pro: `50 ${t("perMo")}`, studio: t("unlimited") },
    { key: "pdf_exports", free: `5 ${t("perMo")}`, pro: t("unlimited"), studio: t("unlimited") },
    { key: "team", free: t("none"), pro: `3 ${t("seats")}`, studio: t("unlimited") },
    { key: "client_review", free: t("none"), pro: t("linkSharing"), studio: t("brandedPortals") },
    { key: "storage", free: "storage", pro: "storage", studio: "storage" },
  ];
}

export default function Pricing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useTranslation("pricing");
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(C), [C]);
  const wide = width >= 900;

  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.billingSummary()
      .then((d: any) => { setCurrentPlan(d.plan?.id || "free"); setPlans(d.plans || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rows = matrix(t as any);

  const onUpgrade = (planId: string) => {
    if (planId === currentPlan) return;
    setNotice(t("checkoutSoon"));
  };

  const Card = ({ plan }: { plan: any }) => {
    const isCurrent = plan.id === currentPlan;
    const rec = plan.recommended;
    return (
      <View style={[styles.card, rec && styles.cardRec, wide && styles.cardWide]} testID={`plan-${plan.id}`}>
        {rec ? <View style={styles.recBadge}><Text style={styles.recBadgeTxt}>{t("recommended")}</Text></View> : null}
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.interval}>{plan.interval === "forever" ? t("forever") : t("perMonth")}</Text>
        </View>
        <Text style={styles.tagline}>{plan.tagline}</Text>

        <Pressable
          onPress={() => onUpgrade(plan.id)}
          disabled={isCurrent}
          testID={`upgrade-${plan.id}`}
          style={({ pressed }) => [styles.cta, rec && styles.ctaRec, isCurrent && styles.ctaCurrent, { opacity: isCurrent ? 0.6 : pressed ? 0.9 : 1 }]}
        >
          <Text style={[styles.ctaTxt, rec && styles.ctaTxtRec, isCurrent && styles.ctaTxtCurrent]}>
            {isCurrent ? t("currentBtn") : plan.id === "free" ? t("getStarted") : t("upgradeBtn")}
          </Text>
        </Pressable>

        <View style={styles.featureList}>
          {rows.map((r) => {
            const val = r.key === "storage"
              ? (plan.storage_gb != null ? `${plan.storage_gb} GB` : "—")
              : ((r as any)[plan.id] ?? "—");
            return (
              <View key={r.key} style={styles.featRow}>
                <Text style={styles.featLabel}>{t(r.key)}</Text>
                <Text style={styles.featVal}>{val}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="pricing-back"><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <Text style={styles.headerTitle}>{t("title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 40, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
          <H1 style={{ marginBottom: 4 }}>{t("title")}</H1>
          <Body muted style={{ marginBottom: S.lg }}>{t("subtitle")}</Body>

          {notice ? (
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={18} color={C.brand} />
              <Text style={styles.noticeTxt}>{notice}</Text>
            </View>
          ) : null}

          <View style={[styles.grid, wide && styles.gridWide]}>
            {plans.map((p) => <Card key={p.id} plan={p} />)}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  notice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.brandTint, borderRadius: R.md, padding: S.md, marginBottom: S.lg },
  noticeTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 13, flex: 1 },

  grid: { gap: 16 },
  gridWide: { flexDirection: "row", alignItems: "flex-start" },

  card: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xl },
  cardWide: { flex: 1 },
  cardRec: { borderColor: C.brand, borderWidth: 2 },
  recBadge: { alignSelf: "flex-start", backgroundColor: C.brand, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 4, marginBottom: S.sm },
  recBadgeTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 11, fontWeight: "700" },
  planName: { color: C.onSurface, fontFamily: F.display, fontSize: 26 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 4 },
  price: { color: C.onSurface, fontFamily: F.display, fontSize: 34, fontWeight: "600" },
  interval: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, marginBottom: 6 },
  tagline: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, marginTop: 6, marginBottom: S.lg },

  cta: { alignItems: "center", justifyContent: "center", borderRadius: R.md, paddingVertical: 13, minHeight: 48, backgroundColor: C.surface3, borderWidth: 1, borderColor: C.border },
  ctaRec: { backgroundColor: C.brand, borderColor: C.brand },
  ctaCurrent: { backgroundColor: "transparent", borderColor: C.border },
  ctaTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "600" },
  ctaTxtRec: { color: C.onBrand },
  ctaTxtCurrent: { color: C.onSurface2 },

  featureList: { marginTop: S.lg },
  featRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.border },
  featLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, flex: 1 },
  featVal: { color: C.onSurface, fontFamily: F.text, fontSize: 13, fontWeight: "600", textAlign: "right", flexShrink: 1, marginLeft: 8 },
});
