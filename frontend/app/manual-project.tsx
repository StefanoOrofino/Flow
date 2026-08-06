import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Modal, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { api } from "@/src/api";
import { briefSession } from "@/src/brief/briefSession";
import { handlePlanLimit } from "@/src/utils/planLimit";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { H1, H2, Body, Field } from "@/src/components";

const SECTIONS: { titleKey: string; icon: any; fields: { key: string; category: string; multiline?: boolean; required?: boolean; visual?: boolean }[] }[] = [
  { titleKey: "basic", icon: "information-circle-outline", fields: [
    { key: "project_name", category: "Project", required: true }, { key: "client", category: "Client & Brand" },
    { key: "brand", category: "Client & Brand" }, { key: "campaign", category: "Client & Brand" },
    { key: "project_type", category: "Project" }, { key: "description", category: "Project", multiline: true } ] },
  { titleKey: "creative", icon: "color-wand-outline", fields: [
    { key: "objective", category: "Strategy", multiline: true }, { key: "target_audience", category: "Strategy" },
    { key: "tone_of_voice", category: "Strategy" }, { key: "key_message", category: "Strategy", multiline: true },
    { key: "creative_direction", category: "Creative", multiline: true },
    { key: "visual_style", category: "Visual", visual: true }, { key: "mood", category: "Visual", visual: true },
    { key: "color_palette", category: "Visual", visual: true } ] },
  { titleKey: "production", icon: "construct-outline", fields: [
    { key: "deliverables", category: "Production", multiline: true }, { key: "platforms", category: "Production" },
    { key: "aspect_ratio", category: "Production" }, { key: "duration", category: "Production" },
    { key: "shoot_date", category: "Production" }, { key: "deadline", category: "Production" },
    { key: "budget", category: "Production" }, { key: "technical_requirements", category: "Production", multiline: true },
    { key: "constraints", category: "Requirements", multiline: true } ] },
  { titleKey: "notes", icon: "document-text-outline", fields: [
    { key: "assets_available", category: "Notes", multiline: true }, { key: "assets_required", category: "Notes", multiline: true },
    { key: "internal_notes", category: "Notes", multiline: true } ] },
];

const VISUAL_LABEL: any = { visual_style: "Visual Style", mood: "Mood", color_palette: "Color Palette" };
const VISUAL_KEY: any = { visual_style: "style", mood: "mood", color_palette: "colors" };

async function assetToBase64(asset: any): Promise<string> {
  if (asset.base64) return asset.base64;
  if (Platform.OS === "web") {
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("read failed"));
      fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
      fr.readAsDataURL(blob);
    });
  }
  return await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" as any });
}

type Img = { id: string; name: string; uri: string; base64?: string; status: "reading" | "ready" | "error" };

const mkField = (key: string, label: string, category: string, value: string, userEntered: boolean) => ({
  key, label, category, value: value || "", confidence: "", confidenceScore: 0,
  aiConfidence: "", aiConfidenceScore: 0, sourceDocument: "", sourceImage: "", sourceLocation: "",
  extractionNotes: "", lowConfidenceReason: "", suggestedCorrection: "", conflict: null,
  status: value ? "found" : "missing", isUserEdited: false, userEntered,
});

export default function ManualProject() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useTranslation("manualProject");
  const styles = useMemo(() => createStyles(C), [C]);

  const [f, setF] = useState<any>({});
  const [imgs, setImgs] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }));
  const uid = () => Math.random().toString(36).slice(2, 9);

  const pickImages = async () => {
    setErr("");
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, base64: true, quality: 0.7 });
    if (res.canceled) return;
    const added: Img[] = res.assets.map((a) => ({ id: uid(), name: a.fileName || `image-${uid()}.jpg`, uri: a.uri, status: "reading" }));
    setImgs((p) => [...p, ...added]);
    for (let i = 0; i < added.length; i++) {
      const it = added[i];
      try {
        const b64 = await assetToBase64(res.assets[i]);
        setImgs((p) => p.map((x) => (x.id === it.id ? { ...x, base64: b64, status: "ready" } : x)));
      } catch {
        setImgs((p) => p.map((x) => (x.id === it.id ? { ...x, status: "error" } : x)));
      }
    }
  };
  const removeImg = (id: string) => setImgs((p) => p.filter((x) => x.id !== id));
  const moveImgUp = (i: number) => setImgs((p) => { if (i <= 0) return p; const n = [...p]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });

  const submit = async () => {
    if (!(f.project_name || "").trim()) { setErr(t("nameRequired")); return; }
    setErr(""); setBusy(true);
    try {
      // Build textual fields (user entered).
      const fields: any = {};
      for (const sec of SECTIONS) {
        for (const fd of sec.fields) {
          if (fd.visual) continue;
          fields[fd.key] = mkField(fd.key, t(fd.key), fd.category, (f[fd.key] || "").trim(), true);
        }
      }

      // Analyze optional images -> AI visual analysis (with confidence).
      const readyImgs = imgs.filter((x) => x.status === "ready");
      let visual: any = {};
      if (readyImgs.length > 0) {
        const resp = await api.analyzeBrief({ documents: [], images: readyImgs.map((d) => ({ name: d.name, data: d.base64 })) });
        visual = { ...(resp.analysis?.visual || {}) };
      }
      // User-entered visual fields override / seed style, mood, colors.
      for (const key of ["visual_style", "mood", "color_palette"]) {
        const v = (f[key] || "").trim();
        if (v) visual[VISUAL_KEY[key]] = mkField(VISUAL_KEY[key], VISUAL_LABEL[key], "Visual", v, true);
      }

      const all = [...Object.values(fields), ...Object.values(visual)] as any[];
      const found = all.filter((x) => x.value).length;
      const scored = all.filter((x) => x.value && !x.userEntered);
      const conf = { high: 0, medium: 0, low: 0 } as any;
      let sum = 0;
      scored.forEach((x) => { conf[x.confidence] = (conf[x.confidence] || 0) + 1; sum += x.confidenceScore || 0; });
      const summary = {
        totalFields: all.length, fieldsFound: found, fieldsMissing: all.length - found,
        conflicts: 0, visualFound: Object.values(visual).filter((x: any) => x.value).length,
        confidence: conf, overallConfidence: scored.length ? Math.round(sum / scored.length) : 100,
      };

      briefSession.set({
        analysis: { fields, visual, summary }, documents: [], documentErrors: [],
        images: [], imageErrors: [], imageThumbs: readyImgs.map((d) => ({ name: d.name, uri: d.uri })), mockMode: false,
      });
      setBusy(false);
      router.push("/brief-review");
    } catch (e: any) {
      setBusy(false);
      if (handlePlanLimit(e, () => router.push("/pricing"))) return;
      setErr(e.message || "Something went wrong.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="manual-back"><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <Text style={styles.headerTitle}>{t("title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 120, maxWidth: MAX_W, alignSelf: "center", width: "100%" }} keyboardShouldPersistTaps="handled">
        <H1 style={{ marginBottom: 4 }}>{t("title")}</H1>
        <Body muted style={{ marginBottom: S.lg }}>{t("subtitle")}</Body>
        {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}

        {SECTIONS.map((sec) => (
          <View key={sec.titleKey} style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}><Ionicons name={sec.icon} size={15} color={C.brand} /></View>
              <Text style={styles.sectionTitle}>{t(sec.titleKey)}</Text>
            </View>
            {sec.fields.map((fd) => (
              <Field key={fd.key} label={`${t(fd.key)}${fd.required ? " *" : ""}`} value={f[fd.key] || ""}
                onChangeText={(v: string) => set(fd.key, v)} multiline={fd.multiline} testID={`m-${fd.key}`} />
            ))}
          </View>
        ))}

        {/* Optional visual references */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}><Ionicons name="images-outline" size={15} color={C.brand} /></View>
            <Text style={styles.sectionTitle}>{t("visualRefs")}</Text>
          </View>
          <Body muted style={{ marginBottom: S.md, fontSize: 13 }}>{t("visualRefsDesc")}</Body>
          <Pressable onPress={pickImages} style={styles.dropzone} testID="m-pick-images">
            <View style={styles.dropIcon}><Ionicons name="image-outline" size={24} color={C.brand} /></View>
            <View style={styles.browseBtn}><Text style={styles.browseTxt}>{t("addImages")}</Text></View>
          </Pressable>
          {imgs.length > 0 && (
            <View style={styles.thumbGrid}>
              {imgs.map((im, i) => (
                <Animated.View key={im.id} entering={FadeIn.duration(200)} style={styles.thumb} testID={`m-img-${i}`}>
                  <Image source={{ uri: im.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  {im.status === "reading" && <View style={styles.thumbOverlay}><ActivityIndicator size="small" color="#fff" /></View>}
                  <Pressable onPress={() => removeImg(im.id)} hitSlop={6} style={styles.thumbRemove}><Ionicons name="close" size={13} color="#fff" /></Pressable>
                  {i > 0 && <Pressable onPress={() => moveImgUp(i)} hitSlop={6} style={styles.thumbMove}><Ionicons name="arrow-back" size={12} color="#fff" /></Pressable>}
                  <View style={styles.thumbIndex}><Text style={styles.thumbIndexTxt}>{i + 1}</Text></View>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ padding: S.lg, paddingBottom: insets.bottom + S.md, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
          <Pressable onPress={submit} testID="manual-continue" style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="arrow-forward" size={17} color={C.onBrand} />
            <Text style={styles.ctaText}>{t("continue")}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={busy} transparent animationType="fade">
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={C.brand} />
          <H2 style={{ marginTop: S.lg, textAlign: "center" }}>{t("analyzingRefs")}</H2>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  errBox: { backgroundColor: C.errorTint, borderWidth: 1, borderColor: C.error, borderRadius: 10, padding: S.md, marginBottom: S.lg },
  errText: { color: C.onErrorTint, fontFamily: F.text, fontSize: 13 },
  section: { marginBottom: S.lg },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: S.md },
  sectionIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "700" },
  dropzone: { borderWidth: 1.5, borderColor: C.borderStrong, borderStyle: "dashed", borderRadius: R.lg, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center", paddingVertical: S.xl, gap: 10 },
  dropIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  browseBtn: { backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 8 },
  browseTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 13, fontWeight: "600" },
  thumbGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: S.md },
  thumb: { width: 90, height: 90, borderRadius: R.md, overflow: "hidden", backgroundColor: C.surface3, borderWidth: 1, borderColor: C.border },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  thumbRemove: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  thumbMove: { position: "absolute", bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  thumbIndex: { position: "absolute", top: 4, left: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  thumbIndexTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 10, fontWeight: "700" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface2, borderTopWidth: 1, borderTopColor: C.border },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 15, minHeight: 52 },
  ctaText: { color: C.onBrand, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  overlay: { flex: 1, backgroundColor: C.overlay, alignItems: "center", justifyContent: "center", padding: S.xxl },
});
