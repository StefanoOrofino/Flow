import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Modal, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { api } from "@/src/api";
import { briefSession } from "@/src/brief/briefSession";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { H1, H2, Body } from "@/src/components";

const FILTERS = ["all", "review", "medium", "high", "missing", "edited"] as const;
type Filter = typeof FILTERS[number];

function statusMeta(f: any, C: Palette) {
  if (f.isUserEdited) return { key: "userConfirmed", color: C.success, bg: C.successTint };
  if (f.conflict?.hasConflict) return { key: "conflict", color: C.warning, bg: C.surface3 };
  if (!f.value) return { key: "missing", color: C.onSurface3, bg: C.surface3 };
  if (f.confidence === "high") return { key: "high", color: C.success, bg: C.successTint };
  if (f.confidence === "medium") return { key: "medium", color: C.warning, bg: C.surface3 };
  return { key: "low", color: C.error, bg: C.errorTint };
}

function FieldRow({ f, onChange, C, styles, t }: any) {
  const meta = statusMeta(f, C);
  const src = f.sourceImage ? `${t("sourceImage")}: ${f.sourceImage}` : f.sourceDocument || "";
  return (
    <View style={styles.fieldRow} testID={`field-${f.key}`}>
      <View style={styles.fieldTop}>
        <Text style={styles.fieldLabel}>{f.label}</Text>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.badgeTxt, { color: meta.color }]}>
            {t(meta.key)}{f.value && !f.conflict?.hasConflict && !f.isUserEdited ? ` · ${f.confidenceScore}` : ""}
          </Text>
        </View>
      </View>

      <TextInput
        value={f.value}
        onChangeText={(v) => onChange(f.key, v)}
        placeholder={t("fillManually")}
        placeholderTextColor={C.onSurface3}
        multiline
        style={styles.input}
        testID={`input-${f.key}`}
      />

      {f.conflict?.hasConflict && (
        <View style={styles.conflictBox}>
          <Text style={styles.conflictLbl}>{t("chooseValue")}</Text>
          <View style={styles.chipWrap}>
            {f.conflict.values.map((v: any, i: number) => (
              <Pressable key={i} onPress={() => onChange(f.key, v.value)} style={styles.choiceChip}>
                <Text style={styles.choiceChipTxt} numberOfLines={2}>{v.document ? `${v.document}: ` : ""}{v.value}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!!f.suggestedCorrection && f.suggestedCorrection !== f.value && (
        <Pressable style={styles.suggest} onPress={() => onChange(f.key, f.suggestedCorrection)}>
          <Ionicons name="bulb-outline" size={13} color={C.brand} />
          <Text style={styles.suggestTxt}>{t("suggested")}: {f.suggestedCorrection}</Text>
        </Pressable>
      )}

      {f.confidence === "low" && !!f.value && !!f.lowConfidenceReason && (
        <Text style={styles.reason}>{t("whyLow")}: {f.lowConfidenceReason}</Text>
      )}

      {!!src && <Text style={styles.source}>{t("source")}: {src}</Text>}
    </View>
  );
}

export default function ReviewAnalysis() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useTranslation("reviewAnalysis");
  const styles = useMemo(() => createStyles(C), [C]);

  const session = briefSession.get();
  const [fields, setFields] = useState<any>(() => ({ ...(session?.analysis?.fields || {}) }));
  const [visual, setVisual] = useState<any>(() => ({ ...(session?.analysis?.visual || {}) }));
  const [filter, setFilter] = useState<Filter>("all");
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: C.surface }]}>
        <Body muted style={{ marginBottom: S.md }}>{t("expired")}</Body>
        <Pressable style={styles.smallBtn} onPress={() => router.replace("/new")}><Text style={styles.smallBtnTxt}>{t("editAnalysis")}</Text></Pressable>
      </View>
    );
  }

  const summary = session.analysis?.summary || {};
  const thumbs = session.imageThumbs || [];

  const editField = (setter: any) => (key: string, value: string) =>
    setter((p: any) => ({ ...p, [key]: { ...p[key], value, isUserEdited: true, confirmed: true, status: value ? "found" : "missing" } }));

  const matches = (f: any) => {
    switch (filter) {
      case "review": return !!f.value && f.confidence === "low";
      case "medium": return !!f.value && f.confidence === "medium";
      case "high": return !!f.value && f.confidence === "high";
      case "missing": return !f.value;
      case "edited": return !!f.isUserEdited;
      default: return true;
    }
  };

  const projList = Object.values(fields).filter(matches);
  const visList = Object.values(visual).filter(matches);

  const doGenerate = async () => {
    setConfirming(false); setGenerating(true); setErr("");
    try {
      const proj = await api.createProjectFromBrief({
        fields: Object.fromEntries(Object.entries(fields).map(([k, v]: any) => [k, { value: v.value }])),
        visual: Object.fromEntries(Object.entries(visual).map(([k, v]: any) => [k, { value: v.value }])),
        generate: true,
      });
      briefSession.clear();
      router.replace(`/project/${proj.id}`);
    } catch (e: any) {
      setErr(e.message || t("genFailed"));
      setGenerating(false);
    }
  };

  const conf = summary.confidence || { high: 0, medium: 0, low: 0 };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="review-back"><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <Text style={styles.headerTitle}>{t("title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 120, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        <H1 style={{ marginBottom: 4 }}>{t("title")}</H1>
        <Body muted style={{ marginBottom: S.lg }}>{t("subtitle")}</Body>

        {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}

        {/* Summary banner */}
        <View style={styles.banner}>
          <View style={styles.bannerRow}>
            <Text style={styles.bannerExtract}>{t("extracted", { count: summary.fieldsFound || 0 })}</Text>
            <View style={styles.overallPill}><Text style={styles.overallTxt}>{summary.overallConfidence || 0}%</Text></View>
          </View>
          <View style={styles.statChips}>
            <View style={styles.statChip}><View style={[styles.dot, { backgroundColor: C.success }]} /><Text style={styles.statTxt}>{conf.high} {t("high")}</Text></View>
            <View style={styles.statChip}><View style={[styles.dot, { backgroundColor: C.warning }]} /><Text style={styles.statTxt}>{conf.medium} {t("medium")}</Text></View>
            <View style={styles.statChip}><View style={[styles.dot, { backgroundColor: C.error }]} /><Text style={styles.statTxt}>{conf.low} {t("low")}</Text></View>
            <View style={styles.statChip}><View style={[styles.dot, { backgroundColor: C.onSurface3 }]} /><Text style={styles.statTxt}>{summary.fieldsMissing} {t("missing")}</Text></View>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((fl) => (
            <Pressable key={fl} onPress={() => setFilter(fl)} style={[styles.filterChip, filter === fl && styles.filterChipOn]} testID={`filter-${fl}`}>
              <Text style={[styles.filterTxt, filter === fl && styles.filterTxtOn]}>
                {fl === "all" ? t("filterAll") : fl === "review" ? t("filterReview") : fl === "medium" ? t("medium") : fl === "high" ? t("high") : fl === "missing" ? t("filterMissing") : t("filterEdited")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Project Information */}
        <View style={styles.sectionHead}><Ionicons name="briefcase-outline" size={16} color={C.brand} /><Text style={styles.sectionTitle}>{t("projectInfo")}</Text></View>
        {projList.map((f: any) => <FieldRow key={f.key} f={f} onChange={editField(setFields)} C={C} styles={styles} t={t} />)}
        {projList.length === 0 && <Text style={styles.emptyFilter}>—</Text>}

        {/* Visual Analysis */}
        <View style={[styles.sectionHead, { marginTop: S.xl }]}><Ionicons name="color-palette-outline" size={16} color={C.brand} /><Text style={styles.sectionTitle}>{t("visualAnalysis")}</Text></View>
        {thumbs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: S.sm }}>
            {thumbs.map((im: any, i: number) => <Image key={i} source={{ uri: im.uri }} style={styles.vThumb} contentFit="cover" />)}
          </ScrollView>
        ) : <Text style={styles.noImages}>{t("noImages")}</Text>}
        {visList.map((f: any) => <FieldRow key={f.key} f={f} onChange={editField(setVisual)} C={C} styles={styles} t={t} />)}
        {visList.length === 0 && <Text style={styles.emptyFilter}>—</Text>}
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={{ padding: S.lg, paddingBottom: insets.bottom + S.md, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
          <Pressable onPress={() => setConfirming(true)} testID="confirm-generate" style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="sparkles" size={17} color={C.onBrand} />
            <Text style={styles.ctaText}>{t("confirm")}</Text>
          </Pressable>
        </View>
      </View>

      {/* Confirm modal */}
      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <Pressable style={styles.modalBg} onPress={() => setConfirming(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
            <H2>{t("confirmTitle")}</H2>
            <Body muted style={{ marginTop: S.sm, marginBottom: S.lg }}>{t("confirmBody")}</Body>
            <Pressable onPress={doGenerate} style={styles.cta} testID="confirm-yes"><Text style={styles.ctaText}>{t("confirmCta")}</Text></Pressable>
            <Pressable onPress={() => setConfirming(false)} style={styles.ghostBtn}><Text style={styles.ghostTxt}>{t("cancel")}</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Generating overlay */}
      <Modal visible={generating} transparent animationType="fade">
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={C.brand} />
          <H2 style={{ marginTop: S.lg, textAlign: "center" }}>{t("generating")}</H2>
          <Body muted style={{ marginTop: 6, textAlign: "center", maxWidth: 320 }}>{t("generatingSub")}</Body>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xl },
  errBox: { backgroundColor: C.errorTint, borderWidth: 1, borderColor: C.error, borderRadius: 10, padding: S.md, marginBottom: S.lg },
  errText: { color: C.onErrorTint, fontFamily: F.text, fontSize: 13 },

  banner: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.md },
  bannerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerExtract: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "600" },
  overallPill: { backgroundColor: C.brandTint, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5 },
  overallTxt: { color: C.brand, fontFamily: F.display, fontSize: 18, fontWeight: "700" },
  statChips: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: S.md },
  statChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5 },

  filterRow: { gap: 8, paddingVertical: S.sm, paddingRight: S.lg },
  filterChip: { backgroundColor: C.surface2, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  filterChipOn: { backgroundColor: C.brand, borderColor: C.brand },
  filterTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, fontWeight: "500" },
  filterTxtOn: { color: C.onBrand },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: S.md, marginTop: S.md },
  sectionTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 16, fontWeight: "700" },

  fieldRow: { backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, marginBottom: S.sm },
  fieldTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  fieldLabel: { color: C.onSurface, fontFamily: F.text, fontSize: 13, fontWeight: "600", flex: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: R.pill },
  badgeTxt: { fontFamily: F.text, fontSize: 10.5, fontWeight: "700" },
  input: { color: C.onSurface, fontFamily: F.text, fontSize: 14, backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 8, minHeight: 40 },

  conflictBox: { marginTop: 8, backgroundColor: C.surface3, borderRadius: R.sm, padding: 8 },
  conflictLbl: { color: C.warning, fontFamily: F.text, fontSize: 11.5, fontWeight: "600", marginBottom: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choiceChip: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6, maxWidth: "100%" },
  choiceChipTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 12 },

  suggest: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  suggestTxt: { color: C.brand, fontFamily: F.text, fontSize: 12, flex: 1 },
  reason: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginTop: 6, fontStyle: "italic" },
  source: { color: C.onSurface3, fontFamily: F.text, fontSize: 11, marginTop: 6 },

  vThumb: { width: 110, height: 110, borderRadius: R.md, backgroundColor: C.surface3, borderWidth: 1, borderColor: C.border },
  noImages: { color: C.onSurface3, fontFamily: F.text, fontSize: 12.5, marginBottom: S.sm, fontStyle: "italic" },
  emptyFilter: { color: C.onSurface3, fontFamily: F.text, fontSize: 13, textAlign: "center", paddingVertical: S.md },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface2, borderTopWidth: 1, borderTopColor: C.border },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 15, minHeight: 52 },
  ctaText: { color: C.onBrand, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  ghostBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 13, marginTop: S.sm },
  ghostTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 14 },
  smallBtn: { backgroundColor: C.brand, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 11 },
  smallBtnTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 14, fontWeight: "600" },

  modalBg: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", padding: S.xl },
  sheet: { backgroundColor: C.surface2, borderRadius: R.lg, padding: S.xl, borderWidth: 1, borderColor: C.borderStrong, maxWidth: 440, width: "100%", alignSelf: "center" },
  overlay: { flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", padding: S.xxl },
});
