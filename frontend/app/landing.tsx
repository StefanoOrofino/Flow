import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { useLanguage } from "@/src/LanguageProvider";
import { Icon } from "@/src/ui/Icon";
import { LogoMark } from "@/src/brand/FrameFlowLogo";
import { Image as ExpoImage } from "expo-image";

const FRAMES = [
  require("../assets/landing/frame1.jpg"),
  require("../assets/landing/frame2.jpg"),
  require("../assets/landing/frame3.jpg"),
  require("../assets/landing/frame4.jpg"),
  require("../assets/landing/frame5.jpg"),
  require("../assets/landing/frame6.jpg"),
];
const STEP_IMAGES = [
  require("../assets/landing/step1.jpg"),
  require("../assets/landing/step2.jpg"),
  require("../assets/landing/step3.jpg"),
  require("../assets/landing/step4.jpg"),
  require("../assets/landing/step5.jpg"),
  require("../assets/landing/step6.jpg"),
];

/* ---------------- structural metadata (icons/ids only; text via i18n) ---------------- */
const NAV_KEYS = ["features", "how", "pricing", "faq"] as const;
const STEP_ICONS = ["upload", "wand", "eye", "sparkles", "users", "download"];
const FEATURE_ICONS = ["wand", "file-text", "clapperboard", "file-text", "list-checks", "camera", "users", "calendar", "wallet", "share", "printer"];
const PRICING_META = [
  { id: "free", rec: false },
  { id: "pro", rec: true },
  { id: "studio", rec: false },
];

/* ---------------- browser chrome wrapper ---------------- */
function Chrome({ C, styles, big, children }: any) {
  return (
    <View style={[styles.mock, big && styles.mockBig]}>
      <LinearGradient colors={["#241E13", "#15130E", "#0C0C0E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.mockGlow} />
      <View style={styles.mockBar}>
        <View style={[styles.dot, { backgroundColor: "#E06C60" }]} />
        <View style={[styles.dot, { backgroundColor: "#E0B65C" }]} />
        <View style={[styles.dot, { backgroundColor: "#7CC08A" }]} />
        <View style={styles.mockUrl}><Text style={styles.mockUrlTxt}>app.frameflow.studio</Text></View>
      </View>
      {children}
    </View>
  );
}

/* ---------------- animated product demo ---------------- */
const DEMO_ICONS = ["upload", "wand", "check", "clapperboard"];
function DemoReel({ C, styles, t, big }: any) {
  const [step, setStep] = useState(0);
  const captions = t("demo.steps", { returnObjects: true }) as string[];
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 2600);
    return () => clearInterval(id);
  }, []);
  // scanning line for the "analyze" step
  const scan = useSharedValue(0);
  useEffect(() => { scan.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true); }, []);
  const scanStyle = useAnimatedStyle(() => ({ top: `${8 + scan.value * 68}%` }));

  return (
    <Chrome C={C} styles={styles} big={big}>
      <View style={styles.demoStage}>
        <Animated.View key={step} entering={FadeIn.duration(450)} style={StyleSheet.absoluteFill}>
          {step === 0 && (
            <View style={styles.demoCenter}>
              <View style={styles.demoDrop}>
                <View style={styles.demoDocIcon}><Icon name="file-text" size={22} color={C.brand} /></View>
                <Text style={styles.demoDocName}>{t("demo.upload")}</Text>
                <View style={styles.demoThumbRow}>
                  {[0, 1, 2].map((i) => <View key={i} style={styles.demoThumb}><Icon name="image" size={13} color="rgba(245,241,232,0.5)" /></View>)}
                </View>
                <Text style={styles.demoHint}>{t("demo.uploadHint")}</Text>
              </View>
            </View>
          )}
          {step === 1 && (
            <View style={styles.demoDocView}>
              <Animated.View style={[styles.demoScan, scanStyle]} />
              {[92, 74, 84, 60, 78, 48].map((w, i) => <View key={i} style={[styles.demoDocLine, { width: `${w}%` }]} />)}
              <View style={styles.demoAnalyzePill}><Icon name="wand" size={12} color={C.brand} /><Text style={styles.demoAnalyzeTxt}>{t("demo.analyzing")}</Text></View>
            </View>
          )}
          {step === 2 && (
            <View style={styles.demoFields}>
              {["client", "goal", "duration", "platform"].map((k) => (
                <View key={k} style={styles.demoFieldRow}>
                  <Text style={styles.demoFieldLbl}>{t(`demo.fields.${k}`)}</Text>
                  <Text style={styles.demoFieldVal} numberOfLines={1}>{t(`demo.fieldVals.${k}`)}</Text>
                  <View style={styles.demoCheck}><Icon name="check" size={11} color="#0C0C0E" strokeWidth={3} /></View>
                </View>
              ))}
            </View>
          )}
          {step === 3 && (
            <View style={styles.demoBoard}>
              <View style={styles.demoBoardGrid}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.demoFrame}>
                    <ExpoImage source={FRAMES[i]} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                    <View style={styles.demoFrameNum}><Text style={styles.demoFrameNumTxt}>{i + 1}</Text></View>
                  </View>
                ))}
              </View>
              <Text style={styles.demoBoardLabel}>{t("demo.packageLabel")}</Text>
            </View>
          )}
        </Animated.View>
      </View>
      <View style={styles.demoCaption}>
        <View style={styles.demoStepIcon}><Icon name={DEMO_ICONS[step] as any} size={13} color={C.brand} strokeWidth={2.4} /></View>
        <Text style={styles.demoCaptionTxt} numberOfLines={1}>{captions[step]}</Text>
        <View style={styles.demoDots}>
          {[0, 1, 2, 3].map((i) => <View key={i} style={[styles.demoDot, i === step && styles.demoDotActive]} />)}
        </View>
      </View>
    </Chrome>
  );
}

/* ---------------- static clarity mocks ---------------- */
function BriefMock({ C, styles, t }: any) {
  return (
    <Chrome C={C} styles={styles}>
      <View style={styles.briefMockBody}>
        <View style={styles.briefDoc}>
          <View style={styles.briefDocHead}><Icon name="file-text" size={13} color={C.brand} /><Text style={styles.briefDocName}>{t("brief.mockTitle")}</Text></View>
          {[90, 70, 82, 58, 74].map((w, i) => <View key={i} style={[styles.demoDocLine, { width: `${w}%` }]} />)}
        </View>
        <View style={styles.briefFields}>
          <Text style={styles.briefExtractedLbl}><Icon name="sparkles" size={11} color={C.brand} /> {t("brief.extracted")}</Text>
          {["client", "goal", "duration", "platform"].map((k) => (
            <View key={k} style={styles.demoFieldRow}>
              <Text style={styles.demoFieldLbl}>{t(`demo.fields.${k}`)}</Text>
              <View style={styles.demoCheck}><Icon name="check" size={11} color="#0C0C0E" strokeWidth={3} /></View>
            </View>
          ))}
        </View>
      </View>
    </Chrome>
  );
}
function StoryboardMock({ C, styles }: any) {
  return (
    <Chrome C={C} styles={styles}>
      <View style={styles.demoBoard}>
        <View style={styles.demoBoardGrid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.demoFrame}>
              <ExpoImage source={FRAMES[i]} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              <View style={styles.demoFrameNum}><Text style={styles.demoFrameNumTxt}>{i + 1}</Text></View>
            </View>
          ))}
        </View>
      </View>
    </Chrome>
  );
}

/* ---------------- page ---------------- */
export default function Landing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const { width } = useWindowDimensions();
  const wide = width > 900;
  const mid = width > 620;
  const { t } = useTranslation("landing");
  const { currentLanguage, setLanguage } = useLanguage();

  const steps = t("how.steps", { returnObjects: true }) as { title: string; desc: string }[];
  const features = t("features.cards", { returnObjects: true }) as { title: string; desc: string }[];
  const faqs = t("faq.items", { returnObjects: true }) as { q: string; a: string }[];

  const scrollRef = useRef<ScrollView>(null);
  const secY = useRef<Record<string, number>>({});
  const onSec = (key: string) => (e: any) => { secY.current[key] = e.nativeEvent.layout.y; };
  const goTo = (key: string) => scrollRef.current?.scrollTo({ y: Math.max(0, (secY.current[key] || 0) - 60), animated: true });

  const startFree = () => router.push("/signup");
  const login = () => router.push("/login");
  const toggleLang = () => setLanguage(currentLanguage === "it" ? "en" : "it");
  const [demoOpen, setDemoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Sticky nav */}
      <View style={[styles.nav, scrolled && styles.navScrolled, { paddingTop: insets.top + 10 }]}>
        <View style={styles.navInner}>
          <Pressable style={styles.brand} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
            <LogoMark color={C.brand} size={22} />
            <Text style={styles.brandTxt}>FrameFlow</Text>
          </Pressable>
          {wide && (
            <View style={styles.navLinks}>
              {NAV_KEYS.map((k) => (
                <Pressable key={k} onPress={() => goTo(k)}><Text style={styles.navLink}>{t(`nav.${k}`)}</Text></Pressable>
              ))}
            </View>
          )}
          <View style={styles.navRight}>
            <Pressable onPress={toggleLang} hitSlop={8} style={styles.langBtn}><Text style={styles.langTxt}>{currentLanguage.toUpperCase()}</Text></Pressable>
            <Pressable onPress={toggleTheme} hitSlop={8} style={styles.navIcon}><Icon name={isDark ? "sun" : "moon"} size={17} color={C.onSurface2} /></Pressable>
            {mid && <Pressable onPress={login}><Text style={styles.navLink}>{t("nav.login")}</Text></Pressable>}
            <Pressable onPress={startFree} style={styles.navCta}><Text style={styles.navCtaTxt}>{t("nav.startFree")}</Text></Pressable>
          </View>
        </View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 0 }}
        scrollEventThrottle={16} onScroll={(e) => { const y = e.nativeEvent.contentOffset.y; setScrolled(y > 16); }}>
        {/* HERO */}
        <View style={styles.hero}>
          <LinearGradient colors={isDark ? ["#1A1710", "#111014", C.surface] : ["#FBF7EE", "#F4EEE1", C.surface]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} />
          <View style={[styles.section, { alignItems: "center", paddingTop: wide ? 96 : 64 }]}>
            <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: "center" }}>
              <View style={styles.pill}><Icon name="sparkles" size={13} color={C.brand} /><Text style={styles.pillTxt}>{t("hero.badge")}</Text></View>
              <Text style={[styles.h1, { fontSize: wide ? 60 : mid ? 46 : 36, lineHeight: (wide ? 60 : mid ? 46 : 36) * 1.14, maxWidth: 900 }]}>{t("hero.title")}</Text>
              <Text style={[styles.lead, { maxWidth: 620 }]}>{t("hero.subtitle")}</Text>
              <View style={styles.heroCtas}>
                <Pressable onPress={startFree} style={styles.ctaPrimary}><Text style={styles.ctaPrimaryTxt}>{t("nav.startFree")}</Text><Icon name="arrow-right" size={17} color={C.onBrand} strokeWidth={2.5} /></Pressable>
                <Pressable onPress={() => setDemoOpen(true)} style={styles.ctaGhost}><Icon name="play" size={15} color={C.onSurface} /><Text style={styles.ctaGhostTxt}>{t("hero.watchDemo")}</Text></Pressable>
              </View>
              <Text style={styles.microtrust}>{t("hero.microtrust")}</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(600).delay(150)} style={{ width: "100%", maxWidth: 960, marginTop: wide ? 56 : 36 }}>
              <DemoReel C={C} styles={styles} t={t} />
            </Animated.View>
          </View>
        </View>

        {/* GALLERY (mobile) — show the cinematic output immediately after the hero */}
        {!mid ? <GallerySection C={C} styles={styles} t={t} wide={wide} mid={mid} /> : null}

        {/* TRUST */}
        <View style={[styles.section, styles.trust]}>
          <Text style={styles.trustLbl}>{t("trust.label")}</Text>
          <View style={styles.trustRow}>
            {(t("trust.items", { returnObjects: true }) as string[]).map((b) => (
              <View key={b} style={styles.trustChip}><Icon name="check" size={13} color={C.brand} strokeWidth={2.5} /><Text style={styles.trustChipTxt}>{b}</Text></View>
            ))}
          </View>
        </View>

        {/* PROBLEM / SOLUTION */}
        <View style={styles.section} onLayout={onSec("features")}>
          <SectionHead C={C} styles={styles} kicker={t("problem.kicker")} title={t("problem.title")} />
          <View style={[styles.twoCol, !mid && { flexDirection: "column" }]}>
            <View style={[styles.problemCard, { borderColor: C.border }]}>
              <Text style={styles.problemLbl}>{t("problem.withoutLabel")}</Text>
              {(t("problem.without", { returnObjects: true }) as string[]).map((x) => (
                <View key={x} style={styles.bullet}><Icon name="x" size={15} color={C.onSurface3} /><Text style={styles.bulletTxtMuted}>{x}</Text></View>
              ))}
            </View>
            <View style={[styles.problemCard, styles.problemCardGood]}>
              <Text style={[styles.problemLbl, { color: C.brand }]}>{t("problem.withLabel")}</Text>
              {(t("problem.with", { returnObjects: true }) as string[]).map((x) => (
                <View key={x} style={styles.bullet}><Icon name="check" size={15} color={C.brand} strokeWidth={2.5} /><Text style={styles.bulletTxt}>{x}</Text></View>
              ))}
            </View>
          </View>
        </View>

        {/* HOW IT WORKS */}
        <View style={[styles.section, styles.altBg]} onLayout={onSec("how")}>
          <SectionHead C={C} styles={styles} kicker={t("how.kicker")} title={t("how.title")} />
          <View style={styles.stepsGrid}>
            {steps.map((s, i) => (
              <Animated.View key={i} entering={FadeInDown.duration(400).delay(i * 60)} style={[styles.stepCard, wide ? { width: "31.5%" } : mid ? { width: "48%" } : { width: "100%" }]}>
                <View style={styles.stepCover}>
                  <ExpoImage source={STEP_IMAGES[i]} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                  <LinearGradient colors={["transparent", "rgba(0,0,0,0.45)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <View style={styles.stepNumBadge}><Text style={styles.stepNumBadgeTxt}>{i + 1}</Text></View>
                </View>
                <View style={styles.stepBody}>
                  <View style={styles.stepIcon}><Icon name={STEP_ICONS[i] as any} size={18} color={C.brand} strokeWidth={2} /></View>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* STATS */}
        <View style={[styles.section, styles.statsSection]}>
          <View style={styles.statsRow}>
            {(t("stats", { returnObjects: true }) as { value: string; label: string }[]).map((s, i) => (
              <View key={i} style={[styles.statCell, wide ? { flex: 1 } : { width: "50%" }, i > 0 && styles.statDivider]}>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CLIENT BRIEF — hero selling point */}
        <View style={styles.section}>
          <View style={[styles.brief, !wide && { flexDirection: "column" }]}>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={styles.kicker}>{t("brief.kicker")}</Text>
              <Text style={styles.h2}>{t("brief.title")}</Text>
              <Text style={styles.para}>{t("brief.para")}</Text>
              {(t("brief.steps", { returnObjects: true }) as string[]).map((x, i) => (
                <View key={x} style={styles.flowRow}>
                  <View style={styles.flowNum}><Text style={styles.flowNumTxt}>{i + 1}</Text></View>
                  <Text style={styles.flowTxt}>{x}</Text>
                </View>
              ))}
              <Pressable onPress={startFree} style={[styles.ctaPrimary, { alignSelf: "flex-start", marginTop: S.lg }]}><Text style={styles.ctaPrimaryTxt}>{t("brief.cta")}</Text><Icon name="arrow-right" size={16} color={C.onBrand} strokeWidth={2.5} /></Pressable>
            </View>
            <View style={{ flex: 1 }}><BriefMock C={C} styles={styles} t={t} /></View>
          </View>
        </View>

        {/* FEATURES GRID */}
        <View style={[styles.section, styles.altBg]}>
          <SectionHead C={C} styles={styles} kicker={t("features.kicker")} title={t("features.title")} />
          <View style={styles.featGrid}>
            {features.map((f, i) => (
              <Animated.View key={i} entering={FadeInDown.duration(360).delay(i * 40)} style={[styles.featCard, wide ? { width: "31.5%" } : mid ? { width: "48%" } : { width: "100%" }]}>
                <View style={styles.featIcon}><Icon name={FEATURE_ICONS[i] as any} size={18} color={C.brand} strokeWidth={2} /></View>
                <Text style={styles.featTitle}>{f.title}</Text>
                <Text style={styles.featDesc}>{f.desc}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* STORYBOARD showcase */}
        <View style={styles.section}>
          <View style={{ alignItems: "center", marginBottom: S.xl }}>
            <Text style={styles.kicker}>{t("storyboard.kicker")}</Text>
            <Text style={[styles.h2, { textAlign: "center" }]}>{t("storyboard.title")}</Text>
          </View>
          <View style={{ maxWidth: 960, width: "100%", alignSelf: "center" }}><StoryboardMock C={C} styles={styles} /></View>
        </View>

        {/* GALLERY — desktop/tablet: keep after the storyboard showcase */}
        {mid ? <GallerySection C={C} styles={styles} t={t} wide={wide} mid={mid} /> : null}

        {/* PRICING */}
        <View style={[styles.section, styles.altBg]} onLayout={onSec("pricing")}>
          <SectionHead C={C} styles={styles} kicker={t("pricing.kicker")} title={t("pricing.title")} />
          <View style={styles.priceGrid}>
            {PRICING_META.map((p) => {
              const name = t(`pricing.plans.${p.id}.name`);
              const feats = t(`pricing.plans.${p.id}.feats`, { returnObjects: true }) as string[];
              return (
                <View key={p.id} style={[styles.priceCard, p.rec && styles.priceCardRec]}>
                  {p.rec && <View style={styles.recBadge}><Text style={styles.recBadgeTxt}>{t("pricing.mostPopular")}</Text></View>}
                  <Text style={styles.priceName}>{name}</Text>
                  <View style={styles.priceRow}><Text style={styles.priceVal}>{t(`pricing.plans.${p.id}.price`)}</Text><Text style={styles.pricePer}>{t(`pricing.plans.${p.id}.per`)}</Text></View>
                  <Pressable onPress={startFree} style={[styles.priceCta, p.rec ? styles.priceCtaGold : styles.priceCtaGhost]}>
                    <Text style={[styles.priceCtaTxt, p.rec ? { color: C.onBrand } : { color: C.onSurface }]}>{p.id === "free" ? t("pricing.startFree") : t("pricing.getPlan", { name })}</Text>
                  </Pressable>
                  <View style={{ marginTop: S.md, gap: 10 }}>
                    {feats.map((f) => (
                      <View key={f} style={styles.bullet}><Icon name="check" size={15} color={C.brand} strokeWidth={2.5} /><Text style={styles.bulletTxt}>{f}</Text></View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section} onLayout={onSec("faq")}>
          <SectionHead C={C} styles={styles} kicker={t("faq.kicker")} title={t("faq.title")} />
          <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
            {faqs.map((f, i) => <FaqItem key={i} f={f} C={C} styles={styles} />)}
          </View>
        </View>

        {/* FINAL CTA */}
        <View style={styles.section}>
          <View style={styles.finalCta}>
            <LinearGradient colors={["#241E13", "#15130E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroGlow} />
            <Text style={[styles.h2, { color: "#F5F1E8", textAlign: "center" }]}>{t("finalCta.title")}</Text>
            <Text style={[styles.lead, { color: "rgba(245,241,232,0.7)", textAlign: "center" }]}>{t("finalCta.subtitle")}</Text>
            <Pressable onPress={startFree} style={[styles.ctaPrimary, { marginTop: S.lg }]}><Text style={styles.ctaPrimaryTxt}>{t("finalCta.cta")}</Text><Icon name="arrow-right" size={17} color={C.onBrand} strokeWidth={2.5} /></Pressable>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={[styles.footerInner, !mid && { flexDirection: "column", gap: S.xl }]}>
            <View style={{ maxWidth: 280 }}>
              <View style={styles.brand}><LogoMark color={C.brand} size={20} /><Text style={styles.brandTxt}>FrameFlow</Text></View>
              <Text style={styles.footNote}>{t("footer.note")}</Text>
            </View>
            <View style={styles.footCols}>
              <FootCol styles={styles} title={t("footer.companyTitle")} items={t("footer.company", { returnObjects: true }) as string[]} />
              <FootCol styles={styles} title={t("footer.resourcesTitle")} items={t("footer.resources", { returnObjects: true }) as string[]} />
              <FootCol styles={styles} title={t("footer.legalTitle")} items={t("footer.legal", { returnObjects: true }) as string[]} />
            </View>
          </View>
          <Text style={styles.copyright}>{t("footer.copyright")}</Text>
        </View>
      </ScrollView>

      {/* DEMO POPUP */}
      <Modal visible={demoOpen} transparent animationType="fade" onRequestClose={() => setDemoOpen(false)}>
        <View style={styles.demoModalBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDemoOpen(false)} />
          <View style={[styles.demoModalCard, { maxWidth: wide ? 860 : 560 }]}>
            <View style={styles.demoModalHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.demoModalTitle}>{t("demo.title")}</Text>
                <Text style={styles.demoModalSub}>{t("demo.subtitle")}</Text>
              </View>
              <Pressable onPress={() => setDemoOpen(false)} hitSlop={10} style={styles.demoModalClose}><Icon name="x" size={20} color={C.onSurface} /></Pressable>
            </View>
            {demoOpen ? <DemoReel C={C} styles={styles} t={t} big /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GalleryCard({ src, i, caption, styles, cardW }: any) {
  const s = useSharedValue(1);
  const imgStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(i * 60)} style={[styles.galleryCard, cardW]}>
      <Pressable
        style={{ flex: 1 }}
        onHoverIn={() => { s.value = withTiming(1.06, { duration: 320 }); }}
        onHoverOut={() => { s.value = withTiming(1, { duration: 320 }); }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, imgStyle]}>
          <ExpoImage source={src} style={styles.galleryImg} contentFit="cover" transition={250} />
        </Animated.View>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.9)"]} locations={[0, 0.5, 1]} style={styles.galleryOverlay} pointerEvents="none" />
        <View style={styles.galleryNum}><Text style={styles.galleryNumTxt}>{i + 1}</Text></View>
        <View style={styles.galleryCapWrap}>
          <View style={styles.galleryCapAccent} />
          <Text style={styles.galleryCap} numberOfLines={2}>
            <Text style={styles.galleryCapMain}>{(caption || "").split(" · ")[0]}</Text>
            {(caption || "").includes(" · ") ? <Text style={styles.galleryCapSub}>{"\n" + (caption || "").split(" · ")[1]}</Text> : null}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function GallerySection({ C, styles, t, wide, mid }: any) {
  const caps = t("gallery.captions", { returnObjects: true }) as string[];
  const cardW = wide ? { width: "31.8%" } : mid ? { width: "48.5%" } : { width: "100%" };
  return (
    <View style={[styles.section, styles.altBg]}>
      <View style={{ alignItems: "center", marginBottom: S.xxl, paddingHorizontal: S.xl }}>
        <Text style={styles.kicker}>{t("gallery.kicker")}</Text>
        <Text style={[styles.h2, { textAlign: "center", maxWidth: 640 }]}>{t("gallery.title")}</Text>
        <Text style={styles.gallerySub}>{t("gallery.subtitle")}</Text>
      </View>
      <View style={styles.galleryGrid}>
        {FRAMES.map((src, i) => (
          <GalleryCard key={i} src={src} i={i} caption={caps[i]} styles={styles} cardW={cardW} />
        ))}
      </View>
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
  langBtn: { width: 34, height: 34, borderRadius: R.md, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  langTxt: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  navCta: { backgroundColor: C.brand, borderRadius: R.pill, paddingHorizontal: S.lg, paddingVertical: 9 },
  navCtaTxt: { color: C.onBrand, fontFamily: F.text, fontSize: 13.5, fontWeight: "700" },

  section: { maxWidth: MAX_W, width: "100%", alignSelf: "center", paddingHorizontal: S.xl, paddingVertical: 72 },
  altBg: { backgroundColor: C.surface2, maxWidth: undefined, paddingHorizontal: 0 },
  hero: { overflow: "hidden" },
  heroGlow: { position: "absolute", top: -120, alignSelf: "center", width: 520, height: 520, borderRadius: 260, backgroundColor: "rgba(197,160,89,0.14)" },

  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.brandTint, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, marginBottom: S.lg },
  pillTxt: { color: C.brand, fontFamily: F.text, fontSize: 12.5, fontWeight: "600" },
  h1: { color: C.onSurface, fontFamily: F.display, fontWeight: "600", letterSpacing: -1, textAlign: "center", lineHeight: undefined },
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
  mockBig: { borderColor: "rgba(197,160,89,0.4)" },

  // animated demo
  demoStage: { flex: 1, position: "relative", overflow: "hidden" },
  demoCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  demoDrop: { width: "74%", maxWidth: 320, borderRadius: R.md, borderWidth: 1.5, borderColor: "rgba(197,160,89,0.4)", borderStyle: "dashed", backgroundColor: "rgba(197,160,89,0.06)", alignItems: "center", padding: 16, gap: 8 },
  demoDocIcon: { width: 44, height: 44, borderRadius: R.md, backgroundColor: "rgba(197,160,89,0.16)", alignItems: "center", justifyContent: "center" },
  demoDocName: { color: "#F5F1E8", fontFamily: F.text, fontSize: 13, fontWeight: "600" },
  demoThumbRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  demoThumb: { width: 34, height: 24, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  demoHint: { color: "rgba(245,241,232,0.5)", fontFamily: F.text, fontSize: 10.5 },

  demoDocView: { flex: 1, padding: 20, gap: 9, justifyContent: "center" },
  demoScan: { position: "absolute", left: "6%", right: "6%", height: 2, backgroundColor: C.brand, opacity: 0.85 },
  demoDocLine: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.09)" },
  demoAnalyzePill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "center", marginTop: 10, backgroundColor: "rgba(197,160,89,0.16)", borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 },
  demoAnalyzeTxt: { color: C.brand, fontFamily: F.text, fontSize: 11.5, fontWeight: "600" },

  demoFields: { flex: 1, padding: 18, gap: 8, justifyContent: "center" },
  demoFieldRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: R.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 10, paddingVertical: 8 },
  demoFieldLbl: { color: "rgba(245,241,232,0.55)", fontFamily: F.text, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", width: 74 },
  demoFieldVal: { color: "#F5F1E8", fontFamily: F.text, fontSize: 12.5, fontWeight: "600", flex: 1 },
  demoCheck: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#7CC08A", alignItems: "center", justifyContent: "center" },

  demoBoard: { flex: 1, padding: 14, justifyContent: "center", gap: 10 },
  demoBoardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  demoFrame: { width: "30%", aspectRatio: 16 / 10, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(197,160,89,0.25)" },
  demoFrameNum: { position: "absolute", top: 4, left: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 4, minWidth: 16, height: 14, paddingHorizontal: 3, alignItems: "center", justifyContent: "center" },
  demoFrameNumTxt: { color: "#F5F1E8", fontFamily: F.text, fontSize: 9, fontWeight: "700" },
  demoBoardLabel: { color: "rgba(245,241,232,0.6)", fontFamily: F.text, fontSize: 11.5, textAlign: "center" },

  demoCaption: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.25)" },
  demoStepIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(197,160,89,0.16)", alignItems: "center", justifyContent: "center" },
  demoCaptionTxt: { color: "#F5F1E8", fontFamily: F.text, fontSize: 12.5, fontWeight: "600", flex: 1 },
  demoDots: { flexDirection: "row", gap: 5 },
  demoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(245,241,232,0.25)" },
  demoDotActive: { backgroundColor: C.brand, width: 16 },

  // brief mock
  briefMockBody: { flex: 1, flexDirection: "row", padding: 14, gap: 12 },
  briefDoc: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: R.md, padding: 12, gap: 8 },
  briefDocHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  briefDocName: { color: "#F5F1E8", fontFamily: F.text, fontSize: 11.5, fontWeight: "600" },
  briefFields: { flex: 1, gap: 7, justifyContent: "center" },
  briefExtractedLbl: { color: C.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 0.6, fontWeight: "700", marginBottom: 2 },

  // demo modal
  demoModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: S.xl },
  demoModalCard: { width: "100%", backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.borderStrong, padding: S.lg },
  demoModalHead: { flexDirection: "row", alignItems: "flex-start", gap: S.md, marginBottom: S.md },
  demoModalTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 22, letterSpacing: -0.2 },
  demoModalSub: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, marginTop: 2 },
  demoModalClose: { width: 36, height: 36, borderRadius: R.md, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" },
  microtrust: { color: C.onSurface3, fontFamily: F.text, fontSize: 12.5, marginTop: S.md, textAlign: "center" },
  trustChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8 },
  trustChipTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "500" },

  // gallery
  navScrolled: { backgroundColor: C.surface, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8, borderBottomColor: C.borderStrong },
  gallerySub: { color: C.onSurface2, fontFamily: F.text, fontSize: 15, textAlign: "center", maxWidth: 620, lineHeight: 23, marginTop: S.md },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.md, justifyContent: "center", maxWidth: MAX_W, alignSelf: "center", width: "100%", paddingHorizontal: S.xl },
  galleryCard: { aspectRatio: 16 / 9, borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: C.surface3 },
  galleryImg: { width: "100%", height: "100%" },
  galleryOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: "68%" },
  galleryNum: { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: R.sm, minWidth: 26, height: 24, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  galleryNumTxt: { color: "#F5F1E8", fontFamily: F.display, fontSize: 14, fontWeight: "600" },
  galleryCapWrap: { position: "absolute", left: 16, right: 16, bottom: 16, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  galleryCapAccent: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: C.brand, marginTop: 2 },
  galleryCap: { flex: 1 },
  galleryCapMain: { color: "#FFFFFF", fontFamily: F.display, fontSize: 19, fontWeight: "600", letterSpacing: -0.2 },
  galleryCapSub: { color: C.brand, fontFamily: F.text, fontSize: 12.5, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },

  // stats
  statsSection: { paddingVertical: 40 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2, overflow: "hidden" },
  statCell: { minWidth: 140, alignItems: "center", paddingVertical: S.xl, paddingHorizontal: S.md },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.border },
  statVal: { color: C.brand, fontFamily: F.display, fontSize: 34, letterSpacing: -0.5 },
  statLbl: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, textAlign: "center", marginTop: 6, lineHeight: 17 },

  trust: { alignItems: "center", paddingVertical: 40 },
  trustLbl: { color: C.onSurface3, fontFamily: F.text, fontSize: 11.5, letterSpacing: 1.5, marginBottom: S.lg },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: S.md, justifyContent: "center" },
  trustName: { color: C.onSurface2, fontFamily: F.display, fontSize: 20, fontWeight: "600" },

  kicker: { color: C.brand, fontFamily: F.text, fontSize: 12, letterSpacing: 2, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  h2: { color: C.onSurface, fontFamily: F.display, fontSize: 34, lineHeight: 40, fontWeight: "500", letterSpacing: -0.5, alignSelf: "center" },
  para: { color: C.onSurface2, fontFamily: F.text, fontSize: 15.5, lineHeight: 25, marginTop: S.md, marginBottom: S.lg },

  twoCol: { flexDirection: "row", gap: S.lg },
  problemCard: { flex: 1, backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xl, gap: 12 },
  problemCardGood: { borderColor: "rgba(197,160,89,0.4)", backgroundColor: C.brandTint },
  problemLbl: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bulletTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 14.5, flex: 1, lineHeight: 21 },
  bulletTxtMuted: { color: C.onSurface2, fontFamily: F.text, fontSize: 14.5, flex: 1, lineHeight: 21 },

  stepsGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.lg, justifyContent: "center", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: S.xl },
  stepCard: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, overflow: "hidden" },
  stepCover: { height: 132, backgroundColor: C.surface3 },
  stepBody: { padding: S.xl, paddingTop: 0 },
  stepNumBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: R.sm, minWidth: 28, height: 26, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  stepNumBadgeTxt: { color: "#F5F1E8", fontFamily: F.display, fontSize: 16, fontWeight: "600" },
  stepIcon: { width: 48, height: 48, borderRadius: R.md, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginTop: -24, marginBottom: S.md, borderWidth: 2, borderColor: C.surface },
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
