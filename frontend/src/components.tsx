import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator, ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
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
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: C.borderStrong },
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
  return <Text style={[styles.h1, { fontSize: 34 * scale, lineHeight: 40 * scale }, style]}>{children}</Text>;
}
export function H2({ children, style }: any) {
  const { C, scale } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return <Text style={[styles.h2, { fontSize: 23 * scale }, style]}>{children}</Text>;
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
  return <Animated.View entering={FadeIn} style={[{ height, width, borderRadius: radius, backgroundColor: C.surface3 }, style]} />;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, testID }: any) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <AnimIn style={styles.empty} >
      <View testID={testID} style={styles.emptyInner}>
        <View style={styles.emptyIcon}><Ionicons name={icon} size={30} color={C.brand} /></View>
        <H2 style={{ marginTop: S.lg, textAlign: "center" }}>{title}</H2>
        <Body muted style={{ textAlign: "center", marginTop: 6, marginBottom: S.lg, maxWidth: 320 }}>{subtitle}</Body>
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

const createStyles = (C: Palette) => StyleSheet.create({
  label: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginBottom: S.sm, letterSpacing: 0.6, textTransform: "uppercase" },
  input: { backgroundColor: C.surface2, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: S.md, color: C.onSurface, fontFamily: F.text, fontSize: 15, borderWidth: 1, borderColor: C.border, minHeight: 50, justifyContent: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowCenter: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", padding: S.xl },
  centerSheet: { backgroundColor: C.surface2, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.borderStrong, maxWidth: 440, width: "100%", alignSelf: "center" },
  sheetTitle: { color: C.onSurface, fontFamily: F.text, fontSize: 15, fontWeight: "600", marginBottom: S.md },
  optRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  btn: { borderRadius: R.md, paddingVertical: 14, paddingHorizontal: S.lg, alignItems: "center", justifyContent: "center", minHeight: 50 },
  segment: { flexDirection: "row", backgroundColor: C.surface2, borderRadius: R.md, padding: 4, borderWidth: 1, borderColor: C.border },
  segItem: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: R.sm },
  h1: { color: C.onSurface, fontFamily: F.display, fontSize: 34, fontWeight: "500", lineHeight: 40 },
  h2: { color: C.onSurface, fontFamily: F.display, fontSize: 23, fontWeight: "500" },
  body: { color: C.onSurface, fontFamily: F.text, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  badgeText: { fontFamily: F.text, fontSize: 11, fontWeight: "500" },
  statCard: { flex: 1, minWidth: 100, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md },
  statIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.sm },
  statValue: { color: C.onSurface, fontFamily: F.display, fontSize: 26 },
  statLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginTop: 2 },
  empty: { alignItems: "center", padding: S.xl },
  emptyInner: { alignItems: "center", backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xxl, width: "100%" },
  emptyIcon: { width: 66, height: 66, borderRadius: R.lg, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  mockBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.brandTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, alignSelf: "flex-start" },
});
