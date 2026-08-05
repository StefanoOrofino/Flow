import React, { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { Icon } from "@/src/ui/Icon";
import { LogoMark } from "@/src/components";

/* ---------------- data ---------------- */
const NAV = [
  { key: "features", label: "Features" },
  { key: "how", label: "How it Works" },
  { key: "pricing", label: "Pricing" },
  { key: "faq", label: "FAQ" },
];

const STEPS = [
  { icon: "upload", title: "Upload Brief", desc: "Drop in the client brief — PDFs, docs and reference images." },
  { icon: "wand", title: "AI Analysis", desc: "Our AI reads every document and extracts the facts, with sources." },
  { icon: "eye", title: "Review", desc: "Confirm the extracted facts. Nothing is invented — every value is cited." },
  { icon: "sparkles", title: "Generate", desc: "Produce concept, treatment, script, storyboard and shot list." },
  { icon: "users", title: "Collaborate", desc: "Share client review links and iterate together in real time." },
  { icon: "download", title: "Export", desc: "Deliver a beautiful, production-ready PDF package." },
];

const FEATURES = [
  { icon: "wand", title: "AI Director", desc: "A creative co-pilot that refines any scene, tone or shot on command." },
  { icon: "file-text", title: "Client Brief Import", desc: "Turn messy briefs into a structured, source-verified project." },
  { icon: "clapperboard", title: "Storyboard", desc: "AI-generated frames with an inline, drag-and-drop editor." },
  { icon: "file-text", title: "Script Writer", desc: "Screenplay-formatted narrative, dialogue and voice-over." },
  { icon: "list-checks", title: "Shot List", desc: "Every shot, angle and movement in one production-ready table." },
  { icon: "camera", title: "Equipment", desc: "Recommended camera, lenses, lighting and audio for the shoot." },
  { icon: "users", title: "Crew", desc: "Suggested crew roles scaled to your production level." },
  { icon: "calendar", title: "Schedule", desc: "A realistic shooting schedule and time breakdown." },
  { icon: "wallet", title: "Budget", desc: "Estimated budget ranges from low to premium." },
  { icon: "share", title: "Client Review", desc: "Elegant shareable links for feedback and approvals." },
  { icon: "printer", title: "PDF Export", desc: "A polished package clients and crew will love." },
];

const PRICING = [
  { id: "free", name: "Free", price: "€0", per: "forever", rec: false,
    feats: ["3 active projects", "20 AI generations / mo", "10 storyboard images / mo", "5 PDF exports / mo", "5 GB cloud storage"] },
  { id: "pro", name: "Pro", price: "€19", per: "/ month", rec: true,
    feats: ["25 active projects", "500 AI generations / mo", "300 storyboard images / mo", "Unlimited PDF exports", "10 GB cloud storage", "Priority AI Director"] },
  { id: "studio", name: "Studio", price: "€49", per: "/ month", rec: false,
    feats: ["Unlimited projects", "Unlimited AI generations", "1500 storyboard images / mo", "Team seats & portals", "15 GB cloud storage"] },
];

const FAQ = [
  { q: "How does the AI use my client brief?", a: "FrameFlow reads your uploaded documents and images and extracts only the facts that are explicitly stated — each with a cited source. It never invents information; missing details stay empty for you to confirm." },
  { q: "Is my data private?", a: "Your briefs and projects are yours. We use your content only to generate your production package, never to train public models." },
  { q: "Can I export and share with clients?", a: "Yes — export a beautiful PDF package or share an elegant client review link for feedback and approvals." },
  { q: "Do I need creative or technical skills?", a: "No. Describe your project or drop a brief, and FrameFlow assembles a professional pre-production package you can refine." },
  { q: "Can I cancel anytime?", a: "Absolutely. Plans are month-to-month and you can upgrade, downgrade or cancel whenever you like." },
];

/* ---------------- mock product visual ---------------- */
function MockFrame({ C, styles, tall }: any) {
  return (
    <View style={[styles.mock, tall && { aspectRatio: 4 / 3 }]}>
      <LinearGradient colors={["#241E13", "#15130E", "#0C0C0E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.mockGlow} />
      {/* window chrome */}
      <View style={styles.mockBar}>
        <View style={[styles.dot, { backgroundColor: "#E06C60" }]} />
        <View style={[styles.dot, { backgroundColor: "#E0B65C" }]} />
        <View style={[styles.dot, { backgroundColor: "#7CC08A" }]} />
        <View style={styles.mockUrl}><Text style={styles.mockUrlTxt}>app.frameflow.studio</Text></View>
      </View>
      {/* faux workspace */}
      <View style={styles.mockBody}>
        <View style={styles.mockSide}>
          {["dashboard", "clapperboard", "file-text", "list-checks", "wallet"].map((n, i) => (
            <View key={i} style={[styles.mockNav, i === 1 && { backgroundColor: "rgba(197,160,89,0.16)" }]}>
              <Icon name={n as any} size={14} color={i === 1 ? C.brand : "rgba(245,241,232,0.4)"} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.mockGridRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.mockCard}>
                <LinearGradient colors={["#2A2416", "#141210"]} style={StyleSheet.absoluteFill} />
                <View style={styles.mockCardIcon}><Icon name="clapperboard" size={16} color={C.brand} /></View>
              </View>
            ))}
          </View>
          <View style={styles.mockLineWide} />
          <View style={[styles.mockLine, { width: "60%" }]} />
          <View style={[styles.mockLine, { width: "78%" }]} />
          <View style={[styles.mockLine, { width: "45%" }]} />
        </View>
      </View>
    </View>
  );
}

/* ---------------- page ---------------- */
export default function Landing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, scheme, toggle } = useTheme() as any;
  const styles = useMemo(() => createStyles(C), [C]);
  const { width } = useWindowDimensions();
  const wide = width > 900;
  const mid = width > 620;

  const scrollRef = useRef<ScrollView>(null);
  const secY = useRef<Record<string, number>>({});
  const onSec = (key: string) => (e: any) => { secY.current[key] = e.nativeEvent.layout.y; };
  const goTo = (key: string) => scrollRef.current?.scrollTo({ y: Math.max(0, (secY.current[key] || 0) - 60), animated: true });

  const startFree = () => router.push("/signup");
  const login = () => router.push("/login");

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Sticky nav */}
      <View style={[styles.nav, { paddingTop: insets.top + 10 }]}>
        <View style={styles.navInner}>
          <Pressable style={styles.brand} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
            <LogoMark color={C.brand} size={22} />
            <Text style={styles.brandTxt}>FrameFlow</Text>
          </Pressable>
          {wide && (
            <View style={styles.navLinks}>
              {NAV.map((n) => (
                <Pressable key={n.key} onPress={() => goTo(n.key)}><Text style={styles.navLink}>{n.label}</Text></Pressable>
              ))}
            </View>
          )}
          <View style={styles.navRight}>
            <Pressable onPress={toggle} hitSlop={8} style={styles.navIcon}><Icon name={scheme === "dark" ? "sun" : "moon"} size={17} color={C.onSurface2} /></Pressable>
            {mid && <Pressable onPress={login}><Text style={styles.navLink}>Login</Text></Pressable>}
            <Pressable onPress={startFree} style={styles.navCta}><Text style={styles.navCtaTxt}>Start Free</Text></Pressable>
          </View>
        </View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 0 }}>
        {/* HERO */}
        <View style={styles.hero}>
          <LinearGradient colors={scheme === "dark" ? ["#1A1710", "#111014", C.surface] : ["#FBF7EE", "#F4EEE1", C.surface]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} />
          <View style={[styles.section, { alignItems: "center", paddingTop: wide ? 96 : 64 }]}>
            <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: "center" }}>
              <View style={styles.pill}><Icon name="sparkles" size={13} color={C.brand} /><Text style={styles.pillTxt}>AI pre-production, reinvented</Text></View>
              <Text style={[styles.h1, { fontSize: wide ? 60 : mid ? 46 : 36, maxWidth: 900 }]}>The AI Production Suite for Filmmakers</Text>
              <Text style={[styles.lead, { maxWidth: 620 }]}>Turn a client brief into a complete production package in minutes — concept, script, storyboard, shot list and more.</Text>
              <View style={styles.heroCtas}>
                <Pressable onPress={startFree} style={styles.ctaPrimary}><Text style={styles.ctaPrimaryTxt}>Start Free</Text><Icon name="arrow-right" size={17} color={C.onBrand} strokeWidth={2.5} /></Pressable>
                <Pressable onPress={() => goTo("how")} style={styles.ctaGhost}><Icon name="play" size={15} color={C.onSurface} /><Text style={styles.ctaGhostTxt}>Watch Demo</Text></Pressable>
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(600).delay(150)} style={{ width: "100%", maxWidth: 960, marginTop: wide ? 56 : 36 }}>
              <MockFrame C={C} styles={styles} />
            </Animated.View>
          </View>
        </View>

        {/* TRUST */}
        <View style={[styles.section, styles.trust]}>
          <Text style={styles.trustLbl}>TRUSTED BY FILMMAKERS, AGENCIES & PRODUCTION COMPANIES</Text>
          <View style={styles.trustRow}>
            {["Aurora Films", "Northlight", "Studio Vero", "Mira Agency", "Kinetic"].map((b) => (
              <Text key={b} style={styles.trustName}>{b}</Text>
            ))}
          </View>
        </View>

        {/* PROBLEM / SOLUTION */}
        <View style={styles.section} onLayout={onSec("features")}>
          <SectionHead C={C} styles={styles} kicker="THE PROBLEM" title="Pre-production is scattered and slow" />
          <View style={[styles.twoCol, !mid && { flexDirection: "column" }]}>
            <View style={[styles.problemCard, { borderColor: C.border }]}>
              <Text style={styles.problemLbl}>Without FrameFlow</Text>
              {["Scattered briefs & email threads", "Disconnected tools", "Hours of manual planning", "Repeated, duplicated work"].map((x) => (
                <View key={x} style={styles.bullet}><Icon name="x" size={15} color={C.onSurface3} /><Text style={styles.bulletTxtMuted}>{x}</Text></View>
              ))}
            </View>
            <View style={[styles.problemCard, styles.problemCardGood]}>
              <Text style={[styles.problemLbl, { color: C.brand }]}>With FrameFlow</Text>
              {["One AI-powered production workspace", "Brief → package in minutes", "Source-verified, never invented", "Share, review and export beautifully"].map((x) => (
                <View key={x} style={styles.bullet}><Icon name="check" size={15} color={C.brand} strokeWidth={2.5} /><Text style={styles.bulletTxt}>{x}</Text></View>
              ))}
            </View>
          </View>
        </View>

        {/* HOW IT WORKS */}
        <View style={[styles.section, styles.altBg]} onLayout={onSec("how")}>
          <SectionHead C={C} styles={styles} kicker="HOW IT WORKS" title="From brief to package in six steps" />
          <View style={styles.stepsGrid}>
            {STEPS.map((s, i) => (
              <Animated.View key={s.title} entering={FadeInDown.duration(400).delay(i * 60)} style={[styles.stepCard, wide ? { width: "31.5%" } : mid ? { width: "48%" } : { width: "100%" }]}>
                <View style={styles.stepNum}><Text style={styles.stepNumTxt}>{i + 1}</Text></View>
                <View style={styles.stepIcon}><Icon name={s.icon as any} size={18} color={C.brand} strokeWidth={2} /></View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* CLIENT BRIEF — hero selling point */}
        <View style={styles.section}>
          <View style={[styles.brief, !wide && { flexDirection: "column" }]}>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={styles.kicker}>THE CLIENT BRIEF WORKFLOW</Text>
              <Text style={styles.h2}>Upload a brief. Get a project.</Text>
              <Text style={styles.para}>Drop in a PDF and reference images. FrameFlow reads every page, extracts the facts with citations, auto-fills your project, and generates a complete production package — all in minutes.</Text>
              {["Upload PDF & images", "AI reads the documents", "Extracts information (with sources)", "Auto-fills the project", "Generates the package"].map((x, i) => (
                <View key={x} style={styles.flowRow}>
                  <View style={styles.flowNum}><Text style={styles.flowNumTxt}>{i + 1}</Text></View>
                  <Text style={styles.flowTxt}>{x}</Text>
                </View>
              ))}
              <Pressable onPress={startFree} style={[styles.ctaPrimary, { alignSelf: "flex-start", marginTop: S.lg }]}><Text style={styles.ctaPrimaryTxt}>Try it Free</Text><Icon name="arrow-right" size={16} color={C.onBrand} strokeWidth={2.5} /></Pressable>
            </View>
            <View style={{ flex: 1 }}><MockFrame C={C} styles={styles} tall /></View>
          </View>
        </View>

        {/* FEATURES GRID */}
        <View style={[styles.section, styles.altBg]}>
          <SectionHead C={C} styles={styles} kicker="EVERYTHING YOU NEED" title="One workspace. The whole production." />
          <View style={styles.featGrid}>
            {FEATURES.map((f, i) => (
              <Animated.View key={f.title} entering={FadeInDown.duration(360).delay(i * 40)} style={[styles.featCard, wide ? { width: "31.5%" } : mid ? { width: "48%" } : { width: "100%" }]}>
                <View style={styles.featIcon}><Icon name={f.icon as any} size={18} color={C.brand} strokeWidth={2} /></View>
                <Text style={styles.featTitle}>{f.title}</Text>
                <Text style={styles.featDesc}>{f.desc}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* STORYBOARD showcase */}
        <View style={styles.section}>
          <View style={{ alignItems: "center", marginBottom: S.xl }}>
            <Text style={styles.kicker}>STORYBOARD</Text>
            <Text style={[styles.h2, { textAlign: "center" }]}>See your film before you shoot it</Text>
          </View>
          <View style={{ maxWidth: 960, width: "100%", alignSelf: "center" }}><MockFrame C={C} styles={styles} /></View>
        </View>

        {/* PRICING */}
        <View style={[styles.section, styles.altBg]} onLayout={onSec("pricing")}>
          <SectionHead C={C} styles={styles} kicker="PRICING" title="Simple, transparent pricing" />
          <View style={styles.priceGrid}>
            {PRICING.map((p) => (
              <View key={p.id} style={[styles.priceCard, p.rec && styles.priceCardRec]}>
                {p.rec && <View style={styles.recBadge}><Text style={styles.recBadgeTxt}>MOST POPULAR</Text></View>}
                <Text style={styles.priceName}>{p.name}</Text>
                <View style={styles.priceRow}><Text style={styles.priceVal}>{p.price}</Text><Text style={styles.pricePer}>{p.per}</Text></View>
                <Pressable onPress={startFree} style={[styles.priceCta, p.rec ? styles.priceCtaGold : styles.priceCtaGhost]}>
                  <Text style={[styles.priceCtaTxt, p.rec ? { color: C.onBrand } : { color: C.onSurface }]}>{p.id === "free" ? "Start Free" : "Get " + p.name}</Text>
                </Pressable>
                <View style={{ marginTop: S.md, gap: 10 }}>
                  {p.feats.map((f) => (
                    <View key={f} style={styles.bullet}><Icon name="check" size={15} color={C.brand} strokeWidth={2.5} /><Text style={styles.bulletTxt}>{f}</Text></View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section} onLayout={onSec("faq")}>
          <SectionHead C={C} styles={styles} kicker="FAQ" title="Questions, answered" />
          <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
            {FAQ.map((f, i) => <FaqItem key={i} f={f} C={C} styles={styles} />)}
          </View>
        </View>

        {/* FINAL CTA */}
        <View style={styles.section}>
          <View style={styles.finalCta}>
            <LinearGradient colors={["#241E13", "#15130E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroGlow} />
            <Text style={[styles.h2, { color: "#F5F1E8", textAlign: "center" }]}>Ready to produce faster?</Text>
            <Text style={[styles.lead, { color: "rgba(245,241,232,0.7)", textAlign: "center" }]}>Start free — no credit card required.</Text>
            <Pressable onPress={startFree} style={[styles.ctaPrimary, { marginTop: S.lg }]}><Text style={styles.ctaPrimaryTxt}>Start Free</Text><Icon name="arrow-right" size={17} color={C.onBrand} strokeWidth={2.5} /></Pressable>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={[styles.footerInner, !mid && { flexDirection: "column", gap: S.xl }]}>
            <View style={{ maxWidth: 280 }}>
              <View style={styles.brand}><LogoMark color={C.brand} size={20} /><Text style={styles.brandTxt}>FrameFlow</Text></View>
              <Text style={styles.footNote}>The AI production suite for filmmakers, videographers and agencies.</Text>
            </View>
            <View style={styles.footCols}>
              <FootCol styles={styles} title="Company" items={["About", "Careers", "Contact"]} />
              <FootCol styles={styles} title="Resources" items={["Blog", "Guides", "Support"]} />
              <FootCol styles={styles} title="Legal" items={["Privacy", "Terms"]} />
            </View>
          </View>
          <Text style={styles.copyright}>© 2026 FrameFlow Studio. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHead({ C, styles, kicker, title }: any) {
  return (
    <View style={{ alignItems: "center", marginBottom: S.xxl }}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={[styles.h2, { textAlign: "center", maxWidth: 640 }]}>{title}</Text>
    </View>
  );
}
function FootCol({ styles, title, items }: any) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.footColTitle}>{title}</Text>
      {items.map((i: string) => <Text key={i} style={styles.footLink}>{i}</Text>)}
    </View>
  );
}
function FaqItem({ f, C, styles }: any) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable style={styles.faqItem} onPress={() => setOpen((o) => !o)}>
      <View style={styles.faqQRow}>
        <Text style={styles.faqQ}>{f.q}</Text>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={C.onSurface2} />
      </View>
      {open && <Text style={styles.faqA}>{f.a}</Text>}
    </Pressable>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  nav: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: C.surface + "E6", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, paddingBottom: 10 },
  navInner: { maxWidth: MAX_W, width: "100%", alignSelf: "center", paddingHorizontal: S.xl, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandTxt: { color: C.onSurface, fontFamily: F.display, fontSize: 20, fontWeight: "600" },
  navLinks: { flexDirection: "row", gap: S.xl, position: "absolute", left: 0, right: 0, justifyContent: "center" },
  navLink: { color: C.onSurface2, fontFamily: F.text, fontSize: 14, fontWeight: "500" },
  navRight: { flexDirection: "row", alignItems: "center", gap: S.md },
  navIcon: { width: 34, height: 34, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
  navCta: { backgroundColor: C.brand, borderRadius: R.pill, paddingHorizontal: S.lg, paddingVertical: 9 },
  navCtaTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 13.5, fontWeight: "700" },

  section: { maxWidth: MAX_W, width: "100%", alignSelf: "center", paddingHorizontal: S.xl, paddingVertical: 72 },
  altBg: { backgroundColor: C.surface2, maxWidth: undefined, paddingHorizontal: 0 },
  hero: { overflow: "hidden" },
  heroGlow: { position: "absolute", top: -120, alignSelf: "center", width: 520, height: 520, borderRadius: 260, backgroundColor: "rgba(197,160,89,0.14)" },

  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.brandTint, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, marginBottom: S.lg },
  pillTxt: { color: C.brand, fontFamily: F.text, fontSize: 12.5, fontWeight: "600" },
  h1: { color: C.onSurface, fontFamily: F.display, fontWeight: "500", letterSpacing: -1, textAlign: "center", lineHeight: undefined },
  lead: { color: C.onSurface2, fontFamily: F.text, fontSize: 17, lineHeight: 26, textAlign: "center", marginTop: S.lg },
  heroCtas: { flexDirection: "row", gap: S.md, marginTop: S.xl, flexWrap: "wrap", justifyContent: "center" },
  ctaPrimary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.brand, borderRadius: R.pill, paddingHorizontal: S.xl, paddingVertical: 14 },
  ctaPrimaryTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 15, fontWeight: "700" },
  ctaGhost: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: S.xl, paddingVertical: 14 },
  ctaGhostTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600" },

  // mock frame
  mock: { width: "100%", aspectRatio: 16 / 9, borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: "rgba(197,160,89,0.25)" },
  mockGlow: { position: "absolute", top: -60, right: -30, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(197,160,89,0.14)" },
  mockBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 34, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" },
  dot: { width: 9, height: 9, borderRadius: 5 },
  mockUrl: { marginLeft: 12, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 3 },
  mockUrlTxt: { color: "rgba(245,241,232,0.5)", fontFamily: F.text, fontSize: 11 },
  mockBody: { flex: 1, flexDirection: "row", padding: 12, gap: 12 },
  mockSide: { gap: 8 },
  mockNav: { width: 34, height: 34, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  mockGridRow: { flexDirection: "row", gap: 8 },
  mockCard: { flex: 1, aspectRatio: 16 / 10, borderRadius: 8, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  mockCardIcon: { opacity: 0.5 },
  mockLineWide: { height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.1)", marginTop: 4 },
  mockLine: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)" },

  trust: { alignItems: "center", paddingVertical: 40 },
  trustLbl: { color: C.onSurface3, fontFamily: F.text, fontSize: 11.5, letterSpacing: 1.5, marginBottom: S.lg },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: S.xl, justifyContent: "center", opacity: 0.7 },
  trustName: { color: C.onSurface2, fontFamily: F.display, fontSize: 20, fontWeight: "600" },

  kicker: { color: C.brand, fontFamily: F.text, fontSize: 12, letterSpacing: 2, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  h2: { color: C.onSurface, fontFamily: F.display, fontSize: 34, fontWeight: "500", letterSpacing: -0.5, alignSelf: "center" },
  para: { color: C.onSurface2, fontFamily: F.text, fontSize: 15.5, lineHeight: 25, marginTop: S.md, marginBottom: S.lg },

  twoCol: { flexDirection: "row", gap: S.lg },
  problemCard: { flex: 1, backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xl, gap: 12 },
  problemCardGood: { borderColor: "rgba(197,160,89,0.4)", backgroundColor: C.brandTint },
  problemLbl: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bulletTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 14.5, flex: 1, lineHeight: 21 },
  bulletTxtMuted: { color: C.onSurface2, fontFamily: F.text, fontSize: 14.5, flex: 1, lineHeight: 21 },

  stepsGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.lg, justifyContent: "center", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: S.xl },
  stepCard: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: S.xl },
  stepNum: { position: "absolute", top: 16, right: 16, color: C.onSurface3 },
  stepNumTxt: { color: C.onSurface3, fontFamily: F.display, fontSize: 22, opacity: 0.4 },
  stepIcon: { width: 44, height: 44, borderRadius: R.md, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.md },
  stepTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 20 },
  stepDesc: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5, lineHeight: 20, marginTop: 6 },

  brief: { flexDirection: "row", gap: S.xxl, alignItems: "stretch" },
  flowRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 },
  flowNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  flowNumTxt: { color: C.brand, fontFamily: F.text, fontSize: 13, fontWeight: "700" },
  flowTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 15 },

  featGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.lg, justifyContent: "center", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: S.xl },
  featCard: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: S.xl },
  featIcon: { width: 44, height: 44, borderRadius: R.md, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.md },
  featTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 20 },
  featDesc: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5, lineHeight: 20, marginTop: 6 },

  priceGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.lg, justifyContent: "center", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: S.xl },
  priceCard: { flexGrow: 1, flexBasis: 280, maxWidth: 360, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xl },
  priceCardRec: { borderColor: C.brand, borderWidth: 2 },
  recBadge: { alignSelf: "flex-start", backgroundColor: C.brand, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, marginBottom: S.md },
  recBadgeTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5 },
  priceName: { color: C.onSurface, fontFamily: F.display, fontSize: 24 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 6, marginBottom: S.lg },
  priceVal: { color: C.onSurface, fontFamily: F.display, fontSize: 40, letterSpacing: -1 },
  pricePer: { color: C.onSurface2, fontFamily: F.text, fontSize: 14, marginBottom: 8 },
  priceCta: { borderRadius: R.md, paddingVertical: 12, alignItems: "center" },
  priceCtaGold: { backgroundColor: C.brand },
  priceCtaGhost: { borderWidth: 1, borderColor: C.border },
  priceCtaTxt: { fontFamily: F.text, fontSize: 14.5, fontWeight: "700" },

  faqItem: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, paddingVertical: S.lg },
  faqQRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.md },
  faqQ: { color: C.onSurface, fontFamily: F.text, fontSize: 16, fontWeight: "600", flex: 1 },
  faqA: { color: C.onSurface2, fontFamily: F.text, fontSize: 14.5, lineHeight: 23, marginTop: S.md },

  finalCta: { borderRadius: R.lg, overflow: "hidden", alignItems: "center", paddingVertical: 64, paddingHorizontal: S.xl, borderWidth: 1, borderColor: "rgba(197,160,89,0.3)" },

  footer: { backgroundColor: C.surface2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingVertical: 48, paddingHorizontal: S.xl },
  footerInner: { maxWidth: MAX_W, width: "100%", alignSelf: "center", flexDirection: "row", justifyContent: "space-between" },
  footNote: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, lineHeight: 20, marginTop: S.md },
  footCols: { flexDirection: "row", gap: 56, flexWrap: "wrap" },
  footColTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 13, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  footLink: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5 },
  copyright: { color: C.onSurface3, fontFamily: F.text, fontSize: 12, textAlign: "center", marginTop: S.xxl, maxWidth: MAX_W, alignSelf: "center" },
});
