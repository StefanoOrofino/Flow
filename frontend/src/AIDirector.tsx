import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, S, R, F } from "@/src/theme";
import { api } from "@/src/api";

const SCOPES: [string, string][] = [
  ["project", "Whole Project"], ["storyboard", "Storyboard"], ["script", "Script"], ["dialogue", "Dialogue"],
  ["shotlist", "Shot List"], ["camera", "Camera"], ["lighting", "Lighting"], ["prompts", "Image Prompts"],
];
const QUICK: [string, string, string][] = [
  ["Improve Story", "Improve the overall story and narrative arc", "project"],
  ["Improve Dialogue", "Make the dialogue more natural and human", "dialogue"],
  ["Improve Visual Style", "Elevate the visual style and cinematography", "storyboard"],
  ["Improve Pacing", "Improve the pacing and rhythm across the scenes", "project"],
  ["Improve Cinematography", "Improve the camera language and cinematography", "camera"],
  ["Simplify Script", "Simplify and tighten the script", "script"],
  ["Increase Emotion", "Increase the emotional impact of the piece", "project"],
  ["Luxury Style", "Transform the style into a premium luxury commercial", "storyboard"],
  ["Apple Style", "Transform the style to feel like an Apple commercial — minimal, elegant, product-hero", "storyboard"],
  ["Nike Style", "Transform the style to feel like a Nike commercial — bold, energetic, motivational", "storyboard"],
  ["Documentary Style", "Transform into an authentic documentary style", "storyboard"],
  ["Premium Commercial", "Make it feel like a premium high-end commercial", "storyboard"],
];

export default function AIDirector({ visible, onClose, projectId, onApplied }: any) {
  const { width } = useWindowDimensions();
  const wide = width > 900;
  const [scope, setScope] = useState("project");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const loadVersions = useCallback(() => { api.listVersions(projectId).then(setVersions).catch(() => {}); }, [projectId]);
  useEffect(() => { if (visible) loadVersions(); }, [visible, loadVersions]);

  if (!visible) return null;

  const run = async (text: string, sc: string) => {
    const instr = (text || "").trim();
    if (!instr || loading) return;
    setInstruction(instr); setScope(sc); setLoading(true); setError(""); setResult(null);
    try { setResult(await api.directorRevise(projectId, instr, sc)); }
    catch (e: any) { setError(e?.message || "The AI Director could not complete this revision."); }
    finally { setLoading(false); }
  };
  const apply = async () => {
    if (!result || applying) return;
    setApplying(true);
    try {
      const updated = await api.directorApply(projectId, result.preview, result.summary || instruction);
      onApplied?.(updated);
      setResult(null); setInstruction(""); loadVersions();
    } catch (e: any) { setError(e?.message || "Could not apply changes."); }
    finally { setApplying(false); }
  };
  const restore = async (vid: string) => { try { onApplied?.(await api.restoreVersion(projectId, vid)); loadVersions(); } catch {} };
  const del = async (vid: string) => { try { await api.deleteVersion(projectId, vid); loadVersions(); } catch {} };
  const saveRename = async (vid: string) => { try { await api.renameVersion(projectId, vid, renameText.trim() || "Untitled"); } catch {} setRenaming(null); loadVersions(); };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="director-backdrop" />
      <View style={[styles.panel, { width: wide ? 440 : "100%" }]}>
        <View style={styles.head}>
          <View style={styles.headIcon}><Ionicons name="sparkles" size={16} color={C.brand} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>AI Director</Text>
            <Text style={styles.sub}>Iterative creative revisions — no chat</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} testID="director-close"><Ionicons name="close" size={22} color={C.onSurface} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 60 }}>
          {/* Scope */}
          <Text style={styles.label}>APPLY TO</Text>
          <View style={styles.chipsWrap}>
            {SCOPES.map(([v, l]) => (
              <Pressable key={v} onPress={() => setScope(v)} style={[styles.chip, scope === v && styles.chipOn]} testID={`scope-${v}`}>
                <Text style={[styles.chipText, scope === v && { color: C.brand }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          {/* Instruction */}
          <Text style={styles.label}>INSTRUCTION</Text>
          <TextInput value={instruction} onChangeText={setInstruction} multiline
            placeholder="Tell the AI Director what you want to improve..." placeholderTextColor={C.onSurface2}
            style={styles.input} testID="director-input" />
          <Pressable style={[styles.askBtn, loading && { opacity: 0.6 }]} onPress={() => run(instruction, scope)} disabled={loading} testID="director-ask">
            {loading ? <ActivityIndicator color={C.onBrand} size="small" /> : <Ionicons name="sparkles" size={16} color={C.onBrand} />}
            <Text style={styles.askText}>{loading ? "Directing…" : "Ask AI Director"}</Text>
          </Pressable>

          {/* Quick actions */}
          <Text style={styles.label}>QUICK ACTIONS</Text>
          <View style={styles.chipsWrap}>
            {QUICK.map(([l, instr, sc]) => (
              <Pressable key={l} onPress={() => run(instr, sc)} style={styles.quick} testID={`quick-${l.replace(/\s+/g, "-").toLowerCase()}`}>
                <Text style={styles.quickText}>{l}</Text>
              </Pressable>
            ))}
          </View>

          {error ? <View style={styles.errBox}><Ionicons name="alert-circle" size={15} color={C.error} /><Text style={styles.errText}>{error}</Text></View> : null}

          {/* Change plan + preview */}
          {result && (
            <View style={styles.result} testID="director-result">
              <Text style={styles.resultTitle}>CHANGE PLAN</Text>
              <Text style={styles.summary}>{result.summary}</Text>
              {(result.plan || []).map((p: any, i: number) => (
                <View key={i} style={styles.planRow}>
                  <Ionicons name="checkmark-circle" size={15} color={C.success} />
                  <Text style={styles.planSection}>{p.section}</Text>
                  <Text style={styles.planStatus}>{p.status}</Text>
                </View>
              ))}
              <View style={styles.metaRow}>
                <Text style={styles.metaChip}>{(result.diff || []).length} field{(result.diff || []).length !== 1 ? "s" : ""} changed</Text>
                {result.runtime_delta ? <Text style={styles.metaChip}>Runtime {result.runtime_delta}</Text> : null}
              </View>

              <Pressable style={styles.diffToggle} onPress={() => setShowDiff((v) => !v)} testID="director-diff-toggle">
                <Ionicons name={showDiff ? "chevron-up" : "chevron-down"} size={14} color={C.brand} />
                <Text style={styles.diffToggleText}>{showDiff ? "Hide" : "Review"} changes (Old → New)</Text>
              </Pressable>
              {showDiff && (result.diff || []).map((d: any, i: number) => (
                <View key={i} style={styles.diff} testID={`diff-${i}`}>
                  <Text style={styles.diffLabel}>{d.label}</Text>
                  <Text style={styles.diffOld} numberOfLines={4}>{d.old || "—"}</Text>
                  <View style={styles.diffArrow}><Ionicons name="arrow-down" size={12} color={C.brand} /></View>
                  <Text style={styles.diffNew} numberOfLines={4}>{d.new || "—"}</Text>
                </View>
              ))}

              <View style={styles.applyRow}>
                <Pressable style={styles.discard} onPress={() => setResult(null)} testID="director-discard"><Text style={styles.discardText}>Discard</Text></Pressable>
                <Pressable style={[styles.apply, applying && { opacity: 0.6 }]} onPress={apply} disabled={applying} testID="director-apply">
                  {applying ? <ActivityIndicator color={C.onBrand} size="small" /> : <Ionicons name="checkmark" size={16} color={C.onBrand} />}
                  <Text style={styles.applyText}>Apply Changes</Text>
                </Pressable>
              </View>
              <Text style={styles.previewNote}>Preview only — nothing is saved until you apply. Applying creates a restorable version.</Text>
            </View>
          )}

          {/* Version history */}
          <Pressable style={styles.verHead} onPress={() => setShowVersions((v) => !v)} testID="director-versions-toggle">
            <Ionicons name="git-branch-outline" size={15} color={C.brand} />
            <Text style={styles.verHeadText}>Version History ({versions.length})</Text>
            <Ionicons name={showVersions ? "chevron-up" : "chevron-down"} size={15} color={C.onSurface2} />
          </Pressable>
          {showVersions && (versions.length === 0
            ? <Text style={styles.verEmpty}>No versions yet. Apply an AI revision to create one.</Text>
            : versions.map((v) => (
              <View key={v.id} style={styles.verCard} testID={`version-${v.id}`}>
                {renaming === v.id ? (
                  <View style={{ flex: 1 }}>
                    <TextInput value={renameText} onChangeText={setRenameText} autoFocus style={styles.verRenameInput} testID={`version-rename-input-${v.id}`} />
                    <View style={styles.verBtns}>
                      <Pressable style={styles.verBtn} onPress={() => saveRename(v.id)} testID={`version-rename-save-${v.id}`}><Text style={styles.verBtnText}>Save</Text></Pressable>
                      <Pressable style={styles.verBtn} onPress={() => setRenaming(null)}><Text style={styles.verBtnText}>Cancel</Text></Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verName} numberOfLines={1}>{v.name}</Text>
                      <Text style={styles.verDate}>{new Date(v.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
                    </View>
                    <Pressable style={styles.verIcon} onPress={() => restore(v.id)} testID={`version-restore-${v.id}`}><Ionicons name="arrow-undo-outline" size={16} color={C.brand} /></Pressable>
                    <Pressable style={styles.verIcon} onPress={() => { setRenaming(v.id); setRenameText(v.name); }} testID={`version-rename-${v.id}`}><Ionicons name="create-outline" size={16} color={C.onSurface2} /></Pressable>
                    <Pressable style={styles.verIcon} onPress={() => del(v.id)} testID={`version-delete-${v.id}`}><Ionicons name="trash-outline" size={16} color={C.error} /></Pressable>
                  </>
                )}
              </View>
            )))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: "row", justifyContent: "flex-end", zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  panel: { height: "100%", backgroundColor: C.surface, borderLeftWidth: 1, borderLeftColor: C.borderStrong },
  head: { flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.lg, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface2 },
  headIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  title: { color: C.onSurface, fontFamily: F.display, fontSize: 18 },
  sub: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5 },
  label: { color: C.brand, fontFamily: F.text, fontSize: 10.5, letterSpacing: 1.2, marginTop: S.md, marginBottom: 6 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.surface2 },
  chipOn: { borderColor: C.brand, backgroundColor: C.brandTint },
  chipText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  input: { backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, color: C.onSurface, fontFamily: F.text, fontSize: 14, padding: 12, minHeight: 76, textAlignVertical: "top" },
  askBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 13, marginTop: 10 },
  askText: { color: C.onBrand, fontFamily: F.text, fontSize: 14.5, fontWeight: "600" },
  quick: { borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: C.surface2 },
  quickText: { color: C.onSurface, fontFamily: F.text, fontSize: 12 },
  errBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(139,43,43,0.12)", borderWidth: 1, borderColor: C.error, borderRadius: R.sm, padding: 10, marginTop: S.md },
  errText: { color: C.error, fontFamily: F.text, fontSize: 12.5, flex: 1 },
  result: { marginTop: S.lg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, padding: S.md, backgroundColor: C.surface2 },
  resultTitle: { color: C.brand, fontFamily: F.text, fontSize: 10.5, letterSpacing: 1.2, marginBottom: 4 },
  summary: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, lineHeight: 19, marginBottom: 10 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  planSection: { color: C.onSurface, fontFamily: F.text, fontSize: 13, flex: 1 },
  planStatus: { color: C.success, fontFamily: F.text, fontSize: 12 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  metaChip: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3 },
  diffToggle: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12 },
  diffToggleText: { color: C.brand, fontFamily: F.text, fontSize: 12.5 },
  diff: { marginTop: 8, borderLeftWidth: 2, borderLeftColor: C.brand, paddingLeft: 10 },
  diffLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 3 },
  diffOld: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, textDecorationLine: "line-through", opacity: 0.7 },
  diffArrow: { paddingVertical: 2 },
  diffNew: { color: C.onSurface, fontFamily: F.text, fontSize: 12.5 },
  applyRow: { flexDirection: "row", gap: S.sm, marginTop: S.md },
  discard: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingVertical: 12, alignItems: "center" },
  discardText: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "500" },
  apply: { flex: 1.4, flexDirection: "row", gap: 6, backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  applyText: { color: C.onBrand, fontFamily: F.text, fontSize: 13.5, fontWeight: "600" },
  previewNote: { color: C.onSurface2, fontFamily: F.text, fontSize: 10.5, marginTop: 8, lineHeight: 15 },
  verHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: S.xl, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.border },
  verHeadText: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "600", flex: 1 },
  verEmpty: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, marginTop: 8 },
  verCard: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface2, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, padding: S.sm, marginTop: 6 },
  verName: { color: C.onSurface, fontFamily: F.text, fontSize: 13 },
  verDate: { color: C.onSurface2, fontFamily: F.text, fontSize: 10.5 },
  verIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  verRenameInput: { backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.brand, color: C.onSurface, fontFamily: F.text, fontSize: 13, paddingHorizontal: 8, paddingVertical: 6 },
  verBtns: { flexDirection: "row", gap: 6, marginTop: 6 },
  verBtn: { borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 5 },
  verBtnText: { color: C.onSurface, fontFamily: F.text, fontSize: 12 },
});
