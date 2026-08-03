import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, TextInput, useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { C, S, R, F, MAX_W } from "@/src/theme";
import { Btn, H2, Body, Badge, MockBadge, AnimIn } from "@/src/components";
import { exportPdf, exportCsv, printProject } from "@/src/exporter";

const TABS = ["Overview", "Storyboard", "Script", "Shot List", "Equipment", "Crew", "Schedule", "Budget", "Exports", "Settings"];

const cap = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function totalDuration(scenes: any[]) {
  let sec = 0;
  scenes.forEach((s) => { const m = String(s.duration || "").match(/[\d.]+/); if (m) sec += parseFloat(m[0]); });
  return sec ? `${Math.round(sec)}s` : "—";
}

export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [busyScene, setBusyScene] = useState<string | null>(null);
  const [regenAll, setRegenAll] = useState(false);
  const [regenTicks, setRegenTicks] = useState<Record<string, number>>({});
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
  const renum = (scenes: any[]) => scenes.map((x, i) => ({ ...x, scene_number: i + 1 }));
  const persistScenesFn = (updater: (sc: any[]) => any[]) => {
    setSaveState("saving");
    setProject((p: any) => {
      const scenes = updater(p.scenes);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try { await api.updateProject(id, { scenes }); setSaveState("saved"); setTimeout(() => setSaveState("idle"), 1400); }
        catch { setSaveState("idle"); }
      }, 600);
      return { ...p, scenes };
    });
  };
  const persistScenes = (scenes: any[]) => persistScenesFn(() => scenes);

  const blankScene = () => ({
    id: Math.random().toString(36).slice(2, 12), scene_number: 0, title: "New Scene", duration: "5s",
    location: "", time_of_day: "Day", characters: "", visual_description: "", narrative: "", subject_action: "",
    dialogue: "", voice_over: "", on_screen_text: "", shot_size: "Medium shot", camera_angle: "Eye level",
    camera_movement: "Static", focal_length: "35mm", camera_position: "", camera_height: "Eye level",
    camera_direction: "", lighting: "", color_palette: "", mood: "", props: "", wardrobe: "", sound_notes: "",
    transition: "Cut", frame_rate: "24fps", resolution: "4K", equipment: "", estimated_time: "", crew_notes: "",
    director_notes: "", production_notes: "", comments: "", ai_notes: "", image_prompt: "", image_url: "", status: "Draft",
  });
  const addScene = () => persistScenesFn((sc) => renum([...sc, blankScene()]));
  const insertScene = (refId: string, pos: "above" | "below") => persistScenesFn((sc) => {
    const idx = sc.findIndex((x) => x.id === refId);
    const at = pos === "above" ? idx : idx + 1;
    const next = [...sc]; next.splice(at, 0, blankScene());
    return renum(next);
  });
  const dupScene = (s: any) => persistScenesFn((sc) => {
    const idx = sc.findIndex((x) => x.id === s.id);
    const next = [...sc]; next.splice(idx + 1, 0, { ...s, id: Math.random().toString(36).slice(2, 12) });
    return renum(next);
  });
  const copyScene = async (s: any) => {
    const text = Object.entries(s).filter(([k]) => !["id"].includes(k)).map(([k, v]) => `${k}: ${v}`).join("\n");
    try { await Clipboard.setStringAsync(text); } catch {}
  };
  const delScene = (s: any) => persistScenesFn((sc) => renum(sc.filter((x) => x.id !== s.id)));
  const move = (s: any, dir: number) => persistScenesFn((sc) => {
    const idx = sc.findIndex((x) => x.id === s.id); const j = idx + dir;
    if (j < 0 || j >= sc.length) return sc;
    const next = [...sc]; [next[idx], next[j]] = [next[j], next[idx]];
    return renum(next);
  });
  const setStatus = (s: any, status: string) => persistScenesFn((sc) => sc.map((x) => (x.id === s.id ? { ...x, status } : x)));
  const setImage = (s: any, url: string) => persistScenesFn((sc) => sc.map((x) => (x.id === s.id ? { ...x, image_url: url } : x)));
  const commitScene = (sid: string, fields: any) => persistScenesFn((sc) => sc.map((x) => (x.id === sid ? { ...x, ...fields } : x)));
  const markUnsaved = () => setSaveState("unsaved");
  const expandAll = () => setExpanded(Object.fromEntries(project.scenes.map((s: any) => [s.id, true])));
  const collapseAll = () => setExpanded({});

  const bump = (sid: string) => setRegenTicks((t) => ({ ...t, [sid]: (t[sid] || 0) + 1 }));
  const regenWrap = (suffix: string, fn: any) => async (s: any) => {
    setBusyScene(s.id + suffix);
    try { setProject(await fn(id, s.id)); bump(s.id); } catch {} finally { setBusyScene(null); }
  };
  const regenScene = regenWrap("", api.regenScene);
  const regenPrompt = regenWrap("-p", api.regenImagePrompt);
  const regenDialogue = regenWrap("-d", api.regenDialogue);
  const regenCamera = regenWrap("-c", api.regenCamera);
  const regenDescription = regenWrap("-desc", api.regenDescription);
  const regenVoiceOver = regenWrap("-vo", api.regenVoiceOver);
  const regenLighting = regenWrap("-l", api.regenLighting);
  const regenerateAll = async () => { setRegenAll(true); try { setProject(await api.generate(id)); setTab("Overview"); } catch {} finally { setRegenAll(false); } };
  const doExport = async (fn: () => Promise<void>) => { try { await fn(); api.markExported(id).then(() => setProject((p: any) => ({ ...p, export_count: (p.export_count || 0) + 1 }))); } catch (e) { console.log(e); } };

  if (loading || !project) return <View style={styles.center}><ActivityIndicator color={C.brand} size="large" /></View>;

  const notGenerated = project.status !== "generated";

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={() => router.back()} testID="editor-back" hitSlop={8}><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <View style={{ flex: 1, marginHorizontal: S.md }}>
          <Text style={styles.hTitle} numberOfLines={1}>{project.title}</Text>
          <Text style={styles.hSub}>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "unsaved" ? "Unsaved changes" : `${project.scenes.length} scenes · ${totalDuration(project.scenes)}`}</Text>
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

      {tab === "Storyboard" && !notGenerated ? (
        <StoryboardTab
          project={project} busyScene={busyScene} expanded={expanded} setExpanded={setExpanded}
          onReorder={persistScenes} addScene={addScene} regenTicks={regenTicks}
          commitScene={commitScene} markUnsaved={markUnsaved} setStatus={setStatus} setImage={setImage}
          expandAll={expandAll} collapseAll={collapseAll} insertScene={insertScene} copyScene={copyScene}
          onExport={() => doExport(() => exportCsv(project))} onPdf={() => doExport(() => exportPdf(project))}
          actions={{ dup: dupScene, del: delScene, move,
            regenScene, regenDialogue, regenCamera, regenPrompt, regenDescription, regenVoiceOver, regenLighting }}
        />
      ) : (
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
              {/* Storyboard tab is rendered separately below via DraggableFlatList */}
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
                            <Pressable style={styles.miniRow} onPress={() => { setTab("Storyboard"); setExpanded((e: any) => ({ ...e, [s.id]: true })); }} testID={`shot-edit-${i}`}><Ionicons name="create-outline" size={14} color={C.brand} /><Text style={styles.miniLink}>Edit in Storyboard</Text></Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
              {tab === "Script" && (
                <View>
                  {project.scenes.map((s: any, i: number) => (
                    <AnimIn key={s.id} delay={i * 40}>
                      <View style={styles.card}>
                        <Text style={styles.secLabel}>SCENE {s.scene_number} · {(s.title || "").toUpperCase()}</Text>
                        {s.narrative ? <Body style={{ marginTop: S.sm, lineHeight: 22 }}>{s.narrative}</Body> : null}
                        {s.dialogue ? <View style={styles.scriptLine}><Text style={styles.scriptTag}>DIALOGUE</Text><Body style={{ flex: 1 }}>{s.dialogue}</Body></View> : null}
                        {s.voice_over ? <View style={styles.scriptLine}><Text style={styles.scriptTag}>V.O.</Text><Body style={{ flex: 1 }}>{s.voice_over}</Body></View> : null}
                        {s.on_screen_text ? <View style={styles.scriptLine}><Text style={styles.scriptTag}>ON SCREEN</Text><Body style={{ flex: 1 }}>{s.on_screen_text}</Body></View> : null}
                      </View>
                    </AnimIn>
                  ))}
                </View>
              )}
              {tab === "Equipment" && <DefCard label="RECOMMENDED EQUIPMENT" data={project.equipment}
                order={["camera", "lens", "drone", "gimbal", "tripod", "lighting", "audio", "accessories"]} icon="camera-outline" />}
              {tab === "Crew" && <DefCard label="SUGGESTED CREW" data={project.crew}
                order={["crew_size", "director", "producer", "dp", "camera_operator", "focus_puller", "gaffer", "sound", "drone_pilot", "production_assistant"]} icon="people-outline" />}
              {tab === "Schedule" && <DefCard label="SHOOTING SCHEDULE" data={project.schedule}
                order={["recommendation", "estimated_hours", "breakdown"]} icon="calendar-outline" />}
              {tab === "Budget" && (
                <View>
                  <Body muted style={{ marginBottom: S.md }}>Estimated production budget ranges.</Body>
                  {[["low", "Low Budget"], ["medium", "Medium Budget"], ["commercial", "Commercial"], ["premium", "Premium"]].map(([k, l], i) => (
                    <AnimIn key={k} delay={i * 50}>
                      <View style={styles.budgetRow}>
                        <View><Text style={styles.budgetTier}>{l}</Text></View>
                        <Text style={styles.budgetVal}>{project.budget?.[k] || "—"}</Text>
                      </View>
                    </AnimIn>
                  ))}
                  {project.budget?.notes ? <Body muted style={{ marginTop: S.md, fontSize: 12.5 }}>{project.budget.notes}</Body> : null}
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
      )}

      {/* Inline editing (Sprint 2) replaces the scene edit modal */}
    </View>
  );
}

function Overview({ p }: any) {
  return (
    <View>
      <AnimIn><KVCard label="CREATIVE CONCEPT" icon="bulb-outline" data={p.concept}
        order={["title", "elevator_pitch", "main_message", "emotional_goal", "audience", "communication_objective"]} /></AnimIn>
      <AnimIn delay={80}><KVCard label="DIRECTOR'S TREATMENT" icon="color-wand-outline" data={p.treatment}
        order={["visual_style", "narrative_style", "camera_language", "editing_style", "lighting_style", "color_palette", "sound_design", "overall_mood"]} /></AnimIn>
    </View>
  );
}

function KVCard({ label, data, order, icon }: any) {
  // Legacy string support
  if (typeof data === "string") {
    if (!data) return null;
    return <View style={styles.card}><Text style={styles.secLabel}>{label}</Text><Body style={{ marginTop: S.sm, lineHeight: 23 }}>{data}</Body></View>;
  }
  const keys = (order || Object.keys(data || {})).filter((k: string) => data && data[k]);
  if (keys.length === 0) return <View style={styles.card}><Text style={styles.secLabel}>{label}</Text><Body muted style={{ marginTop: S.sm }}>Not generated yet.</Body></View>;
  return (
    <View style={styles.card}>
      <View style={styles.kvHead}>{icon ? <Ionicons name={icon} size={16} color={C.brand} /> : null}<Text style={styles.secLabel}>{label}</Text></View>
      {keys.map((k: string) => (
        <View key={k} style={styles.kvRow}><Text style={styles.kvLabel}>{cap(k)}</Text><Text style={styles.kvVal}>{String(data[k])}</Text></View>
      ))}
    </View>
  );
}
const DefCard = KVCard;

function RegenChip({ icon, label, busy, onPress, testID }: any) {
  return (
    <Pressable style={styles.regenChip} onPress={onPress} testID={testID}>
      {busy ? <ActivityIndicator size="small" color={C.brand} /> : <><Ionicons name={icon} size={13} color={C.brand} /><Text style={styles.regenChipText}>{label}</Text></>}
    </Pressable>
  );
}

function parseMin(s: any) { const m = String(s || "").match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; }
function estShootTime(scenes: any[]) {
  const mins = scenes.reduce((n, s) => n + (parseMin(s.estimated_time) || 45), 0);
  const h = mins / 60;
  return h >= 1 ? `${(Math.round(h * 10) / 10)} hrs` : `${Math.round(mins)} min`;
}
function ProgStat({ label, value }: any) {
  return <View style={styles.progStat}><Text style={styles.progVal}>{value}</Text><Text style={styles.progLabel}>{label}</Text></View>;
}

const CINE_FRAME = "https://images.unsplash.com/photo-1485846234645-a62644f84728?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200";
const STATUSES = ["Draft", "Needs Review", "Approved", "Completed"];
const STATUS_TONE: Record<string, string> = { "Draft": C.onSurface2, "Needs Review": C.warning, "Approved": C.brand, "Completed": C.success };

const GROUPS: { title: string; fields: [string, string, boolean?][] }[] = [
  { title: "CREATIVE", fields: [["title", "Scene Title"], ["visual_description", "Visual Description", true], ["subject_action", "Action", true], ["dialogue", "Dialogue", true], ["voice_over", "Voice Over", true], ["on_screen_text", "On Screen Text"]] },
  { title: "CAMERA", fields: [["shot_size", "Shot Size"], ["camera_angle", "Camera Angle"], ["camera_movement", "Camera Movement"], ["focal_length", "Lens"], ["camera_height", "Camera Height"], ["camera_direction", "Camera Direction"]] },
  { title: "LIGHTING", fields: [["lighting", "Lighting Style", true], ["time_of_day", "Time of Day"], ["color_palette", "Color Palette"], ["mood", "Mood"]] },
  { title: "PRODUCTION", fields: [["characters", "Characters"], ["props", "Props"], ["location", "Location"], ["wardrobe", "Wardrobe"], ["sound_notes", "Audio Notes", true], ["director_notes", "Director Notes", true], ["production_notes", "Production Notes", true]] },
  { title: "AI", fields: [["image_prompt", "Image Prompt", true], ["ai_notes", "AI Notes", true]] },
];

function EditableField({ label, value, onChange, multiline }: any) {
  return (
    <View style={styles.efWrap}>
      <Text style={styles.efLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} multiline={multiline} placeholder="Empty…"
        placeholderTextColor={C.onSurface2}
        style={[styles.efInput, multiline && { minHeight: 52, textAlignVertical: "top", paddingTop: 8 }]} />
    </View>
  );
}

function ImageFrame({ url, onRemove }: any) {
  return (
    <View style={styles.frameBig}>
      {url ? <ExpoImage source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
        <><LinearGradient colors={["#201c12", "#0b0b0b"]} style={StyleSheet.absoluteFill} />
          <Ionicons name="image-outline" size={30} color={C.onSurface2} />
          <Text style={styles.frameHint}>Storyboard frame</Text></>
      )}
      <View style={styles.frameBtns}>
        <RegenChip icon="sparkles-outline" label="Generate" onPress={() => {}} />
        <RegenChip icon="swap-horizontal-outline" label="Replace" onPress={() => onRemove(url ? "" : CINE_FRAME)} />
        <RegenChip icon="trash-outline" label="Remove" onPress={() => onRemove("")} />
      </View>
    </View>
  );
}

const SceneCard = React.memo(function SceneCard({ scene, index, open, version, busyScene, drag, isActive,
  onToggle, commitScene, markUnsaved, setStatus, setImage, insertScene, copyScene, actions }: any) {
  const [f, setF] = useState<any>(scene);
  const latest = useRef(scene); latest.current = scene;
  const t = useRef<any>(null);
  useEffect(() => { setF(latest.current); }, [version]);
  const change = (k: string) => (v: string) => {
    setF((prev: any) => {
      const nx = { ...prev, [k]: v };
      markUnsaved();
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => commitScene(scene.id, { [k]: v }), 700);
      return nx;
    });
  };
  const regenMap: Record<string, any> = { CREATIVE: null };
  return (
    <ScaleDecorator>
      <View style={[styles.sbCard, isActive && styles.sbCardActive]} testID={`scene-card-${index}`}>
        <View style={styles.sbHead}>
          <Pressable onLongPress={drag} delayLongPress={140} style={styles.dragHandle} testID={`drag-${index}`}>
            <Ionicons name="reorder-three-outline" size={22} color={C.onSurface2} />
          </Pressable>
          <View style={styles.sbNum}><Text style={styles.sbNumText}>{scene.scene_number}</Text></View>
          <Pressable style={{ flex: 1 }} onPress={() => onToggle(scene.id)} testID={`toggle-${index}`}>
            <Text style={styles.sbTitle} numberOfLines={1}>{f.title || "Untitled scene"}</Text>
            <View style={styles.sbMetaRow}>
              <Chip>{f.duration || "—"}</Chip><Chip>{f.shot_size || "—"}</Chip><Chip>{f.location || "—"}</Chip>
              <View style={[styles.statusBadge, { borderColor: STATUS_TONE[f.status] || C.onSurface2 }]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_TONE[f.status] || C.onSurface2 }]} />
                <Text style={[styles.statusText, { color: STATUS_TONE[f.status] || C.onSurface2 }]}>{f.status || "Draft"}</Text>
              </View>
            </View>
          </Pressable>
          <Pressable onPress={() => onToggle(scene.id)} hitSlop={8}><Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.onSurface2} /></Pressable>
        </View>

        {open && (
          <View style={styles.sbBody}>
            <ImageFrame url={f.image_url} onRemove={(u: string) => { setF((p: any) => ({ ...p, image_url: u })); setImage(scene, u); }} />

            <Text style={styles.efLabel}>Status</Text>
            <View style={styles.statusRow}>
              {STATUSES.map((st) => (
                <Pressable key={st} onPress={() => { setF((p: any) => ({ ...p, status: st })); setStatus(scene, st); }}
                  style={[styles.statusChip, f.status === st && { borderColor: STATUS_TONE[st], backgroundColor: "rgba(197,160,89,0.12)" }]} testID={`status-${index}-${st}`}>
                  <Text style={[styles.statusChipText, f.status === st && { color: STATUS_TONE[st] }]}>{st}</Text>
                </Pressable>
              ))}
            </View>

            {GROUPS.map((g) => (
              <View key={g.title} style={styles.group}>
                <Text style={styles.groupTitle}>{g.title}</Text>
                {g.fields.map(([k, l, ml]) => (
                  <EditableField key={k} label={l} value={f[k]} onChange={change(k)} multiline={ml} />
                ))}
                {g.title === "CREATIVE" && (
                  <View style={styles.regenRow}>
                    <RegenChip icon="refresh" label="Description" busy={busyScene === scene.id + "-desc"} onPress={() => actions.regenDescription(scene)} testID={`regen-description-${index}`} />
                    <RegenChip icon="chatbubbles-outline" label="Dialogue" busy={busyScene === scene.id + "-d"} onPress={() => actions.regenDialogue(scene)} testID={`regen-dialogue-${index}`} />
                    <RegenChip icon="mic-outline" label="Voice Over" busy={busyScene === scene.id + "-vo"} onPress={() => actions.regenVoiceOver(scene)} testID={`regen-voiceover-${index}`} />
                  </View>
                )}
                {g.title === "CAMERA" && (
                  <View style={styles.regenRow}><RegenChip icon="videocam-outline" label="Camera Setup" busy={busyScene === scene.id + "-c"} onPress={() => actions.regenCamera(scene)} testID={`regen-camera-${index}`} /></View>
                )}
                {g.title === "LIGHTING" && (
                  <View style={styles.regenRow}><RegenChip icon="bulb-outline" label="Lighting" busy={busyScene === scene.id + "-l"} onPress={() => actions.regenLighting(scene)} testID={`regen-lighting-${index}`} /></View>
                )}
                {g.title === "AI" && (
                  <View style={styles.regenRow}>
                    <RegenChip icon="image-outline" label="Image Prompt" busy={busyScene === scene.id + "-p"} onPress={() => actions.regenPrompt(scene)} testID={`regen-prompt-${index}`} />
                    <RegenChip icon="sparkles-outline" label="Entire Scene" busy={busyScene === scene.id} onPress={() => actions.regenScene(scene)} testID={`regen-${index}`} />
                  </View>
                )}
              </View>
            ))}

            <Text style={styles.efLabel}>Internal Comments</Text>
            <TextInput value={f.comments} onChangeText={change("comments")} multiline placeholder="Notes visible only in this project…"
              placeholderTextColor={C.onSurface2} style={[styles.efInput, { minHeight: 52, textAlignVertical: "top", paddingTop: 8 }]} testID={`comments-${index}`} />

            <View style={styles.actions}>
              <IconBtn icon="arrow-up-circle-outline" onPress={() => insertScene(scene.id, "above")} testID={`ins-above-${index}`} />
              <IconBtn icon="arrow-down-circle-outline" onPress={() => insertScene(scene.id, "below")} testID={`ins-below-${index}`} />
              <IconBtn icon="copy-outline" onPress={() => actions.dup(scene)} testID={`dup-${index}`} />
              <IconBtn icon="clipboard-outline" onPress={() => copyScene(scene)} testID={`copy-${index}`} />
              <IconBtn icon="arrow-up" onPress={() => actions.move(scene, -1)} testID={`up-${index}`} />
              <IconBtn icon="arrow-down" onPress={() => actions.move(scene, 1)} testID={`down-${index}`} />
              <IconBtn icon="trash-outline" color={C.error} onPress={() => actions.del(scene)} testID={`del-${index}`} />
            </View>
          </View>
        )}
      </View>
    </ScaleDecorator>
  );
});

function SummaryPanel({ scenes, mobile }: any) {
  const locations = Array.from(new Set(scenes.map((s: any) => (s.location || "").trim()).filter(Boolean)));
  const chars = Array.from(new Set(scenes.flatMap((s: any) => String(s.characters || "").split(/[,;/]/).map((c: string) => c.trim()).filter(Boolean))));
  const done = scenes.filter((s: any) => s.status === "Approved" || s.status === "Completed").length;
  const pct = scenes.length ? Math.round((done / scenes.length) * 100) : 0;
  return (
    <View style={[styles.summary, mobile ? styles.summaryMobile : styles.summaryDesktop]}>
      <Text style={styles.secLabel}>SUMMARY</Text>
      <SumRow label="Total Scenes" value={String(scenes.length)} />
      <SumRow label="Estimated Duration" value={totalDuration(scenes)} />
      <SumRow label="Est. Shooting Time" value={estShootTime(scenes)} />
      <SumRow label="Locations Used" value={String(locations.length)} />
      <SumRow label="Characters" value={String(chars.length)} />
      <View style={{ marginTop: S.sm }}>
        <View style={styles.rowBetween}><Text style={styles.sumLabel}>Completion</Text><Text style={styles.sumVal}>{pct}%</Text></View>
        <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
      </View>
    </View>
  );
}
function SumRow({ label, value }: any) { return <View style={styles.rowBetween}><Text style={styles.sumLabel}>{label}</Text><Text style={styles.sumVal}>{value}</Text></View>; }

function StoryboardTab({ project, busyScene, expanded, setExpanded, onReorder, addScene, regenTicks,
  commitScene, markUnsaved, setStatus, setImage, expandAll, collapseAll, insertScene, copyScene, onExport, onPdf, actions }: any) {
  const scenes = project.scenes || [];
  const { width } = useWindowDimensions();
  const wide = width > 900;
  const onToggle = (sid: string) => setExpanded((e: any) => ({ ...e, [sid]: !e[sid] }));
  const renderItem = ({ item: s, drag, isActive, getIndex }: any) => (
    <SceneCard scene={s} index={getIndex() ?? 0} open={!!expanded[s.id]} version={regenTicks[s.id] || 0}
      busyScene={busyScene} drag={drag} isActive={isActive} onToggle={onToggle}
      commitScene={commitScene} markUnsaved={markUnsaved} setStatus={setStatus} setImage={setImage}
      insertScene={insertScene} copyScene={copyScene} actions={actions} />
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, alignItems: "center" }}>
          <ToolBtn icon="add" label="Add Scene" onPress={addScene} testID="add-scene" primary />
          <ToolBtn icon="expand-outline" label="Expand All" onPress={expandAll} testID="expand-all" />
          <ToolBtn icon="contract-outline" label="Collapse All" onPress={collapseAll} testID="collapse-all" />
          <ToolBtn icon="download-outline" label="Export" onPress={onExport} testID="tb-export" />
          <ToolBtn icon="document-text-outline" label="Generate PDF" onPress={onPdf} testID="tb-pdf" />
        </ScrollView>
      </View>
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        <View style={{ flex: 1 }}>
          <DraggableFlatList
            data={scenes} keyExtractor={(s: any) => s.id}
            onDragEnd={({ data }: any) => onReorder(data.map((x: any, idx: number) => ({ ...x, scene_number: idx + 1 })))}
            renderItem={renderItem} activationDistance={12} containerStyle={{ flex: 1 }}
            contentContainerStyle={{ padding: S.lg, paddingBottom: 140, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}
            ListHeaderComponent={
              <View>
                {project.mock_mode ? <View style={{ marginBottom: S.md }}><MockBadge /></View> : null}
                <View style={styles.progress}>
                  <ProgStat label="Total Duration" value={totalDuration(scenes)} />
                  <View style={styles.progDiv} />
                  <ProgStat label="Total Scenes" value={String(scenes.length)} />
                  <View style={styles.progDiv} />
                  <ProgStat label="Est. Shooting" value={estShootTime(scenes)} />
                </View>
                {!wide && <SummaryPanel scenes={scenes} mobile />}
                <Body muted style={{ fontSize: 11.5, marginBottom: S.md }}>Long-press the handle to drag & reorder. Fields autosave as you type.</Body>
              </View>
            }
            ListFooterComponent={<Btn title="Add Scene at End" variant="ghost" icon="add" onPress={addScene} testID="add-scene-end" style={{ marginTop: S.md }} />}
          />
        </View>
        {wide && <ScrollView style={styles.sideCol} contentContainerStyle={{ padding: S.lg }}><SummaryPanel scenes={scenes} /></ScrollView>}
      </View>
    </View>
  );
}
function ToolBtn({ icon, label, onPress, primary, testID }: any) {
  return (
    <Pressable onPress={onPress} testID={testID} style={[styles.toolBtn, primary && { backgroundColor: C.brand, borderColor: C.brand }]}>
      <Ionicons name={icon} size={15} color={primary ? C.onBrand : C.onSurface} />
      <Text style={[styles.toolBtnText, primary && { color: C.onBrand }]}>{label}</Text>
    </Pressable>
  );
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
  kvHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  kvRow: { paddingVertical: S.sm, borderTopWidth: 1, borderTopColor: C.border, marginTop: S.sm },
  kvLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  kvVal: { color: C.onSurface, fontFamily: F.text, fontSize: 14, lineHeight: 21 },
  regenRow: { flexDirection: "row", gap: 8, marginTop: S.sm },
  regenChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6, minHeight: 30 },
  regenChipText: { color: C.brand, fontFamily: F.text, fontSize: 11.5 },
  scriptLine: { flexDirection: "row", gap: S.md, marginTop: S.sm },
  scriptTag: { color: C.brand, fontFamily: F.text, fontSize: 10, letterSpacing: 1, width: 70, paddingTop: 3 },
  budgetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.sm },
  budgetTier: { color: C.onSurface, fontFamily: F.display, fontSize: 20 },
  budgetVal: { color: C.brand, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  progress: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, marginBottom: S.md },
  progStat: { flex: 1, alignItems: "center" },
  progVal: { color: C.onSurface, fontFamily: F.display, fontSize: 22 },
  progLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 10.5, marginTop: 2, textAlign: "center" },
  progDiv: { width: 1, height: 34, backgroundColor: C.border },
  sbCard: { backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, marginBottom: S.md, overflow: "hidden" },
  sbCardActive: { borderColor: C.brand, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  sbHead: { flexDirection: "row", alignItems: "center", padding: S.md, gap: S.sm },
  dragHandle: { padding: 4 },
  sbNum: { width: 34, height: 34, borderRadius: R.sm, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  sbNumText: { color: C.brand, fontFamily: F.display, fontSize: 17 },
  sbTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 18 },
  sbMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 5 },
  sbBody: { paddingHorizontal: S.md, paddingBottom: S.md, borderTopWidth: 1, borderTopColor: C.border },
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
  iconBtn: { width: 40, height: 40, borderRadius: R.sm, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" },
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
