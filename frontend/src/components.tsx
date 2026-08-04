import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator, ViewStyle, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { S, R, F, Palette } from "./theme";
import { useTheme } from "./ThemeProvider";

export function Label({ children }: { children: React.ReactNode }) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return <Text style={styles.label}>{children}</Text>;
}

export function AnimIn({ children, delay = 0, style }: any) {
  const { reduceMotion } = useTheme();
  if (reduceMotion) return <Animated.View style={style}>{children}</Animated.View>;
  return <Animated.View entering={FadeInDown.delay(delay).duration(360).springify()} style={style}>{children}</Animated.View>;
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, secureTextEntry, testID }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={{ marginBottom: S.lg }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.onSurface2}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && { minHeight: 96, textAlignVertical: "top", paddingTop: S.md }]}
      />
    </View>
  );
}

export function Picker({ label, value, options, onSelect, testID }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: S.lg }}>
      {label ? <Label>{label}</Label> : null}
      <Pressable testID={testID} style={styles.input} onPress={() => setOpen(true)}>
        <View style={styles.rowBetween}>
          <Text style={{ color: value ? C.onSurface : C.onSurface2, fontFamily: F.text, fontSize: 15 }}>{value || "Select…"}</Text>
          <Ionicons name="chevron-down" size={16} color={C.onSurface2} />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpen(false)}>
          <Animated.View entering={FadeInDown.duration(220)} style={styles.centerSheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {options.map((opt: string) => (
                <Pressable key={opt} testID={`opt-${opt}`} style={styles.optRow} onPress={() => { onSelect(opt); setOpen(false); }}>
                  <Text style={{ color: opt === value ? C.brand : C.onSurface, fontFamily: F.text, fontSize: 15 }}>{opt}</Text>
                  {opt === value ? <Ionicons name="checkmark" size={18} color={C.brand} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Btn({ title, onPress, variant = "primary", icon, loading, disabled, testID, style, small }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const bg = variant === "primary" ? C.brand : variant === "ghost" ? "transparent" : C.surface3;
  const fg = variant === "primary" ? C.onBrand : C.onSurface;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && { paddingVertical: 9, paddingHorizontal: S.md, minHeight: 38 },
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.94 : 1, transform: [{ scale: pressed && !disabled ? 0.985 : 1 }] },
        variant === "ghost" && { borderWidth: 1, borderColor: C.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={styles.rowCenter}>
          {icon ? <Ionicons name={icon} size={small ? 14 : 16} color={fg} style={{ marginRight: 7 }} /> : null}
          <Text style={{ color: fg, fontFamily: F.text, fontSize: small ? 13 : 15, fontWeight: "500" }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Segmented({ options, value, onChange, testID }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.segment} testID={testID}>
      {options.map((o: string) => {
        const active = o === value;
        return (
          <Pressable key={o} testID={`seg-${o}`} onPress={() => onChange(o)} style={[styles.segItem, active && { backgroundColor: C.brand }]}>
            <Text style={{ color: active ? C.onBrand : C.onSurface2, fontFamily: F.text, fontSize: 13, fontWeight: "500" }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function H1({ children, style }: any) {
  const { C, scale } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return <Text style={[styles.h1, { fontSize: 33 * scale, lineHeight: 39 * scale, letterSpacing: -0.4 }, style]}>{children}</Text>;
}
export function H2({ children, style }: any) {
  const { C, scale } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return <Text style={[styles.h2, { fontSize: 22 * scale, letterSpacing: -0.2 }, style]}>{children}</Text>;
}
export function Body({ children, style, muted, numberOfLines }: any) {
  const { C, scale } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return <Text numberOfLines={numberOfLines} style={[styles.body, { fontSize: 14 * scale, lineHeight: 22 * scale }, muted && { color: C.onSurface2 }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "brand" }) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const bg = tone === "success" ? C.successTint : tone === "brand" ? C.brandTint : C.surface3;
  const fg = tone === "success" ? C.onSuccessTint : tone === "brand" ? C.onBrandTint : C.onSurface2;
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeText, { color: fg }]}>{label}</Text></View>;
}

export function StatCard({ icon, value, label, delay }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <AnimIn delay={delay} style={styles.statCard}>
      <View style={styles.statIcon}><Ionicons name={icon} size={16} color={C.brand} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </AnimIn>
  );
}

export function Skeleton({ height = 16, width = "100%", radius = 8, style }: any) {
  const { C } = useTheme();
  return <Animated.View entering={FadeIn.duration(300)} style={[{ height, width, borderRadius: radius, backgroundColor: C.surface3, opacity: 0.7 }, style]} />;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, testID }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <AnimIn style={styles.empty} >
      <View testID={testID} style={styles.emptyInner}>
        <View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={C.brand} /></View>
        <H2 style={{ marginTop: S.lg, textAlign: "center" }}>{title}</H2>
        <Body muted style={{ textAlign: "center", marginTop: 8, marginBottom: S.xl, maxWidth: 300 }}>{subtitle}</Body>
        {actionLabel ? <Btn title={actionLabel} icon="add" onPress={onAction} /> : null}
      </View>
    </AnimIn>
  );
}

export function MockBadge() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.mockBadge}>
      <Ionicons name="flask-outline" size={12} color={C.onBrandTint} />
      <Text style={{ color: C.onBrandTint, fontSize: 11, marginLeft: 4, fontFamily: F.text }}>MOCK MODE (add LLM balance for live AI)</Text>
    </View>
  );
}

/**
 * Searchable multi-select with removable, reorderable chips + a free-text
 * "Custom" value. Opens a bottom-sheet on phones, a centered sheet on wide.
 */
export function MultiSelect({ label, values = [], options = [], onChange, custom = "", onCustomChange, testID }: {
  label?: string; values?: string[]; options?: string[]; onChange: (v: string[]) => void;
  custom?: string; onCustomChange?: (v: string) => void; testID?: string;
}) {
  const { C } = useTheme();
  const { t } = useTranslation("common");
  const styles = useMemo(() => createStyles(C), [C]);
  const { width } = useWindowDimensions();
  const phone = width < 700;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customDraft, setCustomDraft] = useState("");

  const toggle = (opt: string) => onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  const remove = (opt: string) => onChange(values.filter((v) => v !== opt));
  const moveUp = (i: number) => { if (i <= 0) return; const next = [...values]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; onChange(next); };
  const addCustom = () => { const v = customDraft.trim(); if (!v) return; onCustomChange && onCustomChange(v); setCustomDraft(""); };
  const filtered = options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));
  const hasChips = values.length > 0 || !!custom;

  return (
    <View style={{ marginBottom: S.lg }}>
      {label ? <Label>{label}</Label> : null}
      <Pressable style={styles.input} onPress={() => setOpen(true)} testID={testID}>
        {hasChips ? (
          <View style={styles.msChipWrap}>
            {values.map((v, i) => (
              <View key={v} style={styles.msChip} testID={`${testID}-chip-${v}`}>
                <Text style={styles.msChipText} numberOfLines={1}>{v}</Text>
                <Pressable onPress={() => remove(v)} hitSlop={8} testID={`${testID}-remove-${v}`}><Ionicons name="close" size={13} color={C.onBrandTint} /></Pressable>
              </View>
            ))}
            {!!custom && (
              <View style={[styles.msChip, { backgroundColor: C.surface3 }]}>
                <Ionicons name="create-outline" size={12} color={C.onSurface2} />
                <Text style={[styles.msChipText, { color: C.onSurface }]} numberOfLines={1}>{custom}</Text>
                <Pressable onPress={() => onCustomChange && onCustomChange("")} hitSlop={8}><Ionicons name="close" size={13} color={C.onSurface2} /></Pressable>
              </View>
            )}
          </View>
        ) : (
          <Text style={{ color: C.onSurface2, fontFamily: F.text, fontSize: 15 }}>{t("multiselect.empty")}</Text>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType={phone ? "slide" : "fade"} onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.modalBg, phone && { justifyContent: "flex-end", padding: 0 }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.centerSheet, phone && styles.bottomSheet]} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.msHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} testID={`${testID}-done`}><Text style={{ color: C.brand, fontFamily: F.text, fontSize: 15, fontWeight: "600" }}>{t("multiselect.done")}</Text></Pressable>
            </View>

            <View style={styles.msSearch}>
              <Ionicons name="search" size={15} color={C.onSurface2} />
              <TextInput value={query} onChangeText={setQuery} placeholder={t("multiselect.search")} placeholderTextColor={C.onSurface2}
                style={{ flex: 1, color: C.onSurface, fontFamily: F.text, fontSize: 14, paddingVertical: 8 }} testID={`${testID}-search`} />
            </View>

            {values.length > 0 && (
              <View style={{ marginBottom: S.sm }}>
                <Text style={styles.msSelLabel}>{t("multiselect.selected")}</Text>
                {values.map((v, i) => (
                  <View key={v} style={styles.msSelRow}>
                    <Pressable onPress={() => moveUp(i)} disabled={i === 0} hitSlop={6} style={{ opacity: i === 0 ? 0.3 : 1 }}><Ionicons name="arrow-up" size={16} color={C.onSurface2} /></Pressable>
                    <Text style={{ flex: 1, color: C.onSurface, fontFamily: F.text, fontSize: 14 }} numberOfLines={1}>{i + 1}. {v}</Text>
                    <Pressable onPress={() => remove(v)} hitSlop={6}><Ionicons name="close-circle" size={17} color={C.onSurface2} /></Pressable>
                  </View>
                ))}
              </View>
            )}

            <ScrollView style={{ maxHeight: phone ? 300 : 340 }} keyboardShouldPersistTaps="handled">
              {filtered.map((o) => {
                const on = values.includes(o);
                return (
                  <Pressable key={o} style={styles.optRow} onPress={() => toggle(o)} testID={`${testID}-opt-${o}`}>
                    <Text style={{ color: on ? C.brand : C.onSurface, fontFamily: F.text, fontSize: 15, flex: 1 }}>{o}</Text>
                    <Ionicons name={on ? "checkbox" : "square-outline"} size={19} color={on ? C.brand : C.onSurface2} />
                  </Pressable>
                );
              })}
              {filtered.length === 0 && <Text style={{ color: C.onSurface2, fontFamily: F.text, fontSize: 13, padding: S.md }}>{t("multiselect.none")}</Text>}
            </ScrollView>

            {onCustomChange && (
              <View style={styles.msCustomRow}>
                <TextInput value={customDraft} onChangeText={setCustomDraft} placeholder={t("multiselect.customPlaceholder")} placeholderTextColor={C.onSurface2}
                  style={styles.msCustomInput} onSubmitEditing={addCustom} testID={`${testID}-custom`} />
                <Pressable style={styles.msAddBtn} onPress={addCustom} testID={`${testID}-custom-add`}><Text style={{ color: C.onBrand, fontFamily: F.text, fontSize: 13, fontWeight: "600" }}>{t("multiselect.add")}</Text></Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  label: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, marginBottom: S.sm, letterSpacing: 0.4, textTransform: "uppercase" },
  input: { backgroundColor: C.surface3, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: S.md, color: C.onSurface, fontFamily: F.text, fontSize: 15, borderWidth: 1, borderColor: C.border, minHeight: 50, justifyContent: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowCenter: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", padding: S.xl },
  centerSheet: { backgroundColor: C.surface3, borderRadius: R.lg, padding: S.xl, borderWidth: 1, borderColor: C.border, maxWidth: 440, width: "100%", alignSelf: "center" },
  sheetTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600", marginBottom: S.md },
  optRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  btn: { borderRadius: R.md, paddingVertical: 14, paddingHorizontal: S.lg, alignItems: "center", justifyContent: "center", minHeight: 50 },
  segment: { flexDirection: "row", backgroundColor: C.surface3, borderRadius: R.md, padding: 4 },
  segItem: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: R.sm },
  h1: { color: C.onSurface, fontFamily: F.display, fontSize: 33, fontWeight: "500", lineHeight: 39 },
  h2: { color: C.onSurface, fontFamily: F.display, fontSize: 22, fontWeight: "500" },
  body: { color: C.onSurface, fontFamily: F.text, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: 20 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  badgeText: { fontFamily: F.text, fontSize: 11, fontWeight: "500" },
  statCard: { flex: 1, minWidth: 100, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  statIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.md },
  statValue: { color: C.onSurface, fontFamily: F.display, fontSize: 27, letterSpacing: -0.3 },
  statLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginTop: 2 },
  empty: { alignItems: "center", padding: S.xl },
  emptyInner: { alignItems: "center", backgroundColor: "transparent", padding: S.xl, width: "100%" },
  emptyIcon: { width: 60, height: 60, borderRadius: R.lg, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  mockBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.brandTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, alignSelf: "flex-start" },
  msChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 2 },
  msChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.brandTint, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6, maxWidth: "100%" },
  msChipText: { color: C.onBrandTint, fontFamily: F.text, fontSize: 12.5, flexShrink: 1 },
  bottomSheet: { maxWidth: "100%", width: "100%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, alignSelf: "stretch", paddingBottom: S.xl },
  msHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.md },
  msSearch: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, marginBottom: S.sm },
  msSelLabel: { color: C.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  msSelRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  msCustomRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: S.sm },
  msCustomInput: { flex: 1, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, color: C.onSurface, fontFamily: F.text, fontSize: 14, paddingHorizontal: 12, minHeight: 44 },
  msAddBtn: { backgroundColor: C.brand, borderRadius: R.md, paddingHorizontal: 16, minHeight: 44, alignItems: "center", justifyContent: "center" },
});
