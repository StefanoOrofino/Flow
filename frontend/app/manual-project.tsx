import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { Field, Picker, Btn, H1, H2, Body } from "@/src/components";
import * as O from "@/src/options";

const STEPS = ["Project", "Video", "Creative", "Advanced", "Review"];

export default function ManualProject() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const params = useLocalSearchParams<any>();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [f, setF] = useState<any>({
    title: params.title || "", client: "", campaign: "", goal: "", target_audience: "", brand: "", language: "English",
    video_type: params.video_type || "Commercial", platform: params.platform || "YouTube",
    duration: params.duration || "30 seconds", aspect_ratio: params.aspect_ratio || "16:9",
    crew_size: params.crew_size || "Small professional crew", budget: "", location_type: "", num_actors: "",
    num_scenes: params.num_scenes ? Number(params.num_scenes) : 5,
    mood: params.mood || "Premium", visual_style: params.visual_style || "Cinematic",
    camera_style: "Steady & composed", lighting_style: "Natural", editing_style: "Rhythmic",
    music_style: "Ambient score", director_references: "", film_references: "",
    deliverables: "", special_requests: "", restrictions: "", extra_notes: "",
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const next = () => {
    setErr("");
    if (step === 0 && !f.title.trim()) return setErr("Project title is required.");
    if (step < 4) setStep(step + 1);
  };
  const back = () => (step > 0 ? setStep(step - 1) : router.back());

  const generate = async () => {
    setErr(""); setBusy(true);
    try {
      const p = await api.createProject(f);
      const gen = await api.generate(p.id);
      router.replace(`/project/${gen.id}`);
    } catch (e: any) { setErr(e.message || "Generation failed. Please try again."); setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <Pressable onPress={back} testID="wizard-back" hitSlop={10}><Ionicons name="arrow-back" size={22} color={C.onSurface} /></Pressable>
        <Text style={styles.stepLabel}>Step {step + 1} of 5 · {STEPS[step]}</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.progress}>
        {STEPS.map((_, i) => <View key={i} style={[styles.pBar, { backgroundColor: i <= step ? C.brand : C.surface3 }]} />)}
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 150, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}
        <Animated.View key={step} entering={FadeIn.duration(260)}>
          {step === 0 && (<>
            <H1 style={{ marginBottom: 4 }}>Project</H1>
            <Body muted style={{ marginBottom: S.lg }}>The essentials of your production.</Body>
            <Field label="Project title *" value={f.title} onChangeText={(v: string) => set("title", v)} placeholder="e.g. Aurora Skincare Launch" testID="in-title" />
            <Field label="Client" value={f.client} onChangeText={(v: string) => set("client", v)} placeholder="Client name" testID="in-client" />
            <Field label="Campaign" value={f.campaign} onChangeText={(v: string) => set("campaign", v)} placeholder="Campaign name" />
            <Field label="Goal" value={f.goal} onChangeText={(v: string) => set("goal", v)} placeholder="What should this video achieve?" multiline testID="in-goal" />
            <Field label="Audience" value={f.target_audience} onChangeText={(v: string) => set("target_audience", v)} placeholder="Who is it for?" />
            <Field label="Brand" value={f.brand} onChangeText={(v: string) => set("brand", v)} placeholder="Brand / tone of voice" />
            <Field label="Language" value={f.language} onChangeText={(v: string) => set("language", v)} placeholder="English" />
          </>)}

          {step === 1 && (<>
            <H1 style={{ marginBottom: 4 }}>Video</H1>
            <Body muted style={{ marginBottom: S.lg }}>Format and logistics.</Body>
            <Picker label="Video type" value={f.video_type} options={O.VIDEO_TYPES} onSelect={(v: string) => set("video_type", v)} testID="in-vtype" />
            <Picker label="Platform" value={f.platform} options={O.PLATFORMS} onSelect={(v: string) => set("platform", v)} testID="in-platform" />
            <Picker label="Duration" value={f.duration} options={O.DURATIONS} onSelect={(v: string) => set("duration", v)} testID="in-duration" />
            <Picker label="Aspect ratio" value={f.aspect_ratio} options={O.ASPECT_RATIOS} onSelect={(v: string) => set("aspect_ratio", v)} testID="in-aspect" />
            <Picker label="Crew size" value={f.crew_size} options={O.CREW_SIZES} onSelect={(v: string) => set("crew_size", v)} testID="in-crew" />
            <Field label="Budget" value={f.budget} onChangeText={(v: string) => set("budget", v)} placeholder="e.g. $20k, indie, high-end" />
            <Field label="Location" value={f.location_type} onChangeText={(v: string) => set("location_type", v)} placeholder="e.g. Studio, outdoor city" />
            <Field label="Actors / subjects" value={f.num_actors} onChangeText={(v: string) => set("num_actors", v)} placeholder="e.g. 2 presenters" />
            <Field label="Number of scenes" value={String(f.num_scenes)} onChangeText={(v: string) => set("num_scenes", Math.max(1, Math.min(20, Number(v.replace(/[^0-9]/g, "")) || 1)))} keyboardType="number-pad" testID="in-scenes" />
          </>)}

          {step === 2 && (<>
            <H1 style={{ marginBottom: 4 }}>Creative Direction</H1>
            <Body muted style={{ marginBottom: S.lg }}>Define the look and feel.</Body>
            <Picker label="Mood" value={f.mood} options={O.MOODS} onSelect={(v: string) => set("mood", v)} testID="in-mood" />
            <Picker label="Visual style" value={f.visual_style} options={O.VISUAL_STYLES} onSelect={(v: string) => set("visual_style", v)} testID="in-style" />
            <Picker label="Camera style" value={f.camera_style} options={O.CAMERA_STYLES} onSelect={(v: string) => set("camera_style", v)} />
            <Picker label="Lighting style" value={f.lighting_style} options={O.LIGHTING_STYLES} onSelect={(v: string) => set("lighting_style", v)} />
            <Picker label="Editing style" value={f.editing_style} options={O.EDITING_STYLES} onSelect={(v: string) => set("editing_style", v)} />
            <Picker label="Music style" value={f.music_style} options={O.MUSIC_STYLES} onSelect={(v: string) => set("music_style", v)} />
            <Field label="Director references" value={f.director_references} onChangeText={(v: string) => set("director_references", v)} placeholder="e.g. Fincher, Chazelle" multiline />
            <Field label="Film references" value={f.film_references} onChangeText={(v: string) => set("film_references", v)} placeholder="Films / campaigns for inspiration" multiline />
          </>)}

          {step === 3 && (<>
            <H1 style={{ marginBottom: 4 }}>Advanced</H1>
            <Body muted style={{ marginBottom: S.lg }}>Deliverables and constraints.</Body>
            <Field label="Deliverables" value={f.deliverables} onChangeText={(v: string) => set("deliverables", v)} placeholder="e.g. 1x master + 3 cutdowns" multiline />
            <Field label="Special requests" value={f.special_requests} onChangeText={(v: string) => set("special_requests", v)} placeholder="Anything specific to include" multiline />
            <Field label="Restrictions" value={f.restrictions} onChangeText={(v: string) => set("restrictions", v)} placeholder="Legal, brand or content limits" multiline />
            <Field label="Extra notes" value={f.extra_notes} onChangeText={(v: string) => set("extra_notes", v)} placeholder="Anything else for the director" multiline />
          </>)}

          {step === 4 && (<>
            <H1 style={{ marginBottom: 4 }}>Review</H1>
            <Body muted style={{ marginBottom: S.lg }}>Review your brief — tap Edit on any section.</Body>
            {[
              { t: "Project", s: 0, rows: [["Title", f.title], ["Client", f.client], ["Campaign", f.campaign], ["Goal", f.goal], ["Audience", f.target_audience], ["Brand", f.brand], ["Language", f.language]] },
              { t: "Video", s: 1, rows: [["Type", f.video_type], ["Platform", f.platform], ["Duration", f.duration], ["Aspect", f.aspect_ratio], ["Crew", f.crew_size], ["Budget", f.budget], ["Location", f.location_type], ["Actors", f.num_actors], ["Scenes", String(f.num_scenes)]] },
              { t: "Creative", s: 2, rows: [["Mood", f.mood], ["Visual", f.visual_style], ["Camera", f.camera_style], ["Lighting", f.lighting_style], ["Editing", f.editing_style], ["Music", f.music_style], ["Director refs", f.director_references], ["Film refs", f.film_references]] },
              { t: "Advanced", s: 3, rows: [["Deliverables", f.deliverables], ["Special requests", f.special_requests], ["Restrictions", f.restrictions], ["Notes", f.extra_notes]] },
            ].map((sec) => (
              <View key={sec.t} style={styles.reviewCard}>
                <View style={styles.rowBetween}><H2>{sec.t}</H2><Pressable onPress={() => setStep(sec.s)}><Text style={styles.edit}>Edit</Text></Pressable></View>
                {sec.rows.filter((r) => r[1]).map((r) => (
                  <View key={r[0]} style={styles.reviewRow}><Text style={styles.rLabel}>{r[0]}</Text><Text style={styles.rVal}>{r[1]}</Text></View>
                ))}
              </View>
            ))}
          </>)}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ padding: S.lg, paddingBottom: insets.bottom + S.md, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
          {step < 4
            ? <Btn title="Continue" icon="arrow-forward" onPress={next} testID="wizard-continue" />
            : <Btn title="Generate Storyboard" icon="sparkles" onPress={generate} loading={busy} testID="generate-btn" />}
        </View>
      </View>

      <Modal visible={busy} transparent animationType="fade">
        <View style={styles.genOverlay}>
          <Ionicons name="film-outline" size={40} color={C.brand} />
          <H2 style={{ marginTop: S.lg }}>Directing your storyboard…</H2>
          <Body muted style={{ marginTop: 4, textAlign: "center" }}>Building concept, treatment, script, scenes and shot list. This can take up to a minute.</Body>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingBottom: S.md },
  stepLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 13 },
  progress: { flexDirection: "row", paddingHorizontal: S.xl, gap: 6, marginBottom: S.sm },
  pBar: { flex: 1, height: 3, borderRadius: 2 },
  errBox: { backgroundColor: C.errorTint, borderWidth: 1, borderColor: C.error, borderRadius: 10, padding: S.md, marginBottom: S.lg },
  errText: { color: C.onErrorTint, fontFamily: F.text, fontSize: 13 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface2, borderTopWidth: 1, borderTopColor: C.border },
  reviewCard: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.md },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.sm },
  edit: { color: C.brand, fontFamily: F.text, fontSize: 14 },
  reviewRow: { flexDirection: "row", paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border },
  rLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, width: 120 },
  rVal: { color: C.onSurface, fontFamily: F.text, fontSize: 13, flex: 1 },
  genOverlay: { flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", padding: S.xxl },
});
