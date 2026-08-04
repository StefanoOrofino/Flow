import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { api } from "@/src/api";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { H1, H2, Body, Card, Badge, Btn } from "@/src/components";

function UsageBar({ m, C, styles, t }: any) {
  const pct = m.unlimited ? 100 : m.percent;
  const color = m.unlimited ? C.brand : m.percent >= 100 ? C.error : m.percent >= 80 ? C.warning : C.brand;
  return (
    <View style={{ marginBottom: S.md }}>
      <View style={styles.usageRow}>
        <Text style={styles.usageLabel}>{m.label}</Text>
        <Text style={styles.usageValue}>
          {m.unlimited ? `${m.used} · ${t("unlimited")}` : t("used", { used: m.used, limit: m.limit })}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function PlanCard({ plan, current, C, styles, t }: any) {
  const popular = plan.id === "studio";
  return (
    <View style={[styles.planCard, current && { borderColor: C.brand }]}>
      <View style={styles.planHead}>
        <Text style={styles.planName}>{plan.name}</Text>
        {current ? <Badge label={t("currentTag")} tone="brand" /> : popular ? <Badge label={t("mostPopular")} tone="success" /> : null}
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{plan.price}</Text>
        {plan.interval !== "forever" ? <Text style={styles.interval}>/{plan.interval}</Text> : null}
      </View>
      <Text style={styles.planTag}>{plan.tagline}</Text>
      <View style={{ marginTop: S.sm }}>
        {plan.features.map((f: string) => (
          <View key={f} style={styles.featRow}>
            <Ionicons name="checkmark-circle" size={15} color={C.brand} />
            <Text style={styles.featTxt}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Billing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useTranslation("billing");
  const styles = useMemo(() => createStyles(C), [C]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setErr("");
      const d = await api.billingSummary();
      setData(d);
    } catch (e: any) {
      setErr(e.message || t("loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const statusKey = data ? (data.status === "past_due" ? "statusPast_due" : data.status === "canceled" ? "statusCanceled" : "statusActive") : "statusActive";
  const statusTone: any = data?.status === "active" ? "success" : "default";

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="billing-back">
          <Ionicons name="arrow-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      ) : err ? (
        <View style={styles.center}>
          <Body muted style={{ marginBottom: S.md }}>{err}</Body>
          <Btn title={t("retry")} icon="refresh" small onPress={() => { setLoading(true); load(); }} />
        </View>
      ) : (
        <ScrollView
          testID="billing-scroll"
          contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 60, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.brand} />}
        >
          <H1 style={{ marginBottom: 2 }}>{t("title")}</H1>
          <Body muted style={{ marginBottom: S.lg }}>{t("subtitle")}</Body>

          {/* Current plan */}
          <Card style={{ marginBottom: S.lg }}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>{t("currentPlan")}</Text>
              <Badge label={t(statusKey)} tone={statusTone} />
            </View>
            <View style={styles.planTopRow}>
              <View>
                <H2>{data.plan.name}</H2>
                <Text style={styles.planTag}>{data.plan.tagline}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.bigPrice}>{data.plan.price}</Text>
                <Text style={styles.interval}>{data.plan.interval === "forever" ? t("freeForever") : t("perInterval", { interval: data.plan.interval })}</Text>
              </View>
            </View>
          </Card>

          {/* Usage */}
          <Text style={styles.sectionHeading}>{t("usage")}</Text>
          <Card style={{ marginBottom: S.lg }}>
            {data.usage.map((m: any) => <UsageBar key={m.key} m={m} C={C} styles={styles} t={t} />)}
          </Card>

          {/* Plan limits */}
          <Text style={styles.sectionHeading}>{t("planLimits")}</Text>
          <Card style={{ marginBottom: S.lg }}>
            {data.usage.map((m: any, i: number) => (
              <View key={m.key} style={[styles.limitRow, i > 0 && styles.divider]}>
                <Text style={styles.limitLabel}>{m.label}</Text>
                <Text style={styles.limitValue}>{m.unlimited ? t("unlimited") : m.limit}</Text>
              </View>
            ))}
          </Card>

          {/* Upgrade placeholder */}
          <Card style={{ marginBottom: S.lg }}>
            <View style={styles.rowCenterGap}>
              <Ionicons name="sparkles-outline" size={18} color={C.brand} />
              <Text style={styles.upgradeNote}>{t("upgradeSoon")}</Text>
            </View>
            <Btn title={t("upgrade")} icon="arrow-up-circle-outline" disabled style={{ marginTop: S.md }} testID="upgrade-btn" onPress={() => {}} />
          </Card>

          {/* Available plans */}
          <Text style={styles.sectionHeading}>{t("comparePlans")}</Text>
          <View style={{ gap: 12 }}>
            {data.plans.map((p: any) => (
              <PlanCard key={p.id} plan={p} current={p.id === data.plan.id} C={C} styles={styles} t={t} />
            ))}
          </View>

          <Text style={styles.footNote}>{t("note")}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xl },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowCenterGap: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase" },
  sectionHeading: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "700", marginBottom: S.sm, marginTop: S.xs },

  planTopRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: S.sm },
  planTag: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, marginTop: 2, maxWidth: 220 },
  bigPrice: { color: C.onSurface, fontFamily: F.display, fontSize: 30 },
  interval: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },

  usageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  usageLabel: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5 },
  usageValue: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.surface3, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },

  limitRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  limitLabel: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5 },
  limitValue: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "600" },

  upgradeNote: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, flex: 1 },

  planCard: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  planHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planName: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginTop: S.sm },
  price: { color: C.onSurface, fontFamily: F.display, fontSize: 26 },
  featRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  featTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, flex: 1 },

  footNote: { color: C.onSurface3, fontFamily: F.text, fontSize: 12, textAlign: "center", marginTop: S.lg, fontStyle: "italic" },
});
