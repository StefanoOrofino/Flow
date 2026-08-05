import React, { useMemo, useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme, ThemeMode, Density } from "@/src/ThemeProvider";
import { useLanguage } from "@/src/LanguageProvider";
import { H1, H2, Body, Btn, Card } from "@/src/components";

const THEME_OPTIONS: { key: ThemeMode; labelKey: string; icon: any }[] = [
  { key: "system", labelKey: "themeSystem", icon: "phone-portrait-outline" },
  { key: "light", labelKey: "themeLight", icon: "sunny-outline" },
  { key: "dark", labelKey: "themeDark", icon: "moon-outline" },
];

const DENSITY_OPTIONS: { key: Density; labelKey: string; subKey: string }[] = [
  { key: "compact", labelKey: "densityCompact", subKey: "densityDesktopOnly" },
  { key: "comfortable", labelKey: "densityComfortable", subKey: "densityDefault" },
  { key: "large", labelKey: "densityLarge", subKey: "densityMostReadable" },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("settings");
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const {
    C, mode, setMode, density, setDensity, reduceMotion, setReduceMotion,
    highContrast, setHighContrast, isPhone,
  } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [adminInfo, setAdminInfo] = useState<{ is_privileged: boolean; can_claim: boolean } | null>(null);
  useEffect(() => { api.adminStatus().then((s: any) => setAdminInfo({ is_privileged: !!s.is_privileged, can_claim: !!s.can_claim })).catch(() => {}); }, []);
  const showAdmin = adminInfo && (adminInfo.is_privileged || adminInfo.can_claim);

  const [imgModel, setImgModel] = useState<string>("gemini");
  const [imgModels, setImgModels] = useState<any[]>([]);
  useEffect(() => { api.getSettings().then((s: any) => { setImgModel(s.image_model || "gemini"); setImgModels(s.models || []); }).catch(() => {}); }, []);
  const selectImageModel = (mid: string) => { setImgModel(mid); api.updateSettings(mid).catch(() => {}); };

  const SHORTCUTS: [string, string][] = [
    [t("shortcutUndo"), "⌘ / Ctrl + Z"],
    [t("shortcutRedo"), "⌘ / Ctrl + Shift + Z"],
    [t("shortcutSave"), t("shortcutSaveValue")],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.lg }]}>
        <H1>{t("title")}</H1>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Card style={{ marginBottom: S.lg }}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}><Ionicons name="person" size={26} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <H2>{user?.name || t("director")}</H2>
              <Body muted>{user?.email}</Body>
            </View>
          </View>
        </Card>

        {/* Plan & Billing */}
        <Text style={styles.sectionLabel}>{t("billing:title")}</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Pressable onPress={() => router.push("/billing")} testID="billing-link">
            <Row C={C} styles={styles} icon="card-outline" label={t("billing:currentPlan")} value={`${t("billing:title")} ›`} />
          </Pressable>
        </Card>

        {/* Admin Console — only for privileged users, or to bootstrap the first Owner */}
        {showAdmin ? (
          <>
            <Text style={styles.sectionLabel}>{t("settings:adminSection")}</Text>
            <Card style={{ marginBottom: S.lg }}>
              <Pressable onPress={() => router.push("/admin")} testID="admin-link">
                <Row C={C} styles={styles} icon="shield-checkmark-outline" label={t("settings:adminConsole")}
                  value={adminInfo?.is_privileged ? t("settings:adminManage") : t("settings:adminSetup")} />
              </Pressable>
            </Card>
          </>
        ) : null}

        {/* Appearance */}
        <Text style={styles.sectionLabel}>{t("appearance")}</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Text style={styles.fieldLabel}>{t("theme")}</Text>
          <View style={styles.tileRow}>
            {THEME_OPTIONS.map((o) => {
              const active = mode === o.key;
              return (
                <Pressable key={o.key} testID={`theme-${o.key}`} onPress={() => setMode(o.key)} style={[styles.tile, active && styles.tileActive]}>
                  <Ionicons name={o.icon} size={20} color={active ? C.brand : C.onSurface2} />
                  <Text style={[styles.tileLabel, active && { color: C.onSurface }]}>{t(o.labelKey)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>{t("workspaceDensity")}</Text>
          <View style={styles.densityCol}>
            {DENSITY_OPTIONS.map((o) => {
              const disabled = isPhone && o.key === "compact";
              const active = density === o.key && !disabled;
              return (
                <Pressable
                  key={o.key}
                  testID={`density-${o.key}`}
                  disabled={disabled}
                  onPress={() => setDensity(o.key)}
                  style={[styles.densityRow, active && styles.densityRowActive, disabled && { opacity: 0.4 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.densityLabel, active && { color: C.onSurface }]}>{t(o.labelKey)}</Text>
                    <Text style={styles.densitySub}>{disabled ? t("densityUnavailableMobile") : t(o.subKey)}</Text>
                  </View>
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={active ? C.brand : C.onSurface2}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>{t("accentColor")}</Text>
          <View style={styles.accentRow}>
            <View style={styles.swatch} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t("accentName")}</Text>
              <Text style={styles.rowValue}>{t("accentDesc")}</Text>
            </View>
            <Ionicons name="lock-closed-outline" size={16} color={C.onSurface2} />
          </View>
        </Card>

        {/* Language */}
        <Text style={styles.sectionLabel}>🌐 {t("language")}</Text>
        <Card style={{ marginBottom: S.lg }}>
          <View style={styles.tileRow}>
            {availableLanguages.map((l) => {
              const active = currentLanguage === l.code;
              return (
                <Pressable key={l.code} testID={`lang-${l.code}`} onPress={() => setLanguage(l.code)} style={[styles.tile, active && styles.tileActive]}>
                  <Text style={[styles.tileLabel, { fontSize: 14 }, active && { color: C.onSurface }]}>{l.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={16} color={C.brand} />}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Accessibility */}
        <Text style={styles.sectionLabel}>{t("accessibility")}</Text>
        <Card style={{ marginBottom: S.lg }}>
          <ToggleRow
            C={C} styles={styles} icon="pulse-outline"
            label={t("reduceMotion")} desc={t("reduceMotionDesc")}
            value={reduceMotion} onValueChange={setReduceMotion} testID="toggle-reduce-motion"
          />
          <View style={styles.divider} />
          <ToggleRow
            C={C} styles={styles} icon="contrast-outline"
            label={t("highContrast")} desc={t("highContrastDesc")}
            value={highContrast} onValueChange={setHighContrast} testID="toggle-high-contrast"
          />
        </Card>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>{t("notifications")}</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Row C={C} styles={styles} icon="mail-outline" label={t("emailUpdates")} value={t("emailUpdatesDesc")} />
        </Card>

        {/* AI */}
        <Text style={styles.sectionLabel}>{t("ai")}</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Row C={C} styles={styles} icon="sparkles-outline" label={t("aiEngine")} value={t("aiEngineValue")} />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>{t("imageGeneration")}</Text>
          {imgModels.length > 1 ? (
            <View style={styles.tileRow}>
              {imgModels.map((m) => {
                const active = imgModel === m.id;
                return (
                  <Pressable key={m.id} testID={`imgmodel-${m.id}`} onPress={() => selectImageModel(m.id)} style={[styles.tile, active && styles.tileActive]}>
                    <Ionicons name={m.id === "openai" ? "aperture-outline" : "sparkles-outline"} size={20} color={active ? C.brand : C.onSurface2} />
                    <Text style={[styles.tileLabel, active && { color: C.onSurface }]}>{m.label}</Text>
                    {active && <Ionicons name="checkmark-circle" size={15} color={C.brand} />}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Row C={C} styles={styles} icon="image-outline" label={t("imageGeneration")} value={t("imageGenerationValue")} />
          )}
          <Text style={[styles.rowValue, { marginTop: S.sm }]}>{(imgModels.find((m) => m.id === imgModel) || {}).hint || t("imageGenerationValue")}</Text>
        </Card>

        {/* Export */}
        <Text style={styles.sectionLabel}>{t("export")}</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Row C={C} styles={styles} icon="document-text-outline" label={t("defaultFormat")} value={t("defaultFormatValue")} />
          <View style={styles.divider} />
          <Row C={C} styles={styles} icon="film-outline" label={t("defaultAspectRatio")} value="16:9" />
        </Card>

        {/* Keyboard shortcuts (web/desktop) */}
        {Platform.OS === "web" && (
          <>
            <Text style={styles.sectionLabel}>{t("keyboardShortcuts")}</Text>
            <Card style={{ marginBottom: S.lg }}>
              {SHORTCUTS.map(([k, v], i) => (
                <View key={k}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.shortcutRow}>
                    <Text style={styles.rowLabel}>{k}</Text>
                    <Text style={styles.kbd}>{v}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* About */}
        <Text style={styles.sectionLabel}>{t("about")}</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Row C={C} styles={styles} icon="shield-checkmark-outline" label={t("data")} value={t("dataValue")} />
          <View style={styles.divider} />
          <Row C={C} styles={styles} icon="information-circle-outline" label={t("version")} value="FrameFlow Studio 1.0" />
          <View style={styles.divider} />
          <Pressable onPress={() => router.push("/logo")} testID="logo-explore-link">
            <Row C={C} styles={styles} icon="color-palette-outline" label="Logo Exploration" value="Flow Forward ›" />
          </Pressable>
        </Card>

        <Btn title={t("logout")} variant="ghost" icon="log-out-outline" onPress={logout} testID="logout-btn" />
      </ScrollView>
    </View>
  );
}

function Row({ C, styles, icon, label, value }: any) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={C.onSurface2} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({ C, styles, icon, label, desc, value, onValueChange, testID }: any) {
  return (
    <View style={styles.toggleRow}>
      <Ionicons name={icon} size={18} color={C.onSurface2} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{desc}</Text>
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: C.surface3, true: C.brand }}
        thumbColor={Platform.OS === "android" ? (value ? C.onBrand : C.onSurface2) : undefined}
        ios_backgroundColor={C.surface3}
      />
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  header: { paddingHorizontal: S.xl, paddingBottom: S.sm },
  scroll: { padding: S.xl, paddingTop: S.md, paddingBottom: S.xxxl, maxWidth: MAX_W, alignSelf: "center", width: "100%" },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  avatar: { width: 54, height: 54, borderRadius: R.pill, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  sectionLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, letterSpacing: 2, marginBottom: S.sm, marginLeft: 2 },
  fieldLabel: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "500", marginBottom: S.md },
  divider: { height: 1, backgroundColor: C.border, marginVertical: S.lg },

  tileRow: { flexDirection: "row", gap: S.sm },
  tile: { flex: 1, alignItems: "center", gap: 6, paddingVertical: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface3, minHeight: 68, justifyContent: "center" },
  tileActive: { borderColor: C.brand, backgroundColor: C.brandTint },
  tileLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, fontWeight: "500" },

  densityCol: { gap: S.sm },
  densityRow: { flexDirection: "row", alignItems: "center", paddingVertical: S.md, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface3, minHeight: 56 },
  densityRowActive: { borderColor: C.brand, backgroundColor: C.brandTint },
  densityLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 14, fontWeight: "500" },
  densitySub: { color: C.onSurface3, fontFamily: F.text, fontSize: 12, marginTop: 2 },

  accentRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  swatch: { width: 38, height: 38, borderRadius: R.sm, backgroundColor: "#C5A059", borderWidth: 1, borderColor: C.borderStrong },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: S.sm, gap: S.md, minHeight: 44 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: S.md, minHeight: 48 },
  rowLabel: { color: C.onSurface, fontFamily: F.text, fontSize: 14, flex: 1 },
  rowValue: { color: C.onSurface2, fontFamily: F.text, fontSize: 13 },

  shortcutRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: S.sm, minHeight: 40 },
  kbd: { color: C.onSurface2, fontFamily: F.text, fontSize: 12.5, backgroundColor: C.surface3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm, overflow: "hidden" },
});
