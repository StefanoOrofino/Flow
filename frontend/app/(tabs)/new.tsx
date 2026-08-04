import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Modal, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { api } from "@/src/api";
import { briefSession } from "@/src/brief/briefSession";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { H1, H2, Body } from "@/src/components";

const DOC_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "application/rtf", "text/rtf",
];

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

type Item = { id: string; name: string; uri: string; size?: number; base64?: string; status: "reading" | "ready" | "error" };

export default function CreateProject() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useTranslation("createProject");
  const styles = useMemo(() => createStyles(C), [C]);

  const [docs, setDocs] = useState<Item[]>([]);
  const [imgs, setImgs] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const uid = () => Math.random().toString(36).slice(2, 9);

  const pickDocs = async () => {
    setErr("");
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, type: DOC_MIME, copyToCacheDirectory: true });
    if (res.canceled) return;
    const added: Item[] = res.assets.map((a) => ({ id: uid(), name: a.name, uri: a.uri, size: a.size ?? undefined, status: "reading", ...( { file: (a as any).file }) } as any));
    setDocs((p) => [...p, ...added]);
    for (const it of added) {
      const asset = res.assets.find((a) => a.name === it.name && a.uri === it.uri);
      try {
        const b64 = await assetToBase64({ ...asset, uri: it.uri });
        setDocs((p) => p.map((x) => (x.id === it.id ? { ...x, base64: b64, status: "ready" } : x)));
      } catch {
        setDocs((p) => p.map((x) => (x.id === it.id ? { ...x, status: "error" } : x)));
      }
    }
  };

  const pickImages = async () => {
    setErr("");
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setErr(t("analyzeFailed")); return; }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: true, base64: true, quality: 0.7,
    });
    if (res.canceled) return;
    const added: Item[] = res.assets.map((a) => ({
      id: uid(), name: a.fileName || `image-${uid()}.jpg`, uri: a.uri, size: a.fileSize, status: "reading",
    }));
    setImgs((p) => [...p, ...added]);
    for (let i = 0; i < added.length; i++) {
      const it = added[i];
      const asset = res.assets[i];
      try {
        const b64 = await assetToBase64(asset);
        setImgs((p) => p.map((x) => (x.id === it.id ? { ...x, base64: b64, status: "ready" } : x)));
      } catch {
        setImgs((p) => p.map((x) => (x.id === it.id ? { ...x, status: "error" } : x)));
      }
    }
  };

  const removeDoc = (id: string) => setDocs((p) => p.filter((x) => x.id !== id));
  const removeImg = (id: string) => setImgs((p) => p.filter((x) => x.id !== id));
  const moveImgUp = (i: number) => setImgs((p) => { if (i <= 0) return p; const n = [...p]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });

  const readyDocs = docs.filter((d) => d.status === "ready");
  const readyImgs = imgs.filter((d) => d.status === "ready");
  const anyReading = [...docs, ...imgs].some((d) => d.status === "reading");
  const canAnalyze = (readyDocs.length + readyImgs.length) > 0 && !anyReading;

  const analyze = async () => {
    if (!canAnalyze) { setErr(t("noInput")); return; }
    setErr(""); setBusy(true);
    try {
      const resp = await api.analyzeBrief({
        documents: readyDocs.map((d) => ({ name: d.name, data: d.base64 })),
        images: readyImgs.map((d) => ({ name: d.name, data: d.base64 })),
      });
      briefSession.set({
        analysis: resp.analysis,
        documents: resp.documents || [],
        documentErrors: resp.documentErrors || [],
        images: resp.images || [],
        imageErrors: resp.imageErrors || [],
        imageThumbs: readyImgs.map((d) => ({ name: d.name, uri: d.uri })),
        mockMode: !!resp.mock_mode,
      });
      setBusy(false);
      router.push("/brief-review");
    } catch (e: any) {
      setErr(e.message || t("analyzeFailed"));
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="create-back"><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <Text style={styles.headerTitle}>{t("title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 120, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        <H1 style={{ marginBottom: 4 }}>{t("title")}</H1>
        <Body muted style={{ marginBottom: S.xl }}>{t("subtitle")}</Body>

        {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}

        {/* Section 1 — Client Brief */}
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}><Ionicons name="document-text-outline" size={16} color={C.brand} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t("briefSection")}</Text>
            <Text style={styles.sectionHint}>{t("briefHint")}</Text>
          </View>
        </View>

        <Pressable onPress={pickDocs} style={styles.dropzone} testID="pick-docs">
          <View style={styles.dropIcon}><Ionicons name="cloud-upload-outline" size={26} color={C.brand} /></View>
          <Text style={styles.dropText}>{t("dropBrief")}</Text>
          <View style={styles.browseBtn}><Text style={styles.browseTxt}>{t("browse")}</Text></View>
        </Pressable>

        {docs.map((d) => (
          <Animated.View key={d.id} entering={FadeInDown.duration(200)} style={styles.fileRow} testID={`doc-${d.name}`}>
            <Ionicons name={d.status === "error" ? "alert-circle" : "document-outline"} size={18} color={d.status === "error" ? C.error : C.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={1}>{d.name}</Text>
              <Text style={[styles.fileMeta, d.status === "error" && { color: C.error }]}>
                {d.status === "reading" ? t("reading") : d.status === "error" ? t("error") : d.size ? `${Math.round((d.size / 1024))} KB` : "✓"}
              </Text>
            </View>
            {d.status === "reading" ? <ActivityIndicator size="small" color={C.brand} />
              : <Pressable onPress={() => removeDoc(d.id)} hitSlop={8} testID={`rm-doc-${d.name}`}><Ionicons name="close-circle" size={20} color={C.onSurface2} /></Pressable>}
          </Animated.View>
        ))}

        {/* Section 2 — Visual References */}
        <View style={[styles.sectionHead, { marginTop: S.xxl }]}>
          <View style={styles.sectionIcon}><Ionicons name="images-outline" size={16} color={C.brand} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t("refsSection")}</Text>
            <Text style={styles.sectionHint}>{t("refsHint")}</Text>
          </View>
        </View>
        <Body muted style={{ marginBottom: S.md, fontSize: 13 }}>{t("refsDesc")}</Body>

        <Pressable onPress={pickImages} style={styles.dropzone} testID="pick-images">
          <View style={styles.dropIcon}><Ionicons name="image-outline" size={26} color={C.brand} /></View>
          <Text style={styles.dropText}>{t("dropRefs")}</Text>
          <View style={styles.browseBtn}><Text style={styles.browseTxt}>{t("addImages")}</Text></View>
        </Pressable>

        {imgs.length > 0 && (
          <View style={styles.thumbGrid}>
            {imgs.map((im, i) => (
              <Animated.View key={im.id} entering={FadeIn.duration(200)} style={styles.thumb} testID={`img-${i}`}>
                <Image source={{ uri: im.uri }} style={styles.thumbImg} contentFit="cover" />
                {im.status === "reading" && <View style={styles.thumbOverlay}><ActivityIndicator size="small" color="#fff" /></View>}
                {im.status === "error" && <View style={styles.thumbOverlay}><Ionicons name="alert-circle" size={20} color={C.error} /></View>}
                <Pressable onPress={() => removeImg(im.id)} hitSlop={6} style={styles.thumbRemove} testID={`rm-img-${i}`}>
                  <Ionicons name="close" size={13} color="#fff" />
                </Pressable>
                {i > 0 && (
                  <Pressable onPress={() => moveImgUp(i)} hitSlop={6} style={styles.thumbMove} testID={`mv-img-${i}`}>
                    <Ionicons name="arrow-back" size={12} color="#fff" />
                  </Pressable>
                )}
                <View style={styles.thumbIndex}><Text style={styles.thumbIndexTxt}>{i + 1}</Text></View>
              </Animated.View>
            ))}
          </View>
        )}

        <Pressable onPress={() => router.push("/manual-project")} style={styles.manualLink} testID="manual-link">
          <Ionicons name="create-outline" size={15} color={C.onSurface2} />
          <Text style={styles.manualTxt}>{t("manualLink")}</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky footer CTA */}
      <View style={styles.footer}>
        <View style={{ padding: S.lg, paddingBottom: insets.bottom + S.md, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
          <Pressable onPress={analyze} disabled={!canAnalyze} testID="analyze-btn"
            style={({ pressed }) => [styles.cta, { opacity: !canAnalyze ? 0.45 : pressed ? 0.9 : 1 }]}>
            <Ionicons name="sparkles" size={17} color={C.onBrand} />
            <Text style={styles.ctaText}>{t("analyze")}</Text>
            {(readyDocs.length + readyImgs.length) > 0 && (
              <View style={styles.ctaCount}><Text style={styles.ctaCountTxt}>{readyDocs.length + readyImgs.length}</Text></View>
            )}
          </Pressable>
        </View>
      </View>

      <Modal visible={busy} transparent animationType="fade">
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={C.brand} />
          <H2 style={{ marginTop: S.lg, textAlign: "center" }}>{t("analyzing")}</H2>
          <Body muted style={{ marginTop: 6, textAlign: "center", maxWidth: 320 }}>{t("analyzingSub")}</Body>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  errBox: { backgroundColor: C.errorTint, borderWidth: 1, borderColor: C.error, borderRadius: 10, padding: S.md, marginBottom: S.lg },
  errText: { color: C.onErrorTint, fontFamily: F.text, fontSize: 13 },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: S.md },
  sectionIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 16, fontWeight: "700" },
  sectionHint: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, marginTop: 1 },

  dropzone: { borderWidth: 1.5, borderColor: C.borderStrong, borderStyle: "dashed", borderRadius: R.lg, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center", paddingVertical: S.xxl, paddingHorizontal: S.lg, gap: 10 },
  dropIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  dropText: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5, textAlign: "center" },
  browseBtn: { backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 8, marginTop: 2 },
  browseTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 13, fontWeight: "600" },

  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, marginTop: S.sm },
  fileName: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5 },
  fileMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginTop: 1 },

  thumbGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: S.md },
  thumb: { width: 96, height: 96, borderRadius: R.md, overflow: "hidden", backgroundColor: C.surface3, borderWidth: 1, borderColor: C.border },
  thumbImg: { width: "100%", height: "100%" },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  thumbRemove: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  thumbMove: { position: "absolute", bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  thumbIndex: { position: "absolute", top: 4, left: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  thumbIndexTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 10, fontWeight: "700" },

  manualLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: S.xxl, paddingVertical: S.sm },
  manualTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, textDecorationLine: "underline" },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface2, borderTopWidth: 1, borderTopColor: C.border },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 15, minHeight: 52 },
  ctaText: { color: C.onBrand, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  ctaCount: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  ctaCountTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 12, fontWeight: "700" },

  overlay: { flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", padding: S.xxl },
});
