import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, Modal, TextInput } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CoverArt } from "@/src/ui/CoverArt";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/LanguageProvider";
import { H1, Body, Btn, Badge, AnimIn, Skeleton, EmptyState } from "@/src/components";

const FILTERS = [
  { k: "All", tk: "filterAll" }, { k: "Favorites", tk: "filterFavorites" },
  { k: "Drafts", tk: "filterDrafts" }, { k: "Generated", tk: "filterGenerated" }, { k: "Archived", tk: "filterArchived" },
];
const SORTS = [{ k: "recent", tk: "sortRecent" }, { k: "name", tk: "sortName" }, { k: "status", tk: "sortStatus" }];

function rel(s: string | undefined, locale: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export default function Projects() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage === "it" ? "it-IT" : "en-US";
  const styles = useMemo(() => createStyles(C), [C]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("recent");
  const [menuFor, setMenuFor] = useState<any>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [renaming, setRenaming] = useState<any>(null);
  const [renameVal, setRenameVal] = useState("");

  const load = useCallback(async () => {
    try { setProjects(await api.listProjects()); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patch = async (p: any, data: any) => {
    setProjects((l) => l.map((x) => (x.id === p.id ? { ...x, ...data } : x)));
    try { await api.updateProject(p.id, data); } catch { load(); }
  };
  const duplicate = async (p: any) => { setMenuFor(null); await api.duplicateProject(p.id); load(); };
  const del = async () => { const p = confirmDel; setConfirmDel(null); await api.deleteProject(p.id); load(); };
  const doRename = async () => { const p = renaming; setRenaming(null); await patch(p, { title: renameVal.trim() || p.title }); };

  const list = useMemo(() => {
    let l = [...projects];
    if (filter === "Archived") l = l.filter((p) => p.archived);
    else { l = l.filter((p) => !p.archived);
      if (filter === "Favorites") l = l.filter((p) => p.favorite);
      if (filter === "Drafts") l = l.filter((p) => p.status !== "generated");
      if (filter === "Generated") l = l.filter((p) => p.status === "generated");
    }
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((p) => (p.title + " " + (p.client || "") + " " + p.video_type).toLowerCase().includes(s)); }
    if (sort === "name") l.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "status") l.sort((a, b) => (b.status || "").localeCompare(a.status || ""));
    else l.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    return l;
  }, [projects, q, filter, sort]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.lg }]}>
        <H1>{t("projects:title")}</H1>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={C.onSurface2} />
          <TextInput value={q} onChangeText={setQ} placeholder={t("projects:searchPlaceholder")} placeholderTextColor={C.onSurface2} style={styles.searchInput} testID="search-input" />
          {q ? <Pressable onPress={() => setQ("")}><Ionicons name="close-circle" size={16} color={C.onSurface2} /></Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingVertical: S.sm }}>
          {FILTERS.map((ff) => (
            <Pressable key={ff.k} onPress={() => setFilter(ff.k)} style={[styles.chip, filter === ff.k && styles.chipActive]} testID={`filter-${ff.k}`}>
              <Text style={[styles.chipText, filter === ff.k && { color: C.onBrand }]}>{t(`projects:${ff.tk}`)}</Text>
            </Pressable>
          ))}
          <View style={styles.sortDivider} />
          {SORTS.map((so) => (
            <Pressable key={so.k} onPress={() => setSort(so.k)} style={[styles.chip, sort === so.k && styles.chipSort]} testID={`sort-${so.k}`}>
              <Ionicons name="swap-vertical" size={12} color={sort === so.k ? C.brand : C.onSurface2} />
              <Text style={[styles.chipText, { marginLeft: 4 }, sort === so.k && { color: C.brand }]}>{t(`projects:${so.tk}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.brand} />}>
        {loading ? (
          <View style={{ gap: S.md }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={84} radius={16} />)}</View>
        ) : list.length === 0 ? (
          <EmptyState icon="folder-open-outline" title={q || filter !== "All" ? t("projects:noMatches") : t("projects:noProjects")}
            subtitle={q || filter !== "All" ? t("projects:noMatchesSub") : t("projects:noProjectsSub")}
            actionLabel={q || filter !== "All" ? undefined : t("projects:create")} onAction={() => router.push("/new")} testID="projects-empty" />
        ) : (
          list.map((p, i) => (
            <AnimIn key={p.id} delay={i * 40}>
              <View style={styles.card}>
                <Pressable style={styles.thumb} onPress={() => router.push(`/project/${p.id}`)}>
                  <CoverArt imageUrl={p.scenes?.[0]?.image_url} iconSize={20} />
                </Pressable>
                <Pressable style={{ flex: 1 }} onPress={() => router.push(`/project/${p.id}`)} testID={`open-${p.id}`}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.title} numberOfLines={1}>{p.title}</Text>
                    {p.favorite ? <Ionicons name="star" size={14} color={C.brand} /> : null}
                  </View>
                  <Body muted numberOfLines={1} style={{ fontSize: 12.5, marginTop: 2 }}>{(p.client || t("projects:noClient")) + " · " + p.video_type + " · " + p.duration}</Body>
                  <View style={styles.metaRow}>
                    <Badge label={p.archived ? t("projects:statusArchived") : p.status === "generated" ? t("projects:statusGenerated") : t("projects:statusDraft")} tone={p.status === "generated" && !p.archived ? "success" : "default"} />
                    <Text style={styles.meta}>{rel(p.updated_at, locale)} · {t("projects:scenesCount", { count: p.scenes?.length || 0 })}</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => setMenuFor(p)} style={styles.menuBtn} testID={`menu-${p.id}`} hitSlop={8}><Ionicons name="ellipsis-vertical" size={18} color={C.onSurface2} /></Pressable>
              </View>
            </AnimIn>
          ))
        )}
      </ScrollView>

      {/* Actions menu */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <Pressable style={styles.modalBg} onPress={() => setMenuFor(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{menuFor?.title}</Text>
            <Act icon="create-outline" label={t("projects:openEditor")} onPress={() => { const p = menuFor; setMenuFor(null); router.push(`/project/${p.id}`); }} />
            <Act icon={menuFor?.favorite ? "star" : "star-outline"} label={menuFor?.favorite ? t("projects:removeFavorite") : t("projects:addFavorite")} onPress={() => { patch(menuFor, { favorite: !menuFor.favorite }); setMenuFor(null); }} testID="fav-action" />
            <Act icon="pencil-outline" label={t("projects:rename")} onPress={() => { const p = menuFor; setMenuFor(null); setRenameVal(p.title); setRenaming(p); }} testID="rename-action" />
            <Act icon="copy-outline" label={t("common:duplicate")} onPress={() => duplicate(menuFor)} testID="dup-action" />
            <Act icon={menuFor?.archived ? "arrow-undo-outline" : "archive-outline"} label={menuFor?.archived ? t("projects:unarchive") : t("projects:archive")} onPress={() => { patch(menuFor, { archived: !menuFor.archived }); setMenuFor(null); }} testID="archive-action" />
            <Act icon="trash-outline" label={t("common:delete")} color={C.error} onPress={() => { const p = menuFor; setMenuFor(null); setConfirmDel(p); }} testID="del-action" />
          </View>
        </Pressable>
      </Modal>

      {/* Rename */}
      <Modal visible={!!renaming} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={styles.modalBg}>
          <View style={styles.centerSheet}>
            <Text style={styles.sheetTitle}>{t("projects:renameTitle")}</Text>
            <TextInput value={renameVal} onChangeText={setRenameVal} style={styles.renameInput} autoFocus testID="rename-input" />
            <Btn title={t("common:save")} onPress={doRename} testID="rename-save" style={{ marginTop: S.md, marginBottom: S.sm }} />
            <Btn title={t("common:cancel")} variant="ghost" onPress={() => setRenaming(null)} />
          </View>
        </View>
      </Modal>

      {/* Delete */}
      <Modal visible={!!confirmDel} transparent animationType="fade" onRequestClose={() => setConfirmDel(null)}>
        <View style={styles.modalBg}>
          <View style={styles.centerSheet}>
            <Text style={styles.sheetTitle}>{t("projects:deleteTitle")}</Text>
            <Body muted style={{ marginBottom: S.lg }}>{t("projects:deleteBody", { title: confirmDel?.title })}</Body>
            <Btn title={t("common:delete")} onPress={del} testID="confirm-delete" style={{ backgroundColor: C.error, marginBottom: S.sm }} />
            <Btn title={t("common:cancel")} variant="ghost" onPress={() => setConfirmDel(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Act({ icon, label, onPress, color, testID }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <Pressable style={styles.action} onPress={onPress} testID={testID}>
      <Ionicons name={icon} size={18} color={color || C.onSurface} />
      <Text style={[styles.actionText, color && { color }]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { paddingHorizontal: S.lg, paddingBottom: S.xs, borderBottomWidth: 1, borderBottomColor: C.border },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.md, marginTop: S.md, gap: S.sm },
  searchInput: { flex: 1, color: C.onSurface, fontFamily: F.text, fontSize: 14, paddingVertical: 11 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 0 },
  chipActive: { backgroundColor: C.brand, borderColor: C.brand },
  chipSort: { borderColor: C.brand },
  chipText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, fontWeight: "500" },
  sortDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 4, marginVertical: 6 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, marginBottom: S.md, gap: S.md },
  thumb: { width: 54, height: 54, borderRadius: R.sm, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: C.onSurface, fontFamily: F.display, fontSize: 19, flex: 1, marginRight: S.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.sm },
  meta: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5 },
  menuBtn: { padding: S.sm },
  modalBg: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", padding: S.xl },
  sheet: { backgroundColor: C.surface2, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.borderStrong, maxWidth: 420, width: "100%", alignSelf: "center" },
  centerSheet: { backgroundColor: C.surface2, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.borderStrong, maxWidth: 420, width: "100%", alignSelf: "center" },
  sheetTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 21, marginBottom: S.md },
  action: { flexDirection: "row", alignItems: "center", paddingVertical: S.md, gap: S.md },
  actionText: { color: C.onSurface, fontFamily: F.text, fontSize: 15 },
  renameInput: { backgroundColor: C.surface3, borderRadius: R.md, borderWidth: 1, borderColor: C.border, color: C.onSurface, fontFamily: F.text, fontSize: 15, padding: S.md },
});
