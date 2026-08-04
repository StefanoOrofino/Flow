import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, useWindowDimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/LanguageProvider";
import { LogoMark } from "@/src/brand/FrameFlowLogo";
import { H1, H2, Body, Skeleton, AnimIn } from "@/src/components";
import { Icon } from "@/src/ui/Icon";

function rel(s: string | undefined, t: any, locale: string) {
  if (!s) return "—";
  const d = new Date(s).getTime(); const diff = Date.now() - d;
  const m = Math.floor(diff / 60000); if (m < 1) return t("common:time.justNow"); if (m < 60) return t("common:time.minutesAgo", { n: m });
  const h = Math.floor(m / 60); if (h < 24) return t("common:time.hoursAgo", { n: h });
  const days = Math.floor(h / 24); if (days < 7) return t("common:time.daysAgo", { n: days });
  return new Date(s).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage === "it" ? "it-IT" : "en-US";
  const styles = useMemo(() => createStyles(C), [C]);
  const { width } = useWindowDimensions();
  const wide = width > 760;
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ps, ts] = await Promise.all([api.listProjects(), api.templates()]);
      setProjects(ps); setTemplates(ts);
    } catch { /* ignore */ } finally { setLoading(false); }
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
  const featured = active[0];
  const rest = active.slice(1, 6);

  const applyTemplate = (tp: any) => router.push({ pathname: "/new", params: {
    title: tp.name, video_type: tp.video_type, platform: tp.platform, duration: tp.duration,
    aspect_ratio: tp.aspect_ratio, num_scenes: String(tp.num_scenes), crew_size: tp.crew_size,
    visual_style: tp.visual_style, mood: tp.mood } });

  const stats = [
    { v: active.length, l: t("dashboard:stats.projects") },
    { v: generated, l: t("dashboard:stats.generated") },
    { v: scenesTotal, l: t("dashboard:stats.scenes") },
    { v: exports, l: t("dashboard:stats.exports") },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ paddingBottom: S.xxxl }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.brand} />}>
      <View style={[styles.wrap, { paddingTop: insets.top + S.lg }]}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: S.sm }}>
            <LogoMark color={C.brand} size={20} />
            <Text style={styles.kicker}>FRAMEFLOW STUDIO</Text>
          </View>
          <H1>{t("dashboard:welcome", { name: user?.name?.split(" ")[0] || t("settings:director") })}</H1>
          <Body muted style={{ marginTop: 4 }}>{t("dashboard:subtitle")}</Body>
        </View>

        {/* Large New Project CTA */}
        <Pressable onPress={() => router.push("/new")} testID="quick-new" style={({ pressed }) => [styles.ctaCard, { transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
          <View style={styles.ctaIcon}><Icon name="plus" size={22} color={C.onBrand} strokeWidth={2.25} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>{t("dashboard:newProject")}</Text>
            <Text style={styles.ctaSub}>{t("dashboard:newProjectSub")}</Text>
          </View>
          <Icon name="arrow-right" size={20} color={C.onBrand} />
        </Pressable>

        {/* Stats — borderless, quiet */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <AnimIn key={i} delay={i * 50} style={styles.statCell}>
              {i > 0 && <View style={styles.statDivider} />}
              <Text style={styles.statVal}>{s.v}</Text>
              <Text style={styles.statLbl}>{s.l}</Text>
            </AnimIn>
          ))}
        </View>

        {/* Hero Recent Project */}
        {loading ? (
          <Skeleton height={260} radius={R.lg} style={{ marginTop: S.xl }} />
        ) : !featured ? (
          <AnimIn style={styles.empty}>
            <View style={styles.emptyIcon}><Icon name="clapperboard" size={26} color={C.brand} /></View>
            <H2 style={{ marginTop: S.lg, textAlign: "center" }}>{t("dashboard:noProjectsTitle")}</H2>
            <Body muted style={{ textAlign: "center", marginTop: 8, marginBottom: S.xl, maxWidth: 300 }}>{t("dashboard:noProjectsSubtitle")}</Body>
            <Pressable style={styles.cta} onPress={() => router.push("/new")} testID="create-storyboard-btn">
              <Icon name="plus" size={18} color={C.onBrand} strokeWidth={2.25} /><Text style={styles.ctaText}>{t("dashboard:createFirst")}</Text>
            </Pressable>
          </AnimIn>
        ) : (
          <>
            <Text style={styles.overline}>{t("dashboard:continueWorking")}</Text>
            <AnimIn>
              <Pressable style={styles.hero} onPress={() => router.push(`/project/${featured.id}`)} testID={`project-${featured.id}`}>
                <View style={styles.heroBanner}>
                  {featured.scenes?.[0]?.image_url
                    ? <Image source={{ uri: featured.scenes[0].image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    : <>
                        <LinearGradient colors={["#2A2416", "#141210", "#0D0D0F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <View style={styles.heroWatermark}><Icon name="clapperboard" size={92} color={C.brand} strokeWidth={1} /></View>
                        <View style={styles.heroFilmStrip}>
                          {Array.from({ length: 14 }).map((_, i) => <View key={i} style={styles.heroPerf} />)}
                        </View>
                      </>}
                  <LinearGradient colors={["rgba(8,8,10,0.15)", "rgba(8,8,10,0.9)"]} style={StyleSheet.absoluteFill} />
                  <View style={styles.heroBadge}><Text style={styles.heroBadgeTxt}>{featured.status === "generated" ? t("dashboard:stats.generated") : t("dashboard:draft")}</Text></View>
                  <Pressable onPress={() => toggleFav(featured)} hitSlop={10} style={styles.heroFav} testID={`fav-${featured.id}`}>
                    <Icon name="star" size={18} color={featured.favorite ? C.brand : "#fff"} strokeWidth={2} />
                  </Pressable>
                </View>
                <View style={styles.heroBody}>
                  <Text style={styles.heroTitle} numberOfLines={1}>{featured.title}</Text>
                  <Body muted numberOfLines={1} style={{ marginTop: 2, fontSize: 13 }}>{(featured.client || t("projects:noClient")) + " · " + featured.video_type}</Body>
                  <View style={styles.heroMetaRow}>
                    <View style={styles.metaPill}><Icon name="clock" size={13} color={C.onSurface2} /><Text style={styles.metaTxt}>{rel(featured.updated_at, t, locale)}</Text></View>
                    <View style={styles.metaPill}><Icon name="image" size={13} color={C.onSurface2} /><Text style={styles.metaTxt}>{t("projects:scenesCount", { count: featured.scenes?.length || 0 })}</Text></View>
                    <View style={{ flex: 1 }} />
                    <View style={styles.openRow}><Text style={styles.openTxt}>{t("common:actions.open", { defaultValue: "Open" })}</Text><Icon name="arrow-right" size={15} color={C.brand} /></View>
                  </View>
                </View>
              </Pressable>
            </AnimIn>
          </>
        )}

        {/* Drafts strip */}
        {!loading && drafts.length > 1 && (
          <>
            <Text style={styles.overline}>{t("dashboard:draft")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingRight: S.lg }}>
              {drafts.slice(0, 8).map((p) => (
                <Pressable key={p.id} style={styles.draftCard} onPress={() => router.push(`/project/${p.id}`)} testID={`continue-${p.id}`}>
                  <Icon name="file-text" size={18} color={C.onSurface2} />
                  <Text style={styles.draftTitle} numberOfLines={2}>{p.title}</Text>
                  <Text style={styles.draftMeta}>{rel(p.updated_at, t, locale)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* Recent projects */}
        {!loading && rest.length > 0 && (
          <>
            <View style={styles.secHead}>
              <Text style={styles.overline}>{t("dashboard:recentProjects")}</Text>
              <Pressable onPress={() => router.push("/projects")}><Text style={styles.viewAll}>{t("dashboard:viewAll")}</Text></Pressable>
            </View>
            <View style={wide ? styles.gridWide : undefined}>
              {rest.map((p, i) => (
                <AnimIn key={p.id} delay={i * 40} style={wide ? { width: "48.5%" } : undefined}>
                  <Pressable style={styles.row} onPress={() => router.push(`/project/${p.id}`)} testID={`project-${p.id}`}>
                    <View style={styles.rowThumb}>
                      {p.scenes?.[0]?.image_url
                        ? <Image source={{ uri: p.scenes[0].image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        : <LinearGradient colors={["#2A2416", "#111113"]} style={StyleSheet.absoluteFill} />}
                      {!p.scenes?.[0]?.image_url && <Icon name="film" size={18} color={C.brand} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{p.title}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>{rel(p.updated_at, t, locale)} · {t("projects:scenesCount", { count: p.scenes?.length || 0 })}</Text>
                    </View>
                    <Pressable onPress={() => toggleFav(p)} hitSlop={10} style={{ padding: 6 }} testID={`fav-${p.id}`}>
                      <Icon name="star" size={17} color={p.favorite ? C.brand : C.onSurface3} strokeWidth={2} />
                    </Pressable>
                  </Pressable>
                </AnimIn>
              ))}
            </View>
          </>
        )}

        {/* Templates */}
        {templates.length > 0 && (
          <>
            <View style={styles.secHead}>
              <Text style={styles.overline}>{t("dashboard:templates")}</Text>
              <Pressable onPress={() => router.push("/templates")}><Text style={styles.viewAll}>{t("dashboard:browse")}</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingRight: S.lg }}>
              {templates.slice(0, 8).map((tp) => (
                <Pressable key={tp.id} style={styles.tpl} onPress={() => applyTemplate(tp)} testID={`tpl-${tp.id}`}>
                  <View style={styles.tplIcon}><Icon name="grid" size={17} color={C.brand} /></View>
                  <Text style={styles.tplTitle} numberOfLines={2}>{tp.name}</Text>
                  <Text style={styles.tplMeta}>{tp.duration} · {t("projects:scenesCount", { count: tp.num_scenes })}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  wrap: { padding: S.xl, paddingTop: S.xl, maxWidth: MAX_W, alignSelf: "center", width: "100%" },
  masthead: { marginBottom: S.xl },
  kicker: { color: C.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 3, fontWeight: "600" },
  overline: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: S.xl, marginBottom: S.md },

  ctaCard: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.brand, borderRadius: R.lg, padding: S.lg },
  ctaIcon: { width: 44, height: 44, borderRadius: R.md, backgroundColor: "rgba(0,0,0,0.16)", alignItems: "center", justifyContent: "center" },
  ctaTitle: { color: C.onBrand, fontFamily: F.text, fontSize: 16, fontWeight: "700" },
  ctaSub: { color: C.onBrand, opacity: 0.8, fontFamily: F.text, fontSize: 12.5, marginTop: 1 },

  statsRow: { flexDirection: "row", marginTop: S.xl, backgroundColor: C.surface2, borderRadius: R.lg, paddingVertical: S.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  statCell: { flex: 1, alignItems: "center", justifyContent: "center" },
  statDivider: { position: "absolute", left: 0, top: "18%", height: "64%", width: StyleSheet.hairlineWidth, backgroundColor: C.border },
  statVal: { color: C.onSurface, fontFamily: F.display, fontSize: 26, letterSpacing: -0.3 },
  statLbl: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, marginTop: 2, textAlign: "center", letterSpacing: 0.3 },

  heroWatermark: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", opacity: 0.14 },
  heroFilmStrip: { position: "absolute", top: 0, bottom: 0, right: 0, width: 22, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "space-evenly", paddingVertical: 6 },
  heroPerf: { width: 9, height: 6, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.14)" },

  hero: { backgroundColor: C.surface2, borderRadius: R.lg, overflow: "hidden" },
  heroBanner: { height: 176, justifyContent: "flex-start" },
  heroBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeTxt: { color: "#fff", fontFamily: F.text, fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  heroFav: { position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  heroBody: { padding: S.lg },
  heroTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 24, fontWeight: "500", letterSpacing: -0.3 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: S.md },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  openTxt: { color: C.brand, fontFamily: F.text, fontSize: 13.5, fontWeight: "600" },

  draftCard: { width: 168, backgroundColor: C.surface2, borderRadius: R.md, padding: S.md, gap: S.sm, alignItems: "flex-start" },
  draftTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 17, minHeight: 44 },
  draftMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5 },

  secHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  viewAll: { color: C.brand, fontFamily: F.text, fontSize: 13.5, marginTop: S.xl, marginBottom: S.md },
  gridWide: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.md, padding: S.sm, paddingRight: S.md, marginBottom: S.md, gap: S.md },
  rowThumb: { width: 52, height: 52, borderRadius: R.sm, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  rowTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 14.5, fontWeight: "600" },
  rowMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, marginTop: 3 },

  empty: { alignItems: "center", marginTop: S.xl, padding: S.xl },
  emptyIcon: { width: 60, height: 60, borderRadius: R.lg, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  cta: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.brand, borderRadius: R.md, paddingVertical: 13, paddingHorizontal: S.lg },
  ctaText: { color: C.onBrand, fontFamily: F.text, fontSize: 15, fontWeight: "600" },

  tpl: { width: 150, backgroundColor: C.surface2, borderRadius: R.md, padding: S.md, gap: 6 },
  tplIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  tplTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "500", minHeight: 36 },
  tplMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 11 },
});
