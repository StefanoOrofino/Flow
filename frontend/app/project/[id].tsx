import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, TextInput, useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import * as Clipboard from "expo-clipboard";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { useProjectStore } from "@/src/useProjectStore";
import AIDirector from "@/src/AIDirector";
import { useAuth } from "@/src/auth";
import { S, R, F, MAX_W, Palette, darkPalette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { useTranslation } from "react-i18next";
import { Btn, H2, Body, Badge, MockBadge, AnimIn, Picker, MultiSelect } from "@/src/components";
import * as O from "@/src/options";
import { exportPdf, exportCsv, printProject } from "@/src/exporter";
import ShotList from "@/src/ShotList";
import { Icon } from "@/src/ui/Icon";
import { Tabs as DSTabs } from "@/src/ui/DS";

// Active palette + styles for this screen. Updated at the top of the Editor
// render from useTheme(); the root view is keyed by theme so the whole subtree
// (including memoized SceneCards) remounts and re-reads these on theme change.
let C: Palette = darkPalette;
let styles: any = createStyles(darkPalette);
const statusTone = (st: string): string => ({
  "Draft": C.onSurface2, "Needs Review": C.warning, "Approved": C.brand, "Completed": C.success,
} as Record<string, string>)[st] || C.onSurface2;
const frameStatusMeta = (status: string): { c: string; i: string } => ({
  "Not Generated": { c: C.onSurface2, i: "ellipse-outline" },
  "Queued": { c: C.warning, i: "time-outline" },
  "Generating": { c: C.warning, i: "sync-outline" },
  "Completed": { c: C.success, i: "checkmark-circle-outline" },
  "Failed": { c: C.error, i: "alert-circle-outline" },
} as Record<string, { c: string; i: string }>)[status] || { c: C.onSurface2, i: "ellipse-outline" };

const TABS = ["Overview", "Storyboard", "Script", "Shot List", "Equipment", "Crew", "Schedule", "Budget", "Exports", "Settings"];
const TAB_ICONS: Record<string, string> = {
  Overview: "dashboard", Storyboard: "clapperboard", Script: "file-text", "Shot List": "list-checks",
  Equipment: "camera", Crew: "users", Schedule: "calendar", Budget: "wallet", Exports: "download", Settings: "settings",
};
const TAB_LABEL_KEYS: Record<string, string> = {
  Overview: "tabOverview", Storyboard: "tabStoryboard", Script: "tabScript", "Shot List": "tabShotList",
  Equipment: "tabEquipment", Crew: "tabCrew", Schedule: "tabSchedule", Budget: "tabBudget", Exports: "tabExports", Settings: "tabSettings",
};

const cap = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function totalDuration(scenes: any[]) {
  let sec = 0;
  scenes.forEach((s) => { const m = String(s.duration || "").match(/[\d.]+/); if (m) sec += parseFloat(m[0]); });
  return sec ? `${Math.round(sec)}s` : "—";
}

export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  C = theme.C;
  styles = useMemo(() => createStyles(C), [C]);
  const { user } = useAuth();
  const author = user?.name || user?.email || "You";
  const store = useProjectStore(id);
  const { project, loading, saveState } = store;
  const [tab, setTab] = useState("Overview");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busyScene, setBusyScene] = useState<string | null>(null);
  const [frameBusy, setFrameBusy] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [directorOpen, setDirectorOpen] = useState(false);
  const [regenAll, setRegenAll] = useState(false);
  const [regenTicks, setRegenTicks] = useState<Record<string, number>>({});

  // Undo / redo keyboard shortcuts (web)
  useEffect(() => {
    if (typeof window === "undefined" || !window.addEventListener) return;
    const onKey = (e: any) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || (e.key || "").toLowerCase() !== "z") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      e.preventDefault();
      if (e.shiftKey) store.redo(); else store.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  const persist = (data: any) => store.mutate((p: any) => ({ ...p, ...data }));
  const renum = (scenes: any[]) => scenes.map((x, i) => ({ ...x, scene_number: i + 1 }));
  const persistScenesFn = (updater: (sc: any[]) => any[]) => store.mutate((p: any) => ({ ...p, scenes: updater(p.scenes) }));
  const persistScenes = (scenes: any[]) => persistScenesFn(() => scenes);

  const blankScene = () => ({
    id: Math.random().toString(36).slice(2, 12), scene_number: 0, title: "New Scene", duration: "5s",
    location: "", time_of_day: "Day", characters: "", visual_description: "", narrative: "", subject_action: "",
    dialogue: "", voice_over: "", on_screen_text: "", shot_size: "Medium shot", camera_angle: "Eye level",
    camera_movement: "Static", focal_length: "35mm", camera_position: "", camera_height: "Eye level",
    camera_direction: "", lighting: "", color_palette: "", mood: "", props: "", wardrobe: "", sound_notes: "",
    transition: "Cut", frame_rate: "24fps", resolution: "4K", equipment: "", estimated_time: "", crew_notes: "",
    director_notes: "", production_notes: "", comments: "", ai_notes: "", image_prompt: "", image_url: "",
    status: "Draft", shots: [], comment_list: [], frames: [], active_frame_id: "",
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
  const markUnsaved = () => {};
  const expandAll = () => setExpanded(Object.fromEntries(project.scenes.map((s: any) => [s.id, true])));
  const collapseAll = () => setExpanded({});

  const bump = (sid: string) => setRegenTicks((t) => ({ ...t, [sid]: (t[sid] || 0) + 1 }));
  const regenWrap = (suffix: string, fn: any) => async (s: any) => {
    setBusyScene(s.id + suffix);
    try { store.applyServer(await fn(id, s.id)); bump(s.id); } catch {} finally { setBusyScene(null); }
  };
  const regenScene = regenWrap("", api.regenScene);
  const regenPrompt = regenWrap("-p", api.regenImagePrompt);
  const regenDialogue = regenWrap("-d", api.regenDialogue);
  const regenCamera = regenWrap("-c", api.regenCamera);
  const regenDescription = regenWrap("-desc", api.regenDescription);
  const regenVoiceOver = regenWrap("-vo", api.regenVoiceOver);
  const regenLighting = regenWrap("-l", api.regenLighting);
  const regenerateAll = async () => { setRegenAll(true); try { store.applyServer(await api.generate(id)); setTab("Overview"); } catch {} finally { setRegenAll(false); } };

  // Storyboard image frames — real Gemini Nano Banana with cost + safety controls
  const [imgInfo, setImgInfo] = useState<any>({ provider: "mock", dev_limit: 3, configured: true });
  const [frameErrors, setFrameErrors] = useState<Record<string, string>>({});
  const [confirmGen, setConfirmGen] = useState<null | (() => void)>(null);
  useEffect(() => { api.imageProvider().then(setImgInfo).catch(() => {}); }, []);

  const runFrame = async (sceneId: string, fn: () => Promise<any>) => {
    if (frameBusy) return; // only 1 active generation at a time
    setFrameBusy(sceneId);
    setFrameErrors((e) => ({ ...e, [sceneId]: "" }));
    try { store.applyServer(await fn()); }
    catch (e: any) { setFrameErrors((er) => ({ ...er, [sceneId]: e?.message || "Generation failed. Please retry." })); }
    finally { setFrameBusy(null); }
  };
  const askConfirm = (fn: () => void) => setConfirmGen(() => fn);
  const frameGenerate = (s: any, body: any) => askConfirm(() => runFrame(s.id, () => api.generateFrame(id, s.id, body)));
  const frameRegenerate = (s: any, fid: string, body: any) => askConfirm(() => runFrame(s.id, () => api.regenerateFrame(id, s.id, fid, body)));
  const frameSetActive = async (s: any, fid: string) => { try { store.applyServer(await api.setActiveFrame(id, s.id, fid)); } catch {} };
  const frameDelete = (s: any, fid: string) => runFrame(s.id, () => api.deleteFrame(id, s.id, fid));
  const remaining = Math.max(0, (imgInfo.dev_limit || 3) - (project?.image_gen_count || 0));
  const frameActions = {
    generate: frameGenerate, regenerate: frameRegenerate, setActive: frameSetActive, del: frameDelete, view: setViewer,
    busy: !!frameBusy, remaining, provider: imgInfo.provider, errorFor: (sid: string) => frameErrors[sid],
  };
  const doExport = async (fn: () => Promise<void>) => { try { await fn(); api.markExported(id).catch(() => {}); } catch (e) { console.log(e); } };

  useEffect(() => { if (!loading && !project) router.back(); }, [loading, project]);

  if (loading || !project) return <View style={styles.center}><ActivityIndicator color={C.brand} size="large" /></View>;

  const notGenerated = project.status !== "generated";

  return (
    <View key={theme.resolvedTheme} style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Header — calm, editorial, content-first */}
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <View style={styles.hTopRow}>
          <Pressable onPress={() => router.back()} testID="editor-back" hitSlop={8} style={styles.hIconBtn}>
            <Icon name="arrow-left" size={19} color={C.onSurface} />
          </Pressable>
          <Text style={styles.hKicker} numberOfLines={1}>FRAMEFLOW STUDIO</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={store.undo} disabled={!store.canUndo} testID="undo-btn" hitSlop={8} style={[styles.hIconBtn, { opacity: store.canUndo ? 1 : 0.3 }]}><Icon name="undo" size={18} color={C.onSurface} /></Pressable>
          <Pressable onPress={store.redo} disabled={!store.canRedo} testID="redo-btn" hitSlop={8} style={[styles.hIconBtn, { opacity: store.canRedo ? 1 : 0.3 }]}><Icon name="redo" size={18} color={C.onSurface} /></Pressable>
          <Pressable onPress={() => setTab("Exports")} testID="export-btn" hitSlop={8} style={styles.hIconBtn}><Icon name="share" size={18} color={C.onSurface} /></Pressable>
          <Pressable onPress={() => setDirectorOpen(true)} testID="director-open" hitSlop={8} style={styles.hDirector}><Icon name="wand" size={16} color={C.onBrand} strokeWidth={2} /></Pressable>
        </View>
        <Text style={styles.hTitle} numberOfLines={2}>{project.title}</Text>
        <View style={styles.hMetaRow}>
          <Text style={styles.hMeta} numberOfLines={1}>
            {[project.client, project.video_type].filter(Boolean).join("  ·  ") || t("editor:untitledProduction")}
            {"   ·   "}{t("editor:sceneCount", { count: project.scenes.length })} · {totalDuration(project.scenes)}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={styles.saveRow}>
            {saveState === "saving" && <><ActivityIndicator size="small" color={C.onSurface2} /><Text style={styles.hSub}>{t("editor:saving")}</Text></>}
            {saveState === "recovering" && <><ActivityIndicator size="small" color={C.warning} /><Text style={[styles.hSub, { color: C.warning }]}>{t("editor:recovering")}</Text></>}
            {saveState === "saved" && <><View style={[styles.saveDot, { backgroundColor: C.success }]} /><Text style={[styles.hSub, { color: C.success }]}>{t("editor:saved")}</Text></>}
            {saveState === "unsaved" && <><View style={styles.saveDot} /><Text style={styles.hSub}>{t("editor:unsaved")}</Text></>}
            {saveState === "offline" && <><View style={[styles.saveDot, { backgroundColor: C.warning }]} /><Text style={[styles.hSub, { color: C.warning }]}>{t("editor:offline")}</Text></>}
          </View>
        </View>
      </View>

      {/* Tabs — DS underline */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabsInner}>
          <DSTabs tabs={TABS.map((tk) => ({ key: tk, label: t(`editor:${TAB_LABEL_KEYS[tk]}`), icon: TAB_ICONS[tk] as any }))} value={tab} onChange={setTab} />
        </View>
      </View>

      {tab === "Storyboard" && !notGenerated ? (
        <StoryboardTab
          project={project} busyScene={busyScene} frameBusy={frameBusy} expanded={expanded} setExpanded={setExpanded}
          onReorder={persistScenes} addScene={addScene} regenTicks={regenTicks} author={author}
          commitScene={commitScene} markUnsaved={markUnsaved} setStatus={setStatus} setImage={setImage}
          expandAll={expandAll} collapseAll={collapseAll} insertScene={insertScene} copyScene={copyScene}
          onExport={() => doExport(() => exportCsv(project))} onPdf={() => doExport(() => exportPdf(project))}
          frameActions={frameActions}
          actions={{ dup: dupScene, del: delScene, move,
            regenScene, regenDialogue, regenCamera, regenPrompt, regenDescription, regenVoiceOver, regenLighting }}
        />
      ) : (
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingTop: S.xxl, paddingBottom: 140, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        {project.mock_mode ? <View style={{ marginBottom: S.lg }}><MockBadge /></View> : null}
        <Animated.View key={tab} entering={FadeIn.duration(240)}>
          {notGenerated && tab !== "Settings" ? (
            <View style={styles.emptyGen}>
              <View style={styles.emptyIcon}><Icon name="clapperboard" size={30} color={C.brand} strokeWidth={1.75} /></View>
              <Text style={styles.emptyTitle}>{t("editor:emptyTitle")}</Text>
              <Body muted style={{ textAlign: "center", marginTop: 8, marginBottom: S.xl, maxWidth: 340, lineHeight: 22 }}>{t("editor:emptyBody")}</Body>
              <Btn title={t("editor:generate")} icon="sparkles" loading={regenAll} onPress={regenerateAll} testID="generate-now" />
            </View>
          ) : (
            <>
              {tab === "Overview" && <Overview p={project} persist={persist} />}
              {/* Storyboard tab is rendered separately below via DraggableFlatList */}
              {tab === "Shot List" && <ShotList project={project} commitScene={commitScene} onEditInStoryboard={(sid: string) => { setTab("Storyboard"); setExpanded((e: any) => ({ ...e, [sid]: true })); }} />}
              {tab === "Script" && (
                <View>
                  {project.scenes.map((s: any, i: number) => (
                    <AnimIn key={s.id} delay={i * 40}>
                      <View style={styles.scriptScene}>
                        <View style={styles.scriptHead}>
                          <Text style={styles.scriptNum}>{String(s.scene_number).padStart(2, "0")}</Text>
                          <Text style={styles.scriptTitle} numberOfLines={1}>{(s.title || t("editor:untitledScene")).toUpperCase()}</Text>
                        </View>
                        {s.narrative ? <Body style={{ marginTop: S.sm, lineHeight: 23 }}>{s.narrative}</Body> : null}
                        {s.dialogue ? <View style={styles.scriptLine}><Text style={styles.scriptTag}>{t("editor:tagDialogue")}</Text><Body style={{ flex: 1 }}>{s.dialogue}</Body></View> : null}
                        {s.voice_over ? <View style={styles.scriptLine}><Text style={styles.scriptTag}>{t("editor:tagVO")}</Text><Body style={{ flex: 1 }}>{s.voice_over}</Body></View> : null}
                        {s.on_screen_text ? <View style={styles.scriptLine}><Text style={styles.scriptTag}>{t("editor:tagOnScreen")}</Text><Body style={{ flex: 1 }}>{s.on_screen_text}</Body></View> : null}
                      </View>
                    </AnimIn>
                  ))}
                </View>
              )}
              {tab === "Equipment" && <DefCard label={t("editor:equipmentTitle")} data={project.equipment}
                order={["camera", "lens", "drone", "gimbal", "tripod", "lighting", "audio", "accessories"]} icon="camera" />}
              {tab === "Crew" && <DefCard label={t("editor:crewTitle")} data={project.crew}
                order={["crew_size", "director", "producer", "dp", "camera_operator", "focus_puller", "gaffer", "sound", "drone_pilot", "production_assistant"]} icon="users" />}
              {tab === "Schedule" && <DefCard label={t("editor:scheduleTitle")} data={project.schedule}
                order={["recommendation", "estimated_hours", "breakdown"]} icon="calendar" />}
              {tab === "Budget" && (
                <Section label={t("editor:budgetTitle")} icon="dollar" hint={t("editor:budgetRanges")}>
                  {[["low", t("editor:budgetLow")], ["medium", t("editor:budgetMedium")], ["commercial", t("editor:budgetCommercial")], ["premium", t("editor:budgetPremium")]].map(([k, l], i) => (
                    <AnimIn key={k} delay={i * 50}>
                      <View style={[styles.budgetRow, i === 0 && { borderTopWidth: 0, marginTop: 0, paddingTop: 0 }]}>
                        <Text style={styles.budgetTier}>{l}</Text>
                        <Text style={styles.budgetVal}>{project.budget?.[k] || "—"}</Text>
                      </View>
                    </AnimIn>
                  ))}
                  {project.budget?.notes ? <Body muted style={{ marginTop: S.md, fontSize: 12.5 }}>{project.budget.notes}</Body> : null}
                </Section>
              )}
              {tab === "Exports" && (
                <Section label={t("exports:title")} icon="download" hint={project.export_count ? t("exports:exportedTimes", { count: project.export_count }) : undefined}>
                  <Body muted style={{ marginBottom: S.lg, lineHeight: 21 }}>{t("exports:desc")}</Body>
                  <ExportCard icon="file-text" title={t("exports:pdf")} sub={t("exports:pdfSub")} onPress={() => doExport(() => exportPdf(project))} testID="export-pdf" />
                  <ExportCard icon="grid" title={t("exports:csv")} sub={t("exports:csvSub")} onPress={() => doExport(() => exportCsv(project))} testID="export-csv" />
                  <ExportCard icon="printer" title={t("exports:print")} sub={t("exports:printSub")} onPress={() => doExport(() => printProject(project))} testID="export-print" />
                </Section>
              )}
              {tab === "Settings" && <SettingsTab p={project} persist={persist} onRegen={regenerateAll} regenBusy={regenAll} router={router} id={id} />}
            </>
          )}
        </Animated.View>
      </ScrollView>
      )}

      {/* Inline editing (Sprint 2) replaces the scene edit modal */}

      {/* AI Director — iterative revision panel */}
      <AIDirector visible={directorOpen} onClose={() => setDirectorOpen(false)} projectId={id}
        onApplied={(updated: any) => store.applyServer(updated)} />

      {/* Confirm real AI generation (uses credits) */}
      <Modal visible={!!confirmGen} transparent animationType="fade" onRequestClose={() => setConfirmGen(null)}>
        <View style={styles.confirmBg}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}><Ionicons name="sparkles" size={22} color={C.brand} /></View>
            <Text style={styles.confirmTitle}>Generate storyboard frame?</Text>
            <Text style={styles.confirmBody}>Generate this storyboard frame? This action uses AI credits.</Text>
            <Text style={styles.confirmMeta}>{remaining} of {imgInfo.dev_limit || 3} generations left in this project</Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.confirmCancel} onPress={() => setConfirmGen(null)} testID="gen-cancel"><Text style={styles.confirmCancelText}>Cancel</Text></Pressable>
              <Pressable style={styles.confirmOk} onPress={() => { const fn = confirmGen; setConfirmGen(null); fn && fn(); }} testID="gen-confirm"><Ionicons name="sparkles" size={15} color={C.onBrand} /><Text style={styles.confirmOkText}>Generate</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen storyboard frame viewer */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBg} onPress={() => setViewer(null)} testID="frame-viewer">
          {viewer ? <ExpoImage source={{ uri: viewer }} style={styles.viewerImg} contentFit="contain" /> : null}
          <View style={[styles.viewerClose, { top: insets.top + S.md }]}><Ionicons name="close" size={26} color="#fff" /></View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Overview({ p, persist }: any) {
  const { t } = useTranslation();
  // One-time safe migration from legacy single-select camera/lighting style.
  useEffect(() => {
    if (p.styles_migrated) return;
    const patch: any = { styles_migrated: true };
    if (!(p.camera_styles?.length) && !p.custom_camera_style && p.camera_style) patch.custom_camera_style = p.camera_style;
    if (!(p.lighting_styles?.length) && !p.custom_lighting_style && p.lighting_style) patch.custom_lighting_style = p.lighting_style;
    persist(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: string) => (v: any) => persist({ [k]: v });
  const fld = (k: string, label: string, ml?: boolean) => (
    <EditableField key={k} label={t(`overview:${label}`)} value={p[k] ?? ""} onCommit={set(k)} multiline={ml} testID={`ov-${k}`} />
  );
  const pick = (k: string, label: string, options: string[]) => (
    <Picker key={k} label={t(`overview:${label}`)} value={p[k] ?? ""} options={options} onSelect={set(k)} testID={`ov-${k}`} />
  );

  return (
    <View>
      <AnimIn>
        <Section label={t("overview:briefSection")} icon="file-text">
          {fld("title", "projectTitle")}
          {fld("client", "client")}
          {fld("campaign", "campaign")}
          {fld("goal", "objective", true)}
          {fld("target_audience", "targetAudience", true)}
          {fld("key_message", "keyMessage", true)}
          {fld("call_to_action", "callToAction")}
          {fld("references", "references", true)}
          {fld("extra_notes", "notes", true)}
        </Section>
      </AnimIn>

      <AnimIn delay={60}>
        <Section label={t("overview:creativeSection")} icon="wand">
          <MultiSelect label={t("overview:cameraStyles")} values={p.camera_styles || []} options={O.CAMERA_STYLES_MULTI}
            onChange={set("camera_styles")} custom={p.custom_camera_style || ""} onCustomChange={set("custom_camera_style")} testID="ov-camera" />
          <MultiSelect label={t("overview:lightingStyles")} values={p.lighting_styles || []} options={O.LIGHTING_STYLES_MULTI}
            onChange={set("lighting_styles")} custom={p.custom_lighting_style || ""} onCustomChange={set("custom_lighting_style")} testID="ov-lighting" />
          {pick("duration", "duration", O.DURATIONS)}
          {pick("platform", "platform", O.PLATFORMS)}
          {pick("aspect_ratio", "aspectRatio", O.ASPECT_RATIOS)}
          {pick("language", "language", O.LANGUAGES)}
          {pick("crew_size", "productionLevel", O.PRODUCTION_LEVELS)}
          {pick("visual_style", "visualStyle", O.VISUAL_STYLES)}
          {pick("mood", "mood", O.MOODS)}
          {pick("editing_style", "editingStyle", O.EDITING_STYLES)}
          {pick("music_style", "musicStyle", O.MUSIC_STYLES)}
        </Section>
      </AnimIn>

      <AnimIn delay={120}>
        <Text style={styles.refHeading}>{t("overview:referenceSection")}</Text>
        <KVCard label={t("editor:conceptLabel")} icon="bulb" data={p.concept}
          order={["title", "elevator_pitch", "main_message", "emotional_goal", "audience", "communication_objective"]} />
        <KVCard label={t("editor:treatmentLabel")} icon="wand" data={p.treatment}
          order={["visual_style", "narrative_style", "camera_language", "editing_style", "lighting_style", "color_palette", "sound_design", "overall_mood"]} />
      </AnimIn>
    </View>
  );
}

function Section({ label, icon, children, style, hint }: any) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHead}>
        {icon ? <Icon name={icon} size={15} color={C.brand} strokeWidth={2} /> : null}
        <Text style={styles.sectionLabel}>{label}</Text>
        {hint ? <><View style={{ flex: 1 }} /><Text style={styles.sectionHint}>{hint}</Text></> : null}
      </View>
      {children}
    </View>
  );
}

function KVCard({ label, data, order, icon }: any) {
  const { t } = useTranslation();
  // Legacy string support
  if (typeof data === "string") {
    if (!data) return null;
    return <Section label={label} icon={icon}><Body style={{ lineHeight: 23 }}>{data}</Body></Section>;
  }
  const keys = (order || Object.keys(data || {})).filter((k: string) => data && data[k]);
  if (keys.length === 0) return <Section label={label} icon={icon}><Body muted>{t("editor:notGenerated")}</Body></Section>;
  return (
    <Section label={label} icon={icon}>
      {keys.map((k: string, i: number) => (
        <View key={k} style={[styles.kvRow, i === 0 && { borderTopWidth: 0, marginTop: 0, paddingTop: 0 }]}>
          <Text style={styles.kvLabel}>{cap(k)}</Text>
          <Text style={styles.kvVal}>{String(data[k])}</Text>
        </View>
      ))}
    </Section>
  );
}
const DefCard = KVCard;

function RegenChip({ icon, label, busy, onPress, testID, disabled }: any) {
  return (
    <Pressable style={[styles.regenChip, disabled && { opacity: 0.4 }]} onPress={disabled ? undefined : onPress} testID={testID}>
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

const GROUPS: { title: string; fields: [string, string, boolean?][] }[] = [
  { title: "CREATIVE", fields: [["title", "Scene Title"], ["visual_description", "Visual Description", true], ["subject_action", "Action", true], ["dialogue", "Dialogue", true], ["voice_over", "Voice Over", true], ["on_screen_text", "On Screen Text"]] },
  { title: "CAMERA", fields: [["shot_size", "Shot Size"], ["camera_angle", "Camera Angle"], ["camera_movement", "Camera Movement"], ["focal_length", "Lens"], ["camera_height", "Camera Height"], ["camera_direction", "Camera Direction"]] },
  { title: "LIGHTING", fields: [["lighting", "Lighting Style", true], ["time_of_day", "Time of Day"], ["color_palette", "Color Palette"], ["mood", "Mood"]] },
  { title: "PRODUCTION", fields: [["characters", "Characters"], ["props", "Props"], ["location", "Location"], ["wardrobe", "Wardrobe"], ["sound_notes", "Audio Notes", true], ["director_notes", "Director Notes", true], ["production_notes", "Production Notes", true]] },
  { title: "AI", fields: [["image_prompt", "Image Prompt", true], ["ai_notes", "AI Notes", true]] },
];

function EditableField({ label, value, onCommit, multiline, testID }: any) {
  const [v, setV] = useState(value ?? "");
  const focused = useRef(false);
  const last = useRef(value ?? "");
  const t = useRef<any>(null);
  useEffect(() => { if (!focused.current) { setV(value ?? ""); last.current = value ?? ""; } }, [value]);
  const fire = (nv: string) => { if (nv === last.current) return; last.current = nv; onCommit(nv); };
  const change = (nv: string) => { setV(nv); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => fire(nv), 500); };
  return (
    <View style={styles.efWrap}>
      <Text style={styles.efLabel}>{label}</Text>
      <TextInput value={v} onChangeText={change} multiline={multiline} placeholder="Empty…"
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; if (t.current) clearTimeout(t.current); fire(v); }}
        placeholderTextColor={C.onSurface2} testID={testID}
        style={[styles.efInput, multiline && { minHeight: 52, textAlignVertical: "top", paddingTop: 8 }]} />
    </View>
  );
}

function StoryboardFrame({ scene, promptValue, aspect, busy, frameActions, onEditPrompt }: any) {
  const frames = scene.frames || [];
  const active = frames.find((x: any) => x.id === scene.active_frame_id) || frames[frames.length - 1] || null;
  const url = active?.image_url || "";
  const status = active?.generation_status || "Not Generated";
  const meta = frameStatusMeta(status);
  const [editing, setEditing] = useState(false);
  const ar = active?.aspect_ratio || aspect || "16:9";
  const opts = () => ({ prompt: promptValue, aspect_ratio: aspect || "16:9" });
  const errMsg = frameActions.errorFor ? frameActions.errorFor(scene.id) : "";
  const realProvider = frameActions.provider === "gemini";
  const genDisabled = frameActions.busy || (realProvider && frameActions.remaining <= 0);
  return (
    <View style={styles.frameWrap}>
      <View style={styles.frameBig}>
        {url ? <ExpoImage source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
          <><LinearGradient colors={["#201c12", "#0b0b0b"]} style={StyleSheet.absoluteFill} />
            <Ionicons name="image-outline" size={30} color={C.onSurface2} />
            <Text style={styles.frameHint}>No storyboard frame yet</Text></>
        )}
        <View style={[styles.framePill, { borderColor: meta.c }]}>
          <Ionicons name={meta.i as any} size={11} color={meta.c} />
          <Text style={[styles.framePillText, { color: meta.c }]}>{status}</Text>
        </View>
        {busy && <View style={styles.frameLoading}><ActivityIndicator color={C.brand} /><Text style={styles.frameLoadingText}>Generating…</Text></View>}
        {url ? <Pressable style={styles.frameExpand} onPress={() => frameActions.view(url)} testID={`frame-view-${scene.scene_number}`}><Ionicons name="expand-outline" size={16} color="#fff" /></Pressable> : null}
      </View>

      {active && (
        <View style={styles.frameMeta}>
          <Text style={styles.frameMetaText}>Version {active.version} · {ar} · {active.provider === "mock" ? "SIMULATED" : (active.provider || "—")}{active.created_at ? ` · ${new Date(active.created_at).toLocaleDateString()}` : ""}</Text>
          {active.style_preset ? <Text style={styles.frameMetaText}>Style: {active.style_preset}</Text> : null}
          {active.error_message ? <Text style={[styles.frameMetaText, { color: C.error }]}>{active.error_message}</Text> : null}
        </View>
      )}

      {frames.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
          {frames.map((fr: any) => (
            <Pressable key={fr.id} onPress={() => frameActions.setActive(scene, fr.id)}
              style={[styles.versionChip, fr.id === (scene.active_frame_id || active?.id) && styles.versionChipActive]} testID={`frame-v-${scene.scene_number}-${fr.version}`}>
              <Text style={[styles.versionChipText, fr.id === (scene.active_frame_id || active?.id) && { color: C.brand }]}>v{fr.version}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {editing ? (
        <EditableField label="Image Prompt" value={promptValue} onCommit={onEditPrompt} multiline testID={`frame-prompt-${scene.scene_number}`} />
      ) : (
        <Text style={styles.framePrompt} numberOfLines={2}>{promptValue || "No image prompt yet — regenerate it in the AI section."}</Text>
      )}

      {errMsg ? (
        <View style={styles.frameError}><Ionicons name="alert-circle" size={14} color={C.error} /><Text style={styles.frameErrorText}>{errMsg}</Text></View>
      ) : null}

      <View style={styles.rowBetween}>
        <Text style={styles.frameQuota}>{realProvider ? `${frameActions.remaining} AI generation${frameActions.remaining === 1 ? "" : "s"} left` : "Simulated (mock) mode"}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 6 }}>
        <RegenChip icon="sparkles-outline" label={frames.length ? "New Version" : "Generate Frame"} busy={busy} disabled={genDisabled} onPress={() => frameActions.generate(scene, opts())} testID={`frame-generate-${scene.scene_number}`} />
        <RegenChip icon="refresh" label="Regenerate" disabled={genDisabled} onPress={() => active ? frameActions.regenerate(scene, active.id, opts()) : frameActions.generate(scene, opts())} testID={`frame-regenerate-${scene.scene_number}`} />
        <RegenChip icon="swap-horizontal-outline" label="Replace" disabled={genDisabled} onPress={() => frameActions.generate(scene, opts())} testID={`frame-replace-${scene.scene_number}`} />
        <RegenChip icon="create-outline" label="Edit Prompt" onPress={() => setEditing((e) => !e)} testID={`frame-edit-${scene.scene_number}`} />
        {active ? <RegenChip icon="trash-outline" label="Remove" disabled={frameActions.busy} onPress={() => frameActions.del(scene, active.id)} testID={`frame-remove-${scene.scene_number}`} /> : null}
        {url ? <RegenChip icon="expand-outline" label="Full Screen" onPress={() => frameActions.view(url)} testID={`frame-full-${scene.scene_number}`} /> : null}
      </ScrollView>
    </View>
  );
}

const rid = () => Math.random().toString(36).slice(2, 10);
function CommentsPanel({ scene, author, onChange }: any) {
  const list: any[] = scene.comment_list || [];
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const openList = list.filter((c) => c.status !== "Resolved");
  const resolvedList = list.filter((c) => c.status === "Resolved");
  const nowIso = () => new Date().toISOString();
  const add = () => {
    const t = text.trim(); if (!t) return;
    onChange([...list, { id: rid(), text: t, author, created_at: nowIso(), updated_at: nowIso(), status: "Open" }]);
    setText("");
  };
  const patch = (cid: string, p: any) => onChange(list.map((c) => (c.id === cid ? { ...c, ...p, updated_at: nowIso() } : c)));
  const del = (cid: string) => onChange(list.filter((c) => c.id !== cid));
  const saveEdit = () => { if (editId) patch(editId, { text: editText.trim() }); setEditId(null); setEditText(""); };
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

  const Row = ({ c }: any) => {
    const mine = c.author === author;
    const resolved = c.status === "Resolved";
    if (editId === c.id) {
      return (
        <View style={styles.commentCard}>
          <TextInput value={editText} onChangeText={setEditText} multiline autoFocus
            placeholderTextColor={C.onSurface2} style={[styles.efInput, { minHeight: 44, textAlignVertical: "top", paddingTop: 8 }]} testID={`comment-edit-input-${c.id}`} />
          <View style={styles.commentBtns}>
            <RegenChip icon="checkmark" label="Save" onPress={saveEdit} testID={`comment-save-${c.id}`} />
            <RegenChip icon="close" label="Cancel" onPress={() => { setEditId(null); setEditText(""); }} />
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.commentCard, resolved && { opacity: 0.7 }]} testID={`comment-${c.id}`}>
        <View style={styles.commentTop}>
          <Text style={styles.commentAuthor}>{c.author}</Text>
          <Text style={styles.commentTime}>{fmt(c.created_at)}</Text>
          <View style={[styles.commentStatus, { borderColor: resolved ? C.success : C.warning }]}>
            <Text style={[styles.commentStatusText, { color: resolved ? C.success : C.warning }]}>{resolved ? "Resolved" : "Open"}</Text>
          </View>
        </View>
        <Text style={styles.commentText}>{c.text}</Text>
        <View style={styles.commentBtns}>
          <RegenChip icon={resolved ? "arrow-undo-outline" : "checkmark-done-outline"} label={resolved ? "Reopen" : "Resolve"} onPress={() => patch(c.id, { status: resolved ? "Open" : "Resolved" })} testID={`comment-toggle-${c.id}`} />
          {mine && <RegenChip icon="create-outline" label="Edit" onPress={() => { setEditId(c.id); setEditText(c.text); }} testID={`comment-editbtn-${c.id}`} />}
          {mine && <RegenChip icon="trash-outline" label="Delete" onPress={() => del(c.id)} testID={`comment-delete-${c.id}`} />}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.commentsWrap}>
      <View style={styles.rowBetween}>
        <Text style={styles.groupTitle}>COMMENTS</Text>
        <Text style={styles.commentTime}>{openList.length} open</Text>
      </View>
      {openList.map((c) => <Row key={c.id} c={c} />)}
      <View style={styles.commentInputRow}>
        <TextInput value={text} onChangeText={setText} multiline placeholder="Add an internal note (not shown in exports)…"
          placeholderTextColor={C.onSurface2} style={[styles.efInput, { flex: 1, minHeight: 44, textAlignVertical: "top", paddingTop: 8 }]} testID={`comment-input-${scene.scene_number}`} />
        <Pressable style={styles.commentSend} onPress={add} testID={`comment-add-${scene.scene_number}`}><Ionicons name="send" size={16} color={C.onBrand} /></Pressable>
      </View>
      {resolvedList.length > 0 && (
        <>
          <Pressable style={styles.miniRow} onPress={() => setShowResolved((v) => !v)} testID={`comment-toggle-resolved-${scene.scene_number}`}>
            <Ionicons name={showResolved ? "chevron-up" : "chevron-down"} size={14} color={C.brand} />
            <Text style={styles.miniLink}>{showResolved ? "Hide" : "Show"} {resolvedList.length} resolved</Text>
          </Pressable>
          {showResolved && resolvedList.map((c) => <Row key={c.id} c={c} />)}
        </>
      )}
    </View>
  );
}

function SceneThumb({ scene, large }: any) {
  const frames = scene.frames || [];
  const active = frames.find((x: any) => x.id === scene.active_frame_id) || frames[frames.length - 1] || null;
  const url = active?.image_url || "";
  return (
    <View style={[styles.sbThumb, large && styles.sbThumbLarge]}>
      {url ? (
        <ExpoImage source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <>
          <LinearGradient colors={["#241E13", "#12100C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Ionicons name="film-outline" size={large ? 26 : 20} color={C.onSurface3} />
        </>
      )}
      <View style={styles.sbThumbNum}><Text style={styles.sbThumbNumText}>{scene.scene_number}</Text></View>
      {url ? (
        <View style={styles.sbThumbStatus}><Ionicons name="checkmark" size={10} color="#0C0C0E" /></View>
      ) : null}
      {frames.length > 1 ? (
        <View style={styles.sbThumbCount}><Ionicons name="copy-outline" size={9} color="#F5F1E8" /><Text style={styles.sbThumbCountText}>{frames.length}</Text></View>
      ) : null}
    </View>
  );
}

const SceneCard = React.memo(function SceneCard({ scene, index, open, version, busyScene, frameBusy, drag, isActive,
  onToggle, commitScene, markUnsaved, setStatus, setImage, insertScene, copyScene, actions, frameActions, aspect, author }: any) {
  const f = scene; // single source of truth — read straight from the scene prop (reflects undo/redo & two-way sync)
  const commit = (k: string) => (v: string) => commitScene(scene.id, { [k]: v });
  return (
    <ScaleDecorator>
      <View style={[styles.sbCard, isActive && styles.sbCardActive, open && styles.sbCardOpen]} testID={`scene-card-${index}`}>
        <Pressable style={styles.sbHead} onPress={() => onToggle(scene.id)} testID={`toggle-${index}`}>
          <Pressable onLongPress={drag} delayLongPress={140} style={styles.dragHandle} testID={`drag-${index}`}>
            <Ionicons name="reorder-three-outline" size={20} color={C.onSurface3} />
          </Pressable>
          <SceneThumb scene={scene} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sbTitle} numberOfLines={1}>{f.title || "Untitled scene"}</Text>
            <View style={styles.sbMetaRow}>
              <Chip>{f.duration || "—"}</Chip><Chip>{f.shot_size || "—"}</Chip>{f.location ? <Chip>{f.location}</Chip> : null}
            </View>
            <View style={[styles.statusBadge, { borderColor: statusTone(f.status), alignSelf: "flex-start", marginTop: 6 }]}>
              <View style={[styles.statusDot, { backgroundColor: statusTone(f.status) }]} />
              <Text style={[styles.statusText, { color: statusTone(f.status) }]}>{f.status || "Draft"}</Text>
            </View>
          </View>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.onSurface2} />
        </Pressable>

        {open && (
          <View style={styles.sbBody}>
            <StoryboardFrame scene={scene} promptValue={scene.image_prompt} aspect={aspect} busy={frameBusy}
              frameActions={frameActions} onEditPrompt={commit("image_prompt")} />

            <Text style={styles.efLabel}>Status</Text>
            <View style={styles.statusRow}>
              {STATUSES.map((st) => (
                <Pressable key={st} onPress={() => setStatus(scene, st)}
                  style={[styles.statusChip, f.status === st && { borderColor: statusTone(st), backgroundColor: C.brandTint }]} testID={`status-${index}-${st}`}>
                  <Text style={[styles.statusChipText, f.status === st && { color: statusTone(st) }]}>{st}</Text>
                </Pressable>
              ))}
            </View>

            {GROUPS.map((g) => (
              <View key={g.title} style={styles.group}>
                <Text style={styles.groupTitle}>{g.title}</Text>
                {g.fields.map(([k, l, ml]) => (
                  <EditableField key={k} label={l} value={scene[k]} onCommit={commit(k)} multiline={ml} testID={`ef-${k}-${index}`} />
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

            <CommentsPanel scene={scene} author={author}
              onChange={(list: any[]) => commitScene(scene.id, { comment_list: list })} />

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
  const lenses = Array.from(new Set(scenes.map((s: any) => (s.focal_length || "").trim()).filter(Boolean)));
  const moves = Array.from(new Set(scenes.map((s: any) => (s.camera_movement || "").trim()).filter(Boolean)));
  const totalShots = scenes.reduce((n: number, s: any) => n + Math.max(1, (s.shots || []).length), 0);
  const done = scenes.filter((s: any) => s.status === "Approved" || s.status === "Completed").length;
  const pct = scenes.length ? Math.round((done / scenes.length) * 100) : 0;
  return (
    <View style={[styles.summary, mobile ? styles.summaryMobile : styles.summaryDesktop]}>
      <Text style={styles.secLabel}>SUMMARY</Text>
      <SumRow label="Total Scenes" value={String(scenes.length)} />
      <SumRow label="Total Shots" value={String(totalShots)} />
      <SumRow label="Estimated Runtime" value={totalDuration(scenes)} />
      <SumRow label="Est. Shooting Time" value={estShootTime(scenes)} />
      <SumRow label="Locations" value={String(locations.length)} />
      <SumRow label="Characters" value={String(chars.length)} />
      <SumRow label="Lenses Used" value={String(lenses.length)} />
      <SumRow label="Camera Movements" value={String(moves.length)} />
      <View style={{ marginTop: S.sm }}>
        <View style={styles.rowBetween}><Text style={styles.sumLabel}>Completion</Text><Text style={styles.sumVal}>{pct}%</Text></View>
        <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
      </View>
    </View>
  );
}
function SumRow({ label, value }: any) { return <View style={styles.rowBetween}><Text style={styles.sumLabel}>{label}</Text><Text style={styles.sumVal}>{value}</Text></View>; }

function StoryboardTab({ project, busyScene, frameBusy, expanded, setExpanded, onReorder, addScene, regenTicks, author,
  commitScene, markUnsaved, setStatus, setImage, expandAll, collapseAll, insertScene, copyScene, onExport, onPdf, actions, frameActions }: any) {
  const scenes = project.scenes || [];
  const { width } = useWindowDimensions();
  const wide = width > 900;
  const onToggle = (sid: string) => setExpanded((e: any) => ({ ...e, [sid]: !e[sid] }));
  const renderItem = ({ item: s, drag, isActive, getIndex }: any) => (
    <SceneCard scene={s} index={getIndex() ?? 0} open={!!expanded[s.id]} version={regenTicks[s.id] || 0}
      busyScene={busyScene} frameBusy={frameBusy === s.id} drag={drag} isActive={isActive} onToggle={onToggle}
      commitScene={commitScene} markUnsaved={markUnsaved} setStatus={setStatus} setImage={setImage}
      insertScene={insertScene} copyScene={copyScene} actions={actions} frameActions={frameActions}
      aspect={project.aspect_ratio} author={author} />
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
          <View style={[styles.toolBtn, { opacity: 0.4 }]} testID="tb-generate-all">
            <Ionicons name="images-outline" size={16} color={C.onSurface2} />
            <Text style={[styles.toolBtnText, { color: C.onSurface2 }]}>Generate All Frames</Text>
            <View style={styles.soonPill}><Text style={styles.soonText}>SOON</Text></View>
          </View>
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
    <Pressable style={({ pressed }) => [styles.exportCard, pressed && { backgroundColor: C.surface3 }]} onPress={onPress} testID={testID}>
      <View style={styles.exportIcon}><Icon name={icon} size={19} color={C.brand} strokeWidth={1.9} /></View>
      <View style={{ flex: 1 }}><Text style={styles.exportTitle}>{title}</Text><Body muted style={{ fontSize: 12.5, marginTop: 2 }}>{sub}</Body></View>
      <Icon name="chevron-right" size={18} color={C.onSurface2} />
    </Pressable>
  );
}
function SettingsTab({ p, persist, onRegen, regenBusy, router, id }: any) {
  const [del, setDel] = useState(false);
  const { t } = useTranslation();
  return (
    <View>
      <Section label={t("editor:setProject")} icon="film">
        <SetRow label={t("editor:setStatus")} value={p.status === "generated" ? t("editor:statusGenerated") : t("editor:statusDraft")} first />
        <SetRow label={t("editor:setScenes")} value={String(p.scenes?.length || 0)} />
        <SetRow label={t("editor:setExports")} value={String(p.export_count || 0)} />
      </Section>
      <Section label={t("editor:setActions")} icon="settings">
        <View style={{ gap: S.sm }}>
          <Btn title={p.favorite ? t("editor:removeFav") : t("editor:addFav")} variant="ghost" icon={p.favorite ? "star" : "star-outline"} onPress={() => persist({ favorite: !p.favorite })} testID="set-fav" />
          <Btn title={p.archived ? t("editor:unarchive") : t("editor:archive")} variant="ghost" icon={p.archived ? "arrow-undo-outline" : "archive-outline"} onPress={() => persist({ archived: !p.archived })} testID="set-archive" />
          <Btn title={t("editor:regenAll")} variant="ghost" icon="sparkles-outline" loading={regenBusy} onPress={onRegen} testID="set-regen" />
          <Btn title={t("editor:deleteProject")} icon="trash-outline" onPress={() => setDel(true)} testID="set-delete" style={{ backgroundColor: C.error }} />
        </View>
      </Section>
      <Modal visible={del} transparent animationType="fade" onRequestClose={() => setDel(false)}>
        <View style={styles.modalBg}><View style={styles.centerSheet}>
          <Text style={styles.sheetTitle}>{t("editor:deleteTitle")}</Text>
          <Body muted style={{ marginBottom: S.lg }}>{t("editor:deleteBody")}</Body>
          <Btn title={t("common:delete")} style={{ backgroundColor: C.error, marginBottom: S.sm }} onPress={async () => { await api.deleteProject(id); router.replace("/projects"); }} testID="set-confirm-delete" />
          <Btn title={t("common:cancel")} variant="ghost" onPress={() => setDel(false)} />
        </View></View>
      </Modal>
    </View>
  );
}
function SetRow({ label, value, first }: any) { return <View style={[styles.dRow, first && { borderTopWidth: 0 }]}><Text style={styles.dLabel}>{label}</Text><Text style={styles.dVal}>{value}</Text></View>; }

function createStyles(C: Palette) { return StyleSheet.create({
  center: { flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: S.xl, paddingBottom: S.lg, backgroundColor: C.surface },
  hTopRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginBottom: S.lg },
  hKicker: { color: C.onSurface3, fontFamily: F.text, fontSize: 10.5, letterSpacing: 2.5, fontWeight: "600", marginLeft: 2 },
  hIconBtn: { width: 38, height: 38, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
  hDirector: { width: 38, height: 38, borderRadius: R.md, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  hTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.5, fontWeight: "500" },
  hMetaRow: { flexDirection: "row", alignItems: "center", marginTop: S.sm },
  hMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, flexShrink: 1 },
  hSub: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  saveRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: S.md },
  saveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.warning },
  unsavedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.warning },
  tabsWrap: { backgroundColor: C.surface },
  tabsInner: { maxWidth: MAX_W, width: "100%", alignSelf: "center", paddingHorizontal: S.xl },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, flexShrink: 0 },
  tabActive: { backgroundColor: C.surface3 },
  tabText: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5, fontWeight: "500" },

  // Editorial sections — typography-led, minimal chrome
  section: { marginBottom: S.xxl },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10, marginBottom: S.lg },
  sectionLabel: { color: C.brand, fontFamily: F.text, fontSize: 11.5, letterSpacing: 1.6, fontWeight: "600", textTransform: "uppercase" },
  sectionHint: { color: C.onSurface3, fontFamily: F.text, fontSize: 11.5 },
  refHeading: { color: C.onSurface, fontFamily: F.display, fontSize: 22, letterSpacing: -0.2, marginBottom: S.lg, marginTop: S.sm },

  card: { backgroundColor: C.surface2, borderRadius: R.lg, padding: S.lg, marginBottom: S.md },
  secLabel: { color: C.brand, fontFamily: F.text, fontSize: 11.5, letterSpacing: 1.4 },
  kvHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  kvRow: { paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.border, marginTop: S.md },
  kvLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  kvVal: { color: C.onSurface, fontFamily: F.text, fontSize: 14.5, lineHeight: 22 },
  regenRow: { flexDirection: "row", gap: 8, marginTop: S.sm },
  regenChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6, minHeight: 30 },
  regenChipText: { color: C.brand, fontFamily: F.text, fontSize: 11.5 },

  // Script — screenplay feel
  scriptScene: { marginBottom: S.xl, paddingBottom: S.xl, borderBottomWidth: 1, borderBottomColor: C.border },
  scriptHead: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  scriptNum: { color: C.brand, fontFamily: F.display, fontSize: 24, letterSpacing: 0 },
  scriptTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 12.5, letterSpacing: 1.5, fontWeight: "600", flex: 1 },
  scriptLine: { flexDirection: "row", gap: S.md, marginTop: S.md },
  scriptTag: { color: C.brand, fontFamily: F.text, fontSize: 10, letterSpacing: 1, width: 70, paddingTop: 3 },

  budgetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.border, paddingTop: S.md, marginTop: S.md },
  budgetTier: { color: C.onSurface, fontFamily: F.display, fontSize: 20 },
  budgetVal: { color: C.brand, fontFamily: F.text, fontSize: 15, fontWeight: "600" },
  progress: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, marginBottom: S.md },
  progStat: { flex: 1, alignItems: "center" },
  progVal: { color: C.onSurface, fontFamily: F.display, fontSize: 22 },
  progLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 10.5, marginTop: 2, textAlign: "center" },
  progDiv: { width: 1, height: 34, backgroundColor: C.border },
  sbCard: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, marginBottom: S.md, overflow: "hidden" },
  sbCardActive: { borderColor: C.brand, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  sbCardOpen: { borderColor: C.borderStrong },
  sbHead: { flexDirection: "row", alignItems: "center", padding: S.md, gap: S.md },
  dragHandle: { padding: 4 },
  sbThumb: { width: 116, height: 66, borderRadius: R.sm, overflow: "hidden", backgroundColor: C.surface3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  sbThumbLarge: { width: "100%", height: undefined, aspectRatio: 16 / 9, borderRadius: R.md },
  sbThumbNum: { position: "absolute", top: 4, left: 4, backgroundColor: "rgba(0,0,0,0.62)", borderRadius: R.sm, minWidth: 20, height: 18, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  sbThumbNumText: { color: "#F5F1E8", fontFamily: F.display, fontSize: 12.5, fontWeight: "600" },
  sbThumbStatus: { position: "absolute", bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.success, alignItems: "center", justifyContent: "center" },
  sbThumbCount: { position: "absolute", top: 4, right: 4, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(0,0,0,0.62)", borderRadius: R.pill, paddingHorizontal: 5, height: 16, justifyContent: "center" },
  sbThumbCountText: { color: "#F5F1E8", fontFamily: F.text, fontSize: 9.5, fontWeight: "600" },
  sbTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 19, letterSpacing: -0.2 },
  sbMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 },
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
  dRow: { flexDirection: "row", paddingVertical: S.md, borderTopWidth: 1, borderTopColor: C.border },
  dLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5, width: 130 },
  dVal: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, flex: 1, fontWeight: "500" },
  emptyGen: { alignItems: "center", paddingVertical: S.xxxl, paddingHorizontal: S.xl, marginTop: S.xxl },
  emptyTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 27, letterSpacing: -0.3, marginTop: S.xl, textAlign: "center" },
  emptyIcon: { width: 76, height: 76, borderRadius: 22, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  exportCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.md, padding: S.lg, marginBottom: S.sm, gap: S.md },
  exportIcon: { width: 44, height: 44, borderRadius: R.md, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  exportTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "500" },
  modalBg: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", padding: S.xl },
  centerSheet: { backgroundColor: C.surface2, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.borderStrong, maxWidth: 420, width: "100%", alignSelf: "center" },
  sheetTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 21, marginBottom: S.md },

  // Editable fields
  efWrap: { marginBottom: S.sm },
  efLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, marginTop: 6 },
  efInput: { backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, color: C.onSurface, fontFamily: F.text, fontSize: 13.5, paddingHorizontal: 10, paddingVertical: 8, minHeight: 40 },
  group: { marginTop: S.md, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.border },
  groupTitle: { color: C.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 1.4, marginBottom: 4 },

  // Status
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 4 },
  statusChip: { borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  statusChipText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: F.text, fontSize: 10.5 },

  // Storyboard frame
  frameWrap: { marginBottom: S.md },
  frameBig: { width: "100%", aspectRatio: 16 / 9, borderRadius: R.md, overflow: "hidden", backgroundColor: C.surface3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  frameHint: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, marginTop: 6 },
  framePill: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  framePillText: { fontFamily: F.text, fontSize: 10.5 },
  frameLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  frameLoadingText: { color: C.brand, fontFamily: F.text, fontSize: 12, marginTop: 6 },
  frameExpand: { position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  frameMeta: { marginTop: 6 },
  frameMetaText: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, lineHeight: 16 },
  versionChip: { borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.surface },
  versionChipActive: { borderColor: C.brand, backgroundColor: C.brandTint },
  versionChipText: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5 },
  framePrompt: { color: C.onSurface3, fontFamily: F.text, fontSize: 12, marginTop: 6, lineHeight: 17, fontStyle: "italic" },

  // Comments
  commentsWrap: { marginTop: S.md, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.border },
  commentCard: { backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, padding: S.sm, marginTop: 6 },
  commentTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentAuthor: { color: C.onSurface, fontFamily: F.text, fontSize: 12.5, fontWeight: "600" },
  commentTime: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, flex: 1 },
  commentStatus: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 },
  commentStatusText: { fontFamily: F.text, fontSize: 10 },
  commentText: { color: C.onSurface, fontFamily: F.text, fontSize: 13, lineHeight: 19 },
  commentBtns: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  commentInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 8 },
  commentSend: { width: 40, height: 40, borderRadius: R.sm, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },

  // Shot list table
  syncNote: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, marginBottom: S.md },
  tableScroll: { borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2 },
  tRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 10, paddingHorizontal: S.sm },
  tHead: { backgroundColor: C.surface3, borderTopLeftRadius: R.md, borderTopRightRadius: R.md },
  tRowAlt: { backgroundColor: C.surface },
  tHeadCell: { color: C.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 0.6, paddingHorizontal: 6, textTransform: "uppercase" },
  tCell: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, paddingHorizontal: 6 },
  tEdit: { width: 56, alignItems: "center", justifyContent: "center" },

  // Toolbar
  toolbar: { paddingHorizontal: S.lg, paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface2 },
  toolBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.surface },
  toolBtnText: { color: C.onSurface, fontFamily: F.text, fontSize: 12.5, fontWeight: "500" },

  // Summary panel
  sideCol: { width: 300, borderLeftWidth: 1, borderLeftColor: C.border, backgroundColor: C.surface2 },
  summary: { backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  summaryMobile: { marginBottom: S.md },
  summaryDesktop: {},
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sumLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, paddingVertical: 6 },
  sumVal: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "600" },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.surface3, marginTop: 6, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.brand },

  // Fullscreen viewer
  viewerBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  viewerImg: { width: "100%", height: "80%" },
  viewerClose: { position: "absolute", right: S.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  // Confirm generation modal
  confirmBg: { flex: 1, backgroundColor: C.overlay, alignItems: "center", justifyContent: "center", padding: S.xl },
  confirmCard: { width: "100%", maxWidth: 380, backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.borderStrong, padding: S.xl, alignItems: "center" },
  confirmIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.md },
  confirmTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 19, marginBottom: 6, textAlign: "center" },
  confirmBody: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5, textAlign: "center", lineHeight: 20 },
  confirmMeta: { color: C.brand, fontFamily: F.text, fontSize: 12, marginTop: 10, marginBottom: S.lg },
  confirmRow: { flexDirection: "row", gap: S.sm, width: "100%" },
  confirmCancel: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingVertical: 12, alignItems: "center" },
  confirmCancelText: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "500" },
  confirmOk: { flex: 1, flexDirection: "row", gap: 6, backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  confirmOkText: { color: C.onBrand, fontFamily: F.text, fontSize: 14, fontWeight: "600" },

  // Frame error + quota
  frameError: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.errorTint, borderWidth: 1, borderColor: C.error, borderRadius: R.sm, padding: 8, marginTop: 8 },
  frameErrorText: { color: C.error, fontFamily: F.text, fontSize: 12, flex: 1 },
  frameQuota: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, marginTop: 8 },
  soonPill: { backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  soonText: { color: C.onSurface2, fontFamily: F.text, fontSize: 8.5, letterSpacing: 0.5 },
}); }
