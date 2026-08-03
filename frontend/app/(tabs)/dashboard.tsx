import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, useWindowDimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { C, S, R, F, MAX_W } from "@/src/theme";
import { H1, H2, Body, StatCard, Skeleton, AnimIn, Badge } from "@/src/components";

const HERO = "https://images.unsplash.com/photo-1608186336271-53313eeaf864?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBjYW1lcmElMjBsZW5zJTIwZGFya3xlbnwwfHx8fDE3ODU3NjIxNDZ8MA&ixlib=rb-4.1.0&q=85";

function rel(s?: string) {
  if (!s) return "—";
  const d = new Date(s).getTime(); const diff = Date.now() - d;
  const m = Math.floor(diff / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`;
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width > 760;
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ps, ts] = await Promise.all([api.listProjects(), api.templates()]);
      setProjects(ps); setTemplates(ts);
    } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleFav = async (p: any) => {
    setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, favorite: !x.favorite } : x)));
    try { await api.updateProject(p.id, { favorite: !p.favorite }); } catch { load(); }
  };

  const active = projects.filter((p) => !p.archived);
  const generated = active.filter((p) => p.status === "generated").length;
  const scenesTotal = active.reduce((n, p) => n + (p.scenes?.length || 0), 0);
  const exports = active.reduce((n, p) => n + (p.export_count || 0), 0);
  const drafts = active.filter((p) => p.status !== "generated");
  const recent = active.slice(0, 5);
  const lastActivity = active[0]?.updated_at;

  const useTemplate = (t: any) => router.push({ pathname: "/new", params: {
    title: t.name, video_type: t.video_type, platform: t.platform, duration: t.duration,
    aspect_ratio: t.aspect_ratio, num_scenes: String(t.num_scenes), crew_size: t.crew_size,
    visual_style: t.visual_style, mood: t.mood } });

  const quicks = [
    { icon: "add", label: "New Project", sub: "Start a brief", to: "/new" },
    { icon: "albums-outline", label: "Templates", sub: "Proven formats", to: "/templates" },
    { icon: "folder-outline", label: "My Projects", sub: `${active.length} total`, to: "/projects" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ paddingBottom: S.xxxl }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.brand} />}>
      {/* Hero */}
      <View style={styles.hero}>
        <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(10,10,10,0.55)", "rgba(10,10,10,0.97)"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.heroInner, { paddingTop: insets.top + S.xl }]}>
          <Text style={styles.kicker}>FRAMEFLOW STUDIO</Text>
          <H1 style={{ marginTop: S.sm }}>Welcome back, {user?.name?.split(" ")[0] || "Director"}</H1>
          <Body muted style={{ marginTop: 4 }}>Your creative operating system for video production.</Body>
        </View>
      </View>

      <View style={styles.container}>
        {/* Stats */}
        <View style={[styles.statsRow, wide && { flexWrap: "nowrap" }]}>
          <StatCard icon="film-outline" value={active.length} label="Projects" delay={0} />
          <StatCard icon="sparkles-outline" value={generated} label="Generated" delay={50} />
          <StatCard icon="images-outline" value={scenesTotal} label="Scenes" delay={100} />
          <StatCard icon="download-outline" value={exports} label="Exports" delay={150} />
        </View>
        <AnimIn delay={180}><Body muted style={{ marginTop: S.sm, fontSize: 12.5 }}>Last activity {rel(lastActivity)}</Body></AnimIn>

        {/* Quick actions */}
        <H2 style={styles.secTitle}>Quick Actions</H2>
        <View style={styles.quickRow}>
          {quicks.map((q, i) => (
            <AnimIn key={q.label} delay={i * 60} style={{ flex: 1 }}>
              <Pressable style={styles.quick} onPress={() => router.push(q.to as any)} testID={`quick-${q.label}`}>
                <View style={styles.quickIcon}><Ionicons name={q.icon as any} size={18} color={C.brand} /></View>
                <Text style={styles.quickLabel}>{q.label}</Text>
                <Text style={styles.quickSub}>{q.sub}</Text>
              </Pressable>
            </AnimIn>
          ))}
        </View>

        {/* Continue working */}
        {drafts.length > 0 && (
          <>
            <H2 style={styles.secTitle}>Continue Working</H2>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingRight: S.lg }}>
              {drafts.map((p) => (
                <Pressable key={p.id} style={styles.contCard} onPress={() => router.push(`/project/${p.id}`)} testID={`continue-${p.id}`}>
                  <Ionicons name="document-text-outline" size={20} color={C.onSurface2} />
                  <Text style={styles.contTitle} numberOfLines={2}>{p.title}</Text>
                  <Badge label="Draft" />
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* Recent projects */}
        <View style={styles.secHead}>
          <H2>Recent Projects</H2>
          {active.length > 0 && <Pressable onPress={() => router.push("/projects")}><Text style={styles.viewAll}>View all</Text></Pressable>}
        </View>

        {loading ? (
          <View style={{ gap: S.md }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={78} radius={16} />)}</View>
        ) : active.length === 0 ? (
          <AnimIn style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="videocam-outline" size={28} color={C.brand} /></View>
            <H2 style={{ marginTop: S.md }}>No productions yet</H2>
            <Body muted style={{ textAlign: "center", marginTop: 4, marginBottom: S.lg }}>Turn a creative brief into a full storyboard, script and shot list.</Body>
            <Pressable style={styles.cta} onPress={() => router.push("/new")} testID="create-storyboard-btn">
              <Ionicons name="add" size={18} color={C.onBrand} /><Text style={styles.ctaText}>Create your first project</Text>
            </Pressable>
          </AnimIn>
        ) : (
          recent.map((p, i) => (
            <AnimIn key={p.id} delay={i * 50}>
              <Pressable style={styles.projCard} onPress={() => router.push(`/project/${p.id}`)} testID={`project-${p.id}`}>
                <View style={styles.thumb}>
                  <LinearGradient colors={["#242015", "#0e0e0e"]} style={StyleSheet.absoluteFill} />
                  <Ionicons name="film-outline" size={20} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projTitle} numberOfLines={1}>{p.title}</Text>
                  <Body muted numberOfLines={1} style={{ fontSize: 12.5, marginTop: 2 }}>{(p.client || "No client") + " · " + p.video_type}</Body>
                  <Text style={styles.meta}>{rel(p.updated_at)} · {(p.scenes?.length || 0)} scenes</Text>
                </View>
                <Pressable onPress={() => toggleFav(p)} hitSlop={10} style={{ padding: 6 }} testID={`fav-${p.id}`}>
                  <Ionicons name={p.favorite ? "star" : "star-outline"} size={18} color={p.favorite ? C.brand : C.onSurface2} />
                </Pressable>
              </Pressable>
            </AnimIn>
          ))
        )}

        {/* Templates strip */}
        {templates.length > 0 && (
          <>
            <View style={styles.secHead}><H2>Templates</H2><Pressable onPress={() => router.push("/templates")}><Text style={styles.viewAll}>Browse</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingRight: S.lg }}>
              {templates.slice(0, 8).map((t) => (
                <Pressable key={t.id} style={styles.tplCard} onPress={() => useTemplate(t)} testID={`tpl-${t.id}`}>
                  <View style={styles.tplIcon}><Ionicons name="albums-outline" size={18} color={C.brand} /></View>
                  <Text style={styles.tplTitle} numberOfLines={2}>{t.name}</Text>
                  <Text style={styles.tplMeta}>{t.duration} · {t.num_scenes} scenes</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 210, overflow: "hidden" },
  heroInner: { padding: S.xl, paddingBottom: S.xl },
  kicker: { color: C.brand, fontFamily: F.text, fontSize: 11.5, letterSpacing: 3.5, fontWeight: "600" },
  container: { padding: S.lg, maxWidth: MAX_W, alignSelf: "center", width: "100%" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: S.md, marginTop: -40 },
  secTitle: { marginTop: S.xl, marginBottom: S.md },
  secHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.xl, marginBottom: S.md },
  viewAll: { color: C.brand, fontFamily: F.text, fontSize: 14 },
  quickRow: { flexDirection: "row", gap: S.md },
  quick: { backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md },
  quickIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.sm },
  quickLabel: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "500" },
  quickSub: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginTop: 2 },
  contCard: { width: 170, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, gap: S.sm, alignItems: "flex-start" },
  contTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 18, minHeight: 46 },
  empty: { alignItems: "center", backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xxl },
  emptyIcon: { width: 60, height: 60, borderRadius: R.lg, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  cta: { flexDirection: "row", alignItems: "center", backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 13, paddingHorizontal: S.lg },
  ctaText: { color: C.onBrand, fontFamily: F.text, fontSize: 15, fontWeight: "600", marginLeft: 6 },
  projCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, marginBottom: S.md, gap: S.md },
  thumb: { width: 52, height: 52, borderRadius: R.sm, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  projTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 19 },
  meta: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginTop: 4 },
  tplCard: { width: 150, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, gap: 6 },
  tplIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  tplTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "500", minHeight: 36 },
  tplMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 11 },
});
