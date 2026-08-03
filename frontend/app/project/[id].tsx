import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { C, S, R, F, MAX_W } from "@/src/theme";
import { Field, Picker, Btn, H1, H2, Body, Badge, MockBadge, AnimIn } from "@/src/components";
import * as O from "@/src/options";
import { exportPdf, exportCsv, printProject } from "@/src/exporter";

const TABS = ["Overview", "Storyboard", "Shot List", "Script", "Production", "References", "Exports", "Settings"];

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
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [busyScene, setBusyScene] = useState<string | null>(null);
  const [regenAll, setRegenAll] = useState(false);
  const timer = useRef<any>(null);

  const load = useCallback(async () => {
    try { setProject(await api.getProject(id)); } catch { router.back(); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const persist = (data: any) => {
    setProject((p: any) => ({ ...p, ...data }));
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { await api.updateProject(id, data); setSaveState("saved"); setTimeout(() => setSaveState("idle"), 1400); }
      catch { setSaveState("idle"); }
    }, 600);
  };
  const persistScenes = (scenes: any[]) => persist({ scenes });

  const saveScene = (u: any) => { persistScenes(project.scenes.map((s: any) => (s.id === u.id ? u : s))); setEditing(null); };
  const addScene = () => {
    const ns = { id: Math.random().toString(36).slice(2, 12), scene_number: project.scenes.length + 1,
      title: "New Scene", duration: "5s", location: "", time_of_day: "Day", visual_description: "", subject_action: "",
      characters: "", dialogue: "", voice_over: "", on_screen_text: "", shot_size: "Medium shot", camera_angle: "Eye level",
      camera_movement: "Static", focal_length: "35mm", lighting: "", color_palette: "", sound_notes: "", transition: "Cut",
      frame_rate: "24fps", resolution: "4K", equipment: "", estimated_time: "", crew_notes: "", production_notes: "", image_prompt: "" };
    persistScenes([...project.scenes, ns]);
  };
  const dupScene = (s: any) => {
    const copy = { ...s, id: Math.random().toString(36).slice(2, 12) };
    const idx = project.scenes.findIndex((x: any) => x.id === s.id);
    const scenes = [...project.scenes]; scenes.splice(idx + 1, 0, copy);
    persistScenes(scenes.map((x, i) => ({ ...x, scene_number: i + 1 })));
  };
  const delScene = (s: any) => persistScenes(project.scenes.filter((x: any) => x.id !== s.id).map((x: any, i: number) => ({ ...x, scene_number: i + 1 })));
  const move = (s: any, dir: number) => {
    const idx = project.scenes.findIndex((x: any) => x.id === s.id); const j = idx + dir;
    if (j < 0 || j >= project.scenes.length) return;
    const scenes = [...project.scenes]; [scenes[idx], scenes[j]] = [scenes[j], scenes[idx]];
    persistScenes(scenes.map((x, i) => ({ ...x, scene_number: i + 1 })));
  };
  const regenScene = async (s: any) => { setBusyScene(s.id); try { setProject(await api.regenScene(id, s.id)); } catch {} finally { setBusyScene(null); } };
  const regenPrompt = async (s: any) => { setBusyScene(s.id + "-p"); try { setProject(await api.regenImagePrompt(id, s.id)); } catch {} finally { setBusyScene(null); } };
  const regenerateAll = async () => { setRegenAll(true); try { setProject(await api.generate(id)); setTab("Overview"); } catch {} finally { setRegenAll(false); } };
  const doExport = async (fn: () => Promise<void>) => { try { await fn(); api.markExported(id).then(() => setProject((p: any) => ({ ...p, export_count: (p.export_count || 0) + 1 }))); } catch (e) { console.log(e); } };

  if (loading || !project) return <View style={styles.center}><ActivityIndicator color={C.brand} size="large" /></View>;

  const cols = width > 760 ? 2 : 1;
  const cardW = cols === 2 ? "48.5%" : "100%";
  const notGenerated = project.status !== "generated";

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} testID="editor-back" hitSlop={8}><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <View style={{ flex: 1, marginHorizontal: S.md }}>
          <Text style={styles.hTitle} numberOfLines={1}>{project.title}</Text>
          <Text style={styles.hSub}>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : `${project.scenes.length} scenes · ${totalDuration(project.scenes)}`}</Text>
        </View>
        <Pressable onPress={() => setTab("Exports")} testID="export-btn" hitSlop={8}><Ionicons name="share-outline" size={22} color={C.brand} /></Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]} testID={`tab-${t}`}>
              <Text style={[styles.tabText, tab === t && { color: C.onSurface }]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 120, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        {project.mock_mode ? <View style={{ marginBottom: S.md }}><MockBadge /></View> : null}
        <Animated.View key={tab} entering={FadeIn.duration(240)}>
          {notGenerated && tab !== "Settings" ? (
            <View style={styles.emptyGen}>
              <View style={styles.emptyIcon}><Ionicons name="sparkles-outline" size={28} color={C.brand} /></View>
              <H2 style={{ marginTop: S.md }}>Storyboard not generated yet</H2>
              <Body muted style={{ textAlign: "center", marginTop: 4, marginBottom: S.lg }}>Generate the AI production package from your brief.</Body>
              <Btn title="Generate Storyboard" icon="sparkles" loading={regenAll} onPress={regenerateAll} testID="generate-now" />
            </View>
          ) : (
            <>
              {tab === "Overview" && <Overview p={project} />}
              {tab === "Storyboard" && (
                <View style={styles.grid}>
                  {project.scenes.map((s: any, i: number) => (
                    <View key={s.id} style={[styles.sceneCard, { width: cardW }]} testID={`scene-card-${i}`}>
                      <View style={styles.frame}>
                        <LinearGradient colors={["#201c12", "#0e0e0e"]} style={StyleSheet.absoluteFill} />
                        <Ionicons name="image-outline" size={24} color={C.onSurface2} />
                        <Text style={styles.frameNum}>SCENE {s.scene_number}</Text>
                        <Text style={styles.frameDur}>{s.duration}</Text>
                      </View>
                      <View style={{ padding: S.md }}>
                        <Text style={styles.sceneTitle} numberOfLines={1}>{s.title}</Text>
                        <Body muted style={{ marginTop: 4 }} numberOfLines={3}>{s.visual_description || "No description"}</Body>
                        <View style={styles.chips}><Chip>{s.shot_size}</Chip><Chip>{s.camera_movement}</Chip></View>
                        {(s.dialogue || s.voice_over) ? <Text style={styles.quote} numberOfLines={2}>“{s.dialogue || s.voice_over}”</Text> : null}
                        <View style={styles.promptBox}>
                          <Text style={styles.promptLabel}>AI IMAGE PROMPT</Text>
                          <Text style={styles.promptText} numberOfLines={3}>{s.image_prompt || "—"}</Text>
                          <Pressable style={styles.miniRow} onPress={() => regenPrompt(s)} testID={`regen-prompt-${i}`}>
                            {busyScene === s.id + "-p" ? <ActivityIndicator size="small" color={C.brand} /> : <><Ionicons name="refresh" size={13} color={C.brand} /><Text style={styles.miniLink}>Regenerate prompt</Text></>}
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
                  <Btn title="Add Scene" variant="ghost" icon="add" onPress={addScene} testID="add-scene" style={{ marginTop: S.sm, width: "100%" }} />
                </View>
              )}
              {tab === "Shot List" && (
                <View>
                  {project.scenes.map((s: any, i: number) => {
                    const open = expanded[s.id];
                    return (
                      <View key={s.id} style={styles.shotRow} testID={`shot-row-${i}`}>
                        <Pressable style={styles.shotHead} onPress={() => setExpanded((e) => ({ ...e, [s.id]: !open }))}>
                          <View style={styles.shotNum}><Text style={styles.shotNumText}>{i + 1}</Text></View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.shotTitle} numberOfLines={1}>{s.title}</Text>
                            <Body muted style={{ fontSize: 12 }} numberOfLines={open ? undefined : 1}>{s.visual_description}</Body>
                          </View>
                          <Text style={styles.shotMeta}>{s.shot_size}</Text>
                          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.onSurface2} />
                        </Pressable>
                        {open && (
                          <View style={styles.shotDetail}>
                            {[["Scene", s.scene_number], ["Shot size", s.shot_size], ["Angle", s.camera_angle], ["Movement", s.camera_movement],
                              ["Lens", s.focal_length], ["Frame rate", s.frame_rate], ["Resolution", s.resolution], ["Location", s.location],
                              ["Time", s.time_of_day], ["Lighting", s.lighting], ["Audio", s.sound_notes], ["Equipment", s.equipment],
                              ["Est. time", s.estimated_time], ["Crew notes", s.crew_notes], ["Duration", s.duration], ["Transition", s.transition]].map((r) => (
                              <View key={String(r[0])} style={styles.dRow}><Text style={styles.dLabel}>{r[0]}</Text><Text style={styles.dVal}>{String(r[1] || "—")}</Text></View>
                            ))}
                            <Pressable style={styles.miniRow} onPress={() => setEditing({ ...s })} testID={`shot-edit-${i}`}><Ionicons name="create-outline" size={14} color={C.brand} /><Text style={styles.miniLink}>Edit scene</Text></Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
              {tab === "Script" && (
                <View style={styles.card}><Text style={styles.secLabel}>SCRIPT</Text><Body style={{ marginTop: S.sm, lineHeight: 24 }}>{project.script || "—"}</Body></View>
              )}
              {tab === "Production" && (<>
                <View style={styles.card}><Text style={styles.secLabel}>PRODUCTION NOTES</Text><Body style={{ marginTop: S.sm }}>{project.production_notes || "—"}</Body></View>
                <View style={[styles.card, { marginTop: S.md }]}>
                  <Text style={styles.secLabel}>SETTINGS SUMMARY</Text>
                  {[["Video type", project.video_type], ["Platform", project.platform], ["Duration", project.duration], ["Aspect", project.aspect_ratio], ["Crew", project.crew_size], ["Budget", project.budget], ["Location", project.location_type], ["Actors", project.num_actors]].map((r) => (
                    <View key={String(r[0])} style={styles.dRow}><Text style={styles.dLabel}>{r[0]}</Text><Text style={styles.dVal}>{String(r[1] || "—")}</Text></View>
                  ))}
                </View>
              </>)}
              {tab === "References" && (
                <View style={styles.card}>
                  <Text style={styles.secLabel}>CREATIVE & REFERENCES</Text>
                  {[["Mood", project.mood], ["Visual style", project.visual_style], ["Camera style", project.camera_style], ["Lighting", project.lighting_style], ["Editing", project.editing_style], ["Music", project.music_style], ["Director refs", project.director_references], ["Film refs", project.film_references], ["Deliverables", project.deliverables], ["Special requests", project.special_requests], ["Restrictions", project.restrictions], ["Notes", project.extra_notes]].map((r) => (
                    <View key={String(r[0])} style={styles.dRow}><Text style={styles.dLabel}>{r[0]}</Text><Text style={styles.dVal}>{String(r[1] || "—")}</Text></View>
                  ))}
                </View>
              )}
              {tab === "Exports" && (<>
                <Body muted style={{ marginBottom: S.md }}>Export a beautiful, production-ready package. {project.export_count ? `Exported ${project.export_count}×.` : ""}</Body>
                <ExportCard icon="document-text-outline" title="Export as PDF" sub="Cover, concept, script, storyboard & shot list" onPress={() => doExport(() => exportPdf(project))} testID="export-pdf" />
                <ExportCard icon="grid-outline" title="Export shot list (CSV)" sub="Spreadsheet with all technical columns" onPress={() => doExport(() => exportCsv(project))} testID="export-csv" />
                <ExportCard icon="print-outline" title="Print project" sub="Open the print dialog" onPress={() => doExport(() => printProject(project))} testID="export-print" />
              </>)}
              {tab === "Settings" && <SettingsTab p={project} persist={persist} onRegen={regenerateAll} regenBusy={regenAll} router={router} id={id} />}
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Scene editor modal */}
      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        {editing && (
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
              <Pressable onPress={() => setEditing(null)} testID="scene-cancel" hitSlop={8}><Ionicons name="close" size={24} color={C.onSurface} /></Pressable>
              <Text style={styles.hTitle}>Edit Scene {editing.scene_number}</Text>
              <Pressable onPress={() => saveScene(editing)} testID="scene-save" hitSlop={8}><Text style={{ color: C.brand, fontFamily: F.text, fontSize: 15, fontWeight: "600" }}>Save</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxxl, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
              {[["title", "Scene name"], ["duration", "Duration"], ["location", "Location"], ["time_of_day", "Time of day"], ["characters", "Characters"]].map(([k, l]) => (
                <Field key={k} label={l} value={editing[k]} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, [k]: v }))} testID={`f-${k}`} />
              ))}
              <Field label="Scene description" value={editing.visual_description} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, visual_description: v }))} multiline testID="f-visual" />
              <Field label="Subject / action" value={editing.subject_action} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, subject_action: v }))} multiline />
              <Field label="Dialogue" value={editing.dialogue} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, dialogue: v }))} multiline />
              <Field label="Voice over" value={editing.voice_over} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, voice_over: v }))} multiline />
              <Field label="On-screen text" value={editing.on_screen_text} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, on_screen_text: v }))} />
              <Picker label="Shot type" value={editing.shot_size} options={O.SHOT_SIZES} onSelect={(v: string) => setEditing((e: any) => ({ ...e, shot_size: v }))} />
              <Picker label="Camera angle" value={editing.camera_angle} options={O.CAMERA_ANGLES} onSelect={(v: string) => setEditing((e: any) => ({ ...e, camera_angle: v }))} />
              <Picker label="Camera movement" value={editing.camera_movement} options={O.CAMERA_MOVES} onSelect={(v: string) => setEditing((e: any) => ({ ...e, camera_movement: v }))} />
              <Field label="Lens" value={editing.focal_length} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, focal_length: v }))} />
              <Picker label="Frame rate" value={editing.frame_rate} options={O.FRAME_RATES} onSelect={(v: string) => setEditing((e: any) => ({ ...e, frame_rate: v }))} />
              <Picker label="Resolution" value={editing.resolution} options={O.RESOLUTIONS} onSelect={(v: string) => setEditing((e: any) => ({ ...e, resolution: v }))} />
              <Field label="Lighting" value={editing.lighting} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, lighting: v }))} multiline />
              <Field label="Color palette" value={editing.color_palette} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, color_palette: v }))} />
              <Field label="Audio notes" value={editing.sound_notes} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, sound_notes: v }))} />
              <Field label="Equipment" value={editing.equipment} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, equipment: v }))} />
              <Field label="Estimated time" value={editing.estimated_time} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, estimated_time: v }))} />
              <Field label="Crew notes" value={editing.crew_notes} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, crew_notes: v }))} />
              <Field label="Transition" value={editing.transition} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, transition: v }))} />
              <Field label="Production notes" value={editing.production_notes} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, production_notes: v }))} multiline />
              <Field label="AI image prompt" value={editing.image_prompt} onChangeText={(v: string) => setEditing((e: any) => ({ ...e, image_prompt: v }))} multiline testID="f-prompt" />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

function Overview({ p }: any) {
  return (
    <View>
      <AnimIn><OSec label="CREATIVE CONCEPT" text={p.concept} /></AnimIn>
      <AnimIn delay={60}><OSec label="CREATIVE SUMMARY" text={p.creative_summary} /></AnimIn>
      <AnimIn delay={120}><OSec label="DIRECTOR'S TREATMENT" text={p.treatment} /></AnimIn>
      <AnimIn delay={180}><OSec label="VISUAL DIRECTION" text={p.visual_direction} /></AnimIn>
    </View>
  );
}
function OSec({ label, text }: any) {
  if (!text) return null;
  return <View style={styles.card}><Text style={styles.secLabel}>{label}</Text><Body style={{ marginTop: S.sm, lineHeight: 23 }}>{text}</Body></View>;
}
function Chip({ children }: any) { return <View style={styles.chip}><Text style={styles.chipText}>{children}</Text></View>; }
function IconBtn({ icon, onPress, color, loading, testID }: any) {
  return <Pressable style={styles.iconBtn} onPress={onPress} testID={testID}>{loading ? <ActivityIndicator size="small" color={C.brand} /> : <Ionicons name={icon} size={16} color={color || C.onSurface2} />}</Pressable>;
}
function ExportCard({ icon, title, sub, onPress, testID }: any) {
  return (
    <Pressable style={styles.exportCard} onPress={onPress} testID={testID}>
      <View style={styles.exportIcon}><Ionicons name={icon} size={20} color={C.brand} /></View>
      <View style={{ flex: 1 }}><Text style={styles.exportTitle}>{title}</Text><Body muted style={{ fontSize: 12.5, marginTop: 2 }}>{sub}</Body></View>
      <Ionicons name="download-outline" size={18} color={C.onSurface2} />
    </Pressable>
  );
}
function SettingsTab({ p, persist, onRegen, regenBusy, router, id }: any) {
  const [del, setDel] = useState(false);
  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.secLabel}>PROJECT</Text>
        <SetRow label="Status" value={p.status === "generated" ? "Generated" : "Draft"} />
        <SetRow label="Scenes" value={String(p.scenes?.length || 0)} />
        <SetRow label="Exports" value={String(p.export_count || 0)} />
      </View>
      <View style={[styles.card, { marginTop: S.md, gap: S.sm }]}>
        <Text style={styles.secLabel}>ACTIONS</Text>
        <Btn title={p.favorite ? "Remove from favorites" : "Add to favorites"} variant="ghost" icon={p.favorite ? "star" : "star-outline"} onPress={() => persist({ favorite: !p.favorite })} testID="set-fav" />
        <Btn title={p.archived ? "Unarchive" : "Archive project"} variant="ghost" icon={p.archived ? "arrow-undo-outline" : "archive-outline"} onPress={() => persist({ archived: !p.archived })} testID="set-archive" />
        <Btn title="Regenerate entire storyboard" variant="ghost" icon="sparkles-outline" loading={regenBusy} onPress={onRegen} testID="set-regen" />
        <Btn title="Delete project" icon="trash-outline" onPress={() => setDel(true)} testID="set-delete" style={{ backgroundColor: C.error }} />
      </View>
      <Modal visible={del} transparent animationType="fade" onRequestClose={() => setDel(false)}>
        <View style={styles.modalBg}><View style={styles.centerSheet}>
          <Text style={styles.sheetTitle}>Delete project?</Text>
          <Body muted style={{ marginBottom: S.lg }}>This cannot be undone.</Body>
          <Btn title="Delete" style={{ backgroundColor: C.error, marginBottom: S.sm }} onPress={async () => { await api.deleteProject(id); router.replace("/projects"); }} testID="set-confirm-delete" />
          <Btn title="Cancel" variant="ghost" onPress={() => setDel(false)} />
        </View></View>
      </Modal>
    </View>
  );
}
function SetRow({ label, value }: any) { return <View style={styles.dRow}><Text style={styles.dLabel}>{label}</Text><Text style={styles.dVal}>{value}</Text></View>; }

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface2 },
  hTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 20, flex: 1 },
  hSub: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  tabsWrap: { borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface2, paddingVertical: S.sm },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, flexShrink: 0 },
  tabActive: { backgroundColor: C.surface3 },
  tabText: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5, fontWeight: "500" },
  card: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.md },
  secLabel: { color: C.brand, fontFamily: F.text, fontSize: 11.5, letterSpacing: 1.4 },
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
  miniRow: { flexDirection: "row", alignItems: "center", marginTop: S.sm },
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
  dRow: { flexDirection: "row", paddingVertical: 5, borderTopWidth: 1, borderTopColor: C.border },
  dLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, width: 120 },
  dVal: { color: C.onSurface, fontFamily: F.text, fontSize: 12.5, flex: 1 },
  emptyGen: { alignItems: "center", backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xxl },
  emptyIcon: { width: 62, height: 62, borderRadius: R.lg, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  exportCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.md, gap: S.md },
  exportIcon: { width: 44, height: 44, borderRadius: R.md, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  exportTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "500" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: S.xl },
  centerSheet: { backgroundColor: C.surface2, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.borderStrong, maxWidth: 420, width: "100%", alignSelf: "center" },
  sheetTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 21, marginBottom: S.md },
});
