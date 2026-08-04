import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme, ThemeMode, Density } from "@/src/ThemeProvider";
import { H1, H2, Body, Btn, Card } from "@/src/components";

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: any }[] = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
];

const DENSITY_OPTIONS: { key: Density; label: string; sub: string }[] = [
  { key: "compact", label: "Compact", sub: "Desktop only" },
  { key: "comfortable", label: "Comfortable", sub: "Default" },
  { key: "large", label: "Large", sub: "Most readable" },
];

const SHORTCUTS: [string, string][] = [
  ["Undo", "⌘ / Ctrl + Z"],
  ["Redo", "⌘ / Ctrl + Shift + Z"],
  ["Save", "Autosaves continuously"],
];

export default function Settings() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    C, mode, setMode, density, setDensity, reduceMotion, setReduceMotion,
    highContrast, setHighContrast, isPhone,
  } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.lg }]}>
        <H1>Settings</H1>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Card style={{ marginBottom: S.lg }}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}><Ionicons name="person" size={26} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <H2>{user?.name || "Director"}</H2>
              <Body muted>{user?.email}</Body>
            </View>
          </View>
        </Card>

        {/* Appearance */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Text style={styles.fieldLabel}>Theme</Text>
          <View style={styles.tileRow}>
            {THEME_OPTIONS.map((o) => {
              const active = mode === o.key;
              return (
                <Pressable key={o.key} testID={`theme-${o.key}`} onPress={() => setMode(o.key)} style={[styles.tile, active && styles.tileActive]}>
                  <Ionicons name={o.icon} size={20} color={active ? C.brand : C.onSurface2} />
                  <Text style={[styles.tileLabel, active && { color: C.onSurface }]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Workspace density</Text>
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
                    <Text style={[styles.densityLabel, active && { color: C.onSurface }]}>{o.label}</Text>
                    <Text style={styles.densitySub}>{disabled ? "Not available on mobile" : o.sub}</Text>
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

          <Text style={styles.fieldLabel}>Accent color</Text>
          <View style={styles.accentRow}>
            <View style={styles.swatch} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Signature Gold</Text>
              <Text style={styles.rowValue}>#C5A059 · Brand identity</Text>
            </View>
            <Ionicons name="lock-closed-outline" size={16} color={C.onSurface2} />
          </View>
        </Card>

        {/* Accessibility */}
        <Text style={styles.sectionLabel}>ACCESSIBILITY</Text>
        <Card style={{ marginBottom: S.lg }}>
          <ToggleRow
            C={C} styles={styles} icon="pulse-outline"
            label="Reduce motion" desc="Minimize animations and transitions"
            value={reduceMotion} onValueChange={setReduceMotion} testID="toggle-reduce-motion"
          />
          <View style={styles.divider} />
          <ToggleRow
            C={C} styles={styles} icon="contrast-outline"
            label="High contrast" desc="Stronger borders and text for clarity"
            value={highContrast} onValueChange={setHighContrast} testID="toggle-high-contrast"
          />
        </Card>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Row C={C} styles={styles} icon="mail-outline" label="Email updates" value="Project & render summaries" />
        </Card>

        {/* AI */}
        <Text style={styles.sectionLabel}>AI</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Row C={C} styles={styles} icon="sparkles-outline" label="AI engine" value="Modular provider" />
          <View style={styles.divider} />
          <Row C={C} styles={styles} icon="image-outline" label="Image generation" value="Gemini · cost-controlled" />
        </Card>

        {/* Export */}
        <Text style={styles.sectionLabel}>EXPORT</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Row C={C} styles={styles} icon="document-text-outline" label="Default format" value="Storyboard PDF" />
          <View style={styles.divider} />
          <Row C={C} styles={styles} icon="film-outline" label="Default aspect ratio" value="16:9" />
        </Card>

        {/* Keyboard shortcuts (web/desktop) */}
        {Platform.OS === "web" && (
          <>
            <Text style={styles.sectionLabel}>KEYBOARD SHORTCUTS</Text>
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
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <Card style={{ marginBottom: S.lg }}>
          <Row C={C} styles={styles} icon="shield-checkmark-outline" label="Data" value="Private to your account" />
          <View style={styles.divider} />
          <Row C={C} styles={styles} icon="information-circle-outline" label="Version" value="FrameFlow Studio 1.0" />
        </Card>

        <Btn title="Log out" variant="ghost" icon="log-out-outline" onPress={logout} testID="logout-btn" />
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
