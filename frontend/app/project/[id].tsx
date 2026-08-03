import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { C, S, R, F, MAX_W } from "@/src/theme";
import { Field, Picker, Btn, H1, H2, Body, Segmented, MockBadge } from "@/src/components";
import * as O from "@/src/options";
import { exportPdf, exportCsv, printProject } from "@/src/exporter";

function totalDuration(scenes: any[]) {
  let sec = 0;
  scenes.forEach((s) => { const m = String(s.duration || "").match(/[\d.]+/); if (m) sec += parseFloat(m[0]); });
  return sec ? `${Math.round(sec)}s` : "—";
}

export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("Storyboard");
  const [editing, setEditing] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showOverview, setShowOverview] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [exportOpen, setExportOpen] = useState(false);
  const [busyScene, setBusyScene] = useState<string | null>(null);
  const timer = useRef<any>(null);

  const load = useCallback(async () => {
    try { setProject(await api.getProject(id)); } catch { router.back(); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const persistScenes = (scenes: any[]) => {
    setProject((p: any) => ({ ...p, scenes }));
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { await api.updateProject(id, { scenes }); setSaveState("saved"); setTimeout(() => setSaveState("idle"), 1500); }
      catch { setSaveState("idle"); }
    }, 700);
  };

  const saveScene = (updated: any) => {
    const scenes = project.scenes.map((s: any) => (s.id === updated.id ? updated : s));
    persistScenes(scenes);
    setEditing(null);
  };
  const addScene = () => {
    const newScene = {
      id: Math.random().toString(36).slice(2, 12), scene_number: project.scenes.length + 1,
      title: "New Scene", duration: "5s", location: "", time_of_day: "Day", visual_description: "",
      subject_action: "", dialogue: "", voice_over: "", on_screen_text: "", shot_size: "Medium shot",
      camera_angle: "Eye level", camera_movement: "Static", focal_length: "35mm", lighting: "", sound_notes: "",
      transition: "Cut", image_prompt: "",
    };
    persistScenes([...project.scenes, newScene]);
  };
  const dupScene = (s: any) => {
    const copy = { ...s, id: Math.random().toString(36).slice(2, 12) };
    const idx = project.scenes.findIndex((x: any) => x.id === s.id);
    const scenes = [...project.scenes];
    scenes.splice(idx + 1, 0, copy);
    persistScenes(scenes.map((x, i) => ({ ...x, scene_number: i + 1 })));
  };
  const delScene = (s: any) => persistScenes(project.scenes.filter((x: any) => x.id !== s.id).map((x: any, i: number) => ({ ...x, scene_number: i + 1 })));
  const move = (s: any, dir: number) => {
    const idx = project.scenes.findIndex((x: any) => x.id === s.id);
    const j = idx + dir;
    if (j < 0 || j >= project.scenes.length) return;
    const scenes = [...project.scenes];
    [scenes[idx], scenes[j]] = [scenes[j], scenes[idx]];
    persistScenes(scenes.map((x, i) => ({ ...x, scene_number: i + 1 })));
  };
  const regenScene = async (s: any) => {
    setBusyScene(s.id);
    try { setProject(await api.regenScene(id, s.id)); } catch {} finally { setBusyScene(null); }
  };
  const regenPrompt = async (s: any) => {
    setBusyScene(s.id + "-p");
    try { setProject(await api.regenImagePrompt(id, s.id)); } catch {} finally { setBusyScene(null); }
  };
  const doExport = async (fn: () => Promise<void>) => { setExportOpen(false); try { await fn(); } catch (e) { console.log(e); } };

  if (loading || !project) {
    return <View style={styles.center}><ActivityIndicator color={C.brand} size="large" /></View>;
  }

  const cols = width > 760 ? 2 : 1;
  const cardW = cols === 2 ? "48.5%" : "100%";

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} testID="editor-back"><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <View style={{ flex: 1, marginHorizontal: S.md }}>
          <Text style={styles.hTitle} numberOfLines={1}>{project.title}</Text>
          <Text style={styles.hSub}>
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : `${project.scenes.length} scenes · ${totalDuration(project.scenes)}`}
          </Text>
        </View>
        <Pressable onPress={() => setExportOpen(true)} testID="export-btn"><Ionicons name="share-outline" size={22} color={C.brand} /></Pressable>
      </View>

      <View style={styles.segWrap}>
        <Segmented options={["Storyboard", "Shot List"]} value={view} onChange={setView} testID="view-toggle" />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 120, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        {project.mock_mode ? <View style={{ marginBottom: S.md }}><MockBadge /></View> : null}

        <Pressable style={styles.overviewHead} onPress={() => setShowOverview((v) => !v)}>
          <H2>Creative Overview</H2>
          <Ionicons name={showOverview ? "chevron-up" : "chevron-down"} size={18} color={C.onSurface2} />
        </Pressable>
        {showOverview && (
          <View style={styles.overviewCard}>
            <Sec title="Creative Concept" text={project.concept} />
            <Sec title="Director's Treatment" text={project.treatment} />
            <Sec title="Visual Direction" text={project.visual_direction} />
            <Sec title="Script" text={project.script} />
          </View>
        )}

        {view === "Storyboard" ? (
          <View style={styles.grid}>
            {project.scenes.map((s: any, i: number) => (
              <View key={s.id} style={[styles.sceneCard, { width: cardW }]} testID={`scene-card-${i}`}>
                <View style={styles.frame}>
                  <LinearGradient colors={["#1c1c1c", "#0e0e0e"]} style={StyleSheet.absoluteFill} />
                  <Ionicons name="image-outline" size={26} color={C.onSurface2} />
                  <Text style={styles.frameNum}>SCENE {s.scene_number}</Text>
                  <Text style={styles.frameDur}>{s.duration}</Text>
                </View>
                <View style={{ padding: S.md }}>
                  <Text style={styles.sceneTitle} numberOfLines={1}>{s.title}</Text>
                  <Body muted style={{ marginTop: 4 }} numberOfLines={3}>{s.visual_description || "No description"}</Body>
                  <View style={styles.chips}>
                    <Chip>{s.shot_size}</Chip><Chip>{s.camera_movement}</Chip>
                  </View>
                  {(s.dialogue || s.voice_over) ? <Text style={styles.quote} numberOfLines={2}>“{s.dialogue || s.voice_over}”</Text> : null}
                  <View style={styles.promptBox}>
                    <Text style={styles.promptLabel}>IMAGE PROMPT</Text>
                    <Text style={styles.promptText} numberOfLines={3}>{s.image_prompt || "—"}</Text>
                    <Pressable style={styles.promptRegen} onPress={() => regenPrompt(s)} testID={`regen-prompt-${i}`}>
                      {busyScene === s.id + "-p" ? <ActivityIndicator size="small" color={C.brand} /> :
                        <><Ionicons name="refresh" size={13} color={C.brand} /><Text style={styles.miniLink}>Regenerate prompt</Text></>}
                    </Pressable>
                  </View>
                  <View style={styles.actions}>
                    <IconBtn icon="create-outline" onPress={() => setEditing({ ...s })} testID={`edit-${i}`} />
                    <IconBtn icon="sparkles-outline" loading={busyScene === s.id} onPress={() => regenScene(s)} testID={`regen-${i}`} />
                    <IconBtn icon="copy-outline" onPress={() => dupScene(s)} testID={`dup-${i}`} />
                    <IconBtn icon="arrow-up" onPress={() => move(s, -1)} />
                    <IconBtn icon="arrow-down" onPress={() => move(s, 1)} />
                    <IconBtn icon="trash-outline" color={C.error} onPress={() => delScene(s)} testID={`del-${i}`} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View>
            {project.scenes.map((s: any, i: number) => {
              const open = expanded[s.id];
              return (
                <View key={s.id} style={styles.shotRow} testID={`shot-row-${i}`}>
                  <Pressable style={styles.shotHead} onPress={() => setExpanded((e) => ({ ...e, [s.id]: !open }))}>
                    <View style={styles.shotNum}><Text style={styles.shotNumText}>{i + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shotTitle} numberOfLines={1}>{s.title}</Text>
                      <Body muted style={{ fontSize: 12 }} numberOfLines={open ? 0 : 1}>{s.visual_description}</Body>
                    </View>
                    <Text style={styles.shotMeta}>{s.shot_size}</Text>
                    <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.onSurface2} />
                  </Pressable>
                  {open && (
                    <View style={styles.shotDetail}>
                      {[["Scene", s.scene_number], ["Shot size", s.shot_size], ["Angle", s.camera_angle], ["Movement", s.camera_movement],
                        ["Lens", s.focal_length], ["Location", s.location], ["Time", s.time_of_day], ["Lighting", s.lighting],
                        ["Audio", s.sound_notes], ["Duration", s.duration], ["Transition", s.transition], ["Dialogue", s.dialogue],
                        ["Voice-over", s.voice_over], ["On-screen", s.on_screen_text]].map((r) => (
                        <View key={String(r[0])} style={styles.dRow}>
                          <Text style={styles.dLabel}>{r[0]}</Text>
                          <Text style={styles.dVal}>{String(r[1] || "—")}</Text>
                        </View>
                      ))}
                      <Pressable style={styles.editInline} onPress={() => setEditing({ ...s })} testID={`shot-edit-${i}`}>
                        <Ionicons name="create-outline" size={14} color={C.brand} /><Text style={styles.miniLink}>Edit scene</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Btn title="Add Scene" variant="ghost" icon="add" onPress={addScene} testID="add-scene" style={{ marginTop: S.lg }} />
      </ScrollView>

      {/* Export sheet */}
      <Modal visible={exportOpen} transparent animationType="fade" onRequestClose={() => setExportOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setExportOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Export</Text>
            <ExportRow icon="document-text-outline" label="Export as PDF" onPress={() => doExport(() => exportPdf(project))} testID="export-pdf" />
            <ExportRow icon="grid-outline" label="Export shot list (CSV)" onPress={() => doExport(() => exportCsv(project))} testID="export-csv" />
            <ExportRow icon="print-outline" label="Print project" onPress={() => doExport(() => printProject(project))} testID="export-print" />
          </View>
        </Pressable>
      </Modal>

      {/* Scene editor */}
      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        {editing && (
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
              <Pressable onPress={() => setEditing(null)} testID="scene-cancel"><Ionicons name="close" size={24} color={C.onSurface} /></Pressable>
              <Text style={styles.hTitle}>Edit Scene {editing.scene_number}</Text>
              <Pressable onPress={() => saveScene(editing)} testID="scene-save"><Text style={{ color: C.brand, fontFamily: F.text, fontSize: 15, fontWeight: "600" }}>Save</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxxl, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
              {[["title", "Scene title"], ["duration", "Duration"], ["location", "Location"], ["time_of_day", "Time of day"]].map(([k, l]) => (
                <Field key={k} label={l} value={editing[k]} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, [k]: v }))} testID={`f-${k}`} />
              ))}
              <Field label="Visual description" value={editing.visual_description} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, visual_description: v }))} multiline testID="f-visual" />
              <Field label="Subject / action" value={editing.subject_action} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, subject_action: v }))} multiline />
              <Field label="Dialogue" value={editing.dialogue} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, dialogue: v }))} multiline />
              <Field label="Voice-over" value={editing.voice_over} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, voice_over: v }))} multiline />
              <Field label="On-screen text" value={editing.on_screen_text} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, on_screen_text: v }))} />
              <Picker label="Shot size" value={editing.shot_size} options={O.SHOT_SIZES} onSelect={(v: string) => setEditing((e: any) => ({ ...e, shot_size: v }))} />
              <Picker label="Camera angle" value={editing.camera_angle} options={O.CAMERA_ANGLES} onSelect={(v: string) => setEditing((e: any) => ({ ...e, camera_angle: v }))} />
              <Picker label="Camera movement" value={editing.camera_movement} options={O.CAMERA_MOVES} onSelect={(v: string) => setEditing((e: any) => ({ ...e, camera_movement: v }))} />
              <Field label="Focal length" value={editing.focal_length} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, focal_length: v }))} />
              <Field label="Lighting" value={editing.lighting} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, lighting: v }))} multiline />
              <Field label="Sound / music notes" value={editing.sound_notes} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, sound_notes: v }))} />
              <Field label="Transition" value={editing.transition} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, transition: v }))} />
              <Field label="AI image prompt" value={editing.image_prompt} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, image_prompt: v }))} multiline testID="f-prompt" />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

function Sec({ title, text }: any) {
  if (!text) return null;
  return (
    <View style={{ marginBottom: S.md }}>
      <Text style={styles.secTitle}>{title}</Text>
      <Body muted style={{ marginTop: 4 }}>{text}</Body>
    </View>
  );
}
function Chip({ children }: any) { return <View style={styles.chip}><Text style={styles.chipText}>{children}</Text></View>; }
function IconBtn({ icon, onPress, color, loading, testID }: any) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress} testID={testID}>
      {loading ? <ActivityIndicator size="small" color={C.brand} /> : <Ionicons name={icon} size={16} color={color || C.onSurface2} />}
    </Pressable>
  );
}
function ExportRow({ icon, label, onPress, testID }: any) {
  return (
    <Pressable style={styles.exportRow} onPress={onPress} testID={testID}>
      <Ionicons name={icon} size={18} color={C.onSurface} /><Text style={styles.exportText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface2 },
  hTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 20, flex: 1 },
  hSub: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  segWrap: { padding: S.lg, paddingBottom: 0, maxWidth: MAX_W, alignSelf: "center", width: "100%" },
  overviewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: S.sm, marginTop: S.sm },
  overviewCard: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.lg },
  secTitle: { color: C.brand, fontFamily: F.text, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: S.md },
  sceneCard: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.md },
  frame: { height: 130, alignItems: "center", justifyContent: "center" },
  frameNum: { position: "absolute", top: 8, left: 10, color: C.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 1 },
  frameDur: { position: "absolute", bottom: 8, right: 10, color: C.onSurface2, fontFamily: F.text, fontSize: 11 },
  sceneTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 19 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: S.sm },
  chip: { backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: C.onSurface3, fontFamily: F.text, fontSize: 11 },
  quote: { color: C.onSurface3, fontFamily: F.display, fontSize: 15, fontStyle: "italic", marginTop: S.sm },
  promptBox: { backgroundColor: C.brandTint, borderRadius: R.md, padding: S.md, marginTop: S.md },
  promptLabel: { color: C.onBrandTint, fontFamily: F.text, fontSize: 10, letterSpacing: 1 },
  promptText: { color: C.onBrandTint, fontFamily: F.text, fontSize: 12, marginTop: 4, lineHeight: 17 },
  promptRegen: { flexDirection: "row", alignItems: "center", marginTop: S.sm },
  miniLink: { color: C.brand, fontFamily: F.text, fontSize: 12, marginLeft: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: S.md },
  iconBtn: { width: 34, height: 34, borderRadius: R.sm, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" },
  shotRow: { backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, marginBottom: S.sm, overflow: "hidden" },
  shotHead: { flexDirection: "row", alignItems: "center", padding: S.md, gap: S.sm },
  shotNum: { width: 30, height: 30, borderRadius: R.sm, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  shotNumText: { color: C.brand, fontFamily: F.text, fontSize: 13, fontWeight: "600" },
  shotTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "500" },
  shotMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, marginRight: 4 },
  shotDetail: { padding: S.md, borderTopWidth: 1, borderTopColor: C.border },
  dRow: { flexDirection: "row", paddingVertical: 4 },
  dLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, width: 100 },
  dVal: { color: C.onSurface, fontFamily: F.text, fontSize: 12, flex: 1 },
  editInline: { flexDirection: "row", alignItems: "center", marginTop: S.sm },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface2, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, padding: S.xl, paddingBottom: S.xxxl },
  sheetTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 22, marginBottom: S.md },
  exportRow: { flexDirection: "row", alignItems: "center", paddingVertical: S.md, gap: S.md },
  exportText: { color: C.onSurface, fontFamily: F.text, fontSize: 15 },
});
