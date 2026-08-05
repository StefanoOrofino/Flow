import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { api } from "@/src/api";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { H1, H2, Body, Card, Badge, Btn } from "@/src/components";
import { LinearGradient } from "expo-linear-gradient";

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
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [canceling, setCanceling] = useState(false);

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

  // After returning from Stripe Checkout (web), confirm the payment by polling.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (!sid) return;
    // Clean the URL so a refresh doesn't re-trigger.
    window.history.replaceState({}, "", window.location.pathname);
    let cancelled = false;
    (async () => {
      setCheckoutMsg(t("checkoutProcessing"));
      for (let i = 0; i < 6; i++) {
        try {
          const r = await api.checkoutStatus(sid);
          if (r.paid) {
            if (cancelled) return;
            setCheckoutMsg(t("checkoutSuccess"));
            await load();
            return;
          }
        } catch { /* keep polling */ }
        await new Promise((res) => setTimeout(res, 1500));
      }
      if (!cancelled) setCheckoutMsg(t("checkoutFailed"));
    })();
    return () => { cancelled = true; };
  }, [t, load]);

  const doCancel = useCallback(async () => {
    try {
      setCanceling(true);
      await api.cancelPlan();
      await load();
    } catch (e: any) {
      setErr(e.message || t("loadError"));
    } finally {
      setCanceling(false);
    }
  }, [load, t]);

  const onCancelPress = useCallback(() => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`${t("cancelConfirmTitle")}\n${t("cancelConfirmBody")}`)) doCancel();
      return;
    }
    Alert.alert(t("cancelConfirmTitle"), t("cancelConfirmBody"), [
      { text: t("keepPlan"), style: "cancel" },
      { text: t("cancelPlan"), style: "destructive", onPress: doCancel },
    ]);
  }, [doCancel, t]);

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

          {/* Checkout confirmation banner (after returning from Stripe) */}
          {checkoutMsg ? (
            <View style={styles.checkoutBanner} testID="checkout-banner">
              <Ionicons name="checkmark-circle" size={20} color={C.brand} />
              <Text style={styles.checkoutBannerTxt}>{checkoutMsg}</Text>
            </View>
          ) : null}

          {/* Current plan — cinematic hero */}
          <View style={styles.hero}>
            <LinearGradient colors={["#241E13", "#15130E", "#0C0C0E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroGlow} pointerEvents="none" />
            <View style={styles.rowBetween}>
              <Text style={styles.heroLabel}>{t("currentPlan")}</Text>
              <Badge label={t(statusKey)} tone={statusTone} />
            </View>
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroPlanName}>{data.plan.name}</Text>
                <Text style={styles.heroTag}>{data.plan.tagline}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.heroPrice}>{data.plan.price}</Text>
                <Text style={styles.heroInterval}>{data.plan.interval === "forever" ? t("freeForever") : t("perInterval", { interval: data.plan.interval })}</Text>
              </View>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.rowBetween}>
              <Text style={styles.heroRenewLabel}>{t("nextRenewal")}</Text>
              <Text style={styles.heroRenewVal}>{data.currentPeriodEnd ? String(data.currentPeriodEnd).slice(0, 10) : t("noRenewal")}</Text>
            </View>
          </View>

          {/* Limit reached upsell */}
          {data.usage.some((m: any) => !m.unlimited && m.percent >= 100) && (
            <Pressable onPress={() => router.push("/pricing")} testID="limit-banner">
              <View style={styles.limitBanner}>
                <Ionicons name="alert-circle" size={20} color={C.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.limitBannerTitle}>{t("limitReached")}</Text>
                  <Text style={styles.limitBannerBody}>{t("limitReachedBody")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.onSurface2} />
              </View>
            </Pressable>
          )}

          {/* Usage */}
          <Text style={styles.sectionHeading}>{t("usage")}</Text>
          <Card style={{ marginBottom: S.lg }}>
            {data.usage.map((m: any) => <UsageBar key={m.key} m={m} C={C} styles={styles} t={t} />)}
          </Card>

          {/* Cloud storage */}
          {data.storage && (
            <>
              <Text style={styles.sectionHeading}>{t("cloudStorage")}</Text>
              <Card style={{ marginBottom: S.lg }}>
                <View style={styles.usageRow}>
                  <View style={styles.rowCenterGap}>
                    <Ionicons name="cloud-outline" size={16} color={C.brand} />
                    <Text style={styles.usageLabel}>{t("cloudStorageIncluded")}</Text>
                  </View>
                  <Text style={styles.usageValue}>{data.storage.display}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, {
                    width: `${data.storage.unlimited ? 100 : data.storage.percent}%`,
                    backgroundColor: data.storage.percent >= 100 ? C.error : data.storage.percent >= 80 ? C.warning : C.brand,
                  }]} />
                </View>
                <Text style={styles.storageNote}>{t("storageNote")}</Text>
              </Card>
            </>
          )}

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

          {/* Upgrade CTA -> Pricing */}
          <Card style={{ marginBottom: S.lg }}>
            <View style={styles.rowCenterGap}>
              <Ionicons name="sparkles-outline" size={18} color={C.brand} />
              <Text style={styles.upgradeNote}>{t("upgradeNote")}</Text>
            </View>
            <Btn title={t("comparePlans")} icon="arrow-up-circle-outline" style={{ marginTop: S.md }} testID="upgrade-btn" onPress={() => router.push("/pricing")} />
            {data.plan.id !== "free" ? (
              <Pressable onPress={onCancelPress} disabled={canceling} testID="cancel-plan-btn" style={styles.cancelBtn}>
                {canceling ? <ActivityIndicator color={C.error} /> : <Text style={styles.cancelBtnTxt}>{t("cancelPlan")}</Text>}
              </Pressable>
            ) : null}
          </Card>

          {/* Available plans */}
          <Text style={styles.sectionHeading}>{t("comparePlans")}</Text>
          <View style={{ gap: 12 }}>
            {data.plans.map((p: any) => (
              <Pressable key={p.id} onPress={() => router.push("/pricing")} testID={`plan-card-${p.id}`}>
                <PlanCard plan={p} current={p.id === data.plan.id} C={C} styles={styles} t={t} />
              </Pressable>
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

  // Cinematic current-plan hero
  hero: { borderRadius: R.lg, overflow: "hidden", padding: S.xl, marginBottom: S.lg, borderWidth: 1, borderColor: "rgba(197,160,89,0.3)" },
  heroGlow: { position: "absolute", top: -60, right: -30, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(197,160,89,0.16)" },
  heroLabel: { color: "rgba(245,241,232,0.55)", fontFamily: F.text, fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase" },
  heroTopRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: S.md },
  heroPlanName: { color: "#F5F1E8", fontFamily: F.display, fontSize: 30, letterSpacing: -0.4 },
  heroTag: { color: "rgba(245,241,232,0.6)", fontFamily: F.text, fontSize: 12.5, marginTop: 3, maxWidth: 220 },
  heroPrice: { color: C.brand, fontFamily: F.display, fontSize: 34, letterSpacing: -0.5 },
  heroInterval: { color: "rgba(245,241,232,0.55)", fontFamily: F.text, fontSize: 12 },
  heroDivider: { height: 1, backgroundColor: "rgba(245,241,232,0.12)", marginVertical: S.md },
  heroRenewLabel: { color: "rgba(245,241,232,0.6)", fontFamily: F.text, fontSize: 13 },
  heroRenewVal: { color: "#F5F1E8", fontFamily: F.text, fontSize: 14, fontWeight: "600" },

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
  limitBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.warning, borderRadius: R.md, padding: S.md, marginBottom: S.lg },
  limitBannerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "700" },
  limitBannerBody: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, marginTop: 1 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  limitLabel: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5 },
  limitValue: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "600" },

  upgradeNote: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, flex: 1 },
  checkoutBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.brandTint, borderRadius: R.md, padding: S.md, marginBottom: S.lg },
  checkoutBannerTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "600", flex: 1 },
  cancelBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 12, marginTop: S.sm, borderRadius: R.md, borderWidth: 1, borderColor: C.border, minHeight: 44 },
  cancelBtnTxt: { color: C.error, fontFamily: F.text, fontSize: 13.5, fontWeight: "600" },

  planCard: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  planHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planName: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginTop: S.sm },
  price: { color: C.onSurface, fontFamily: F.display, fontSize: 26 },
  featRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  featTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, flex: 1 },

  footNote: { color: C.onSurface3, fontFamily: F.text, fontSize: 12, textAlign: "center", marginTop: S.lg, fontStyle: "italic" },
  storageNote: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, marginTop: S.md, lineHeight: 17 },
});
