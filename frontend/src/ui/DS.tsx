/**
 * FrameFlow Design System v1 — interaction primitives.
 * Chip, Tabs, Table, Modal, Tooltip, and a Toast provider/hook.
 * Gold accent only, minimal borders, 8pt spacing, rounded, dark + light, responsive.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal as RNModal } from "react-native";
import Animated, { FadeInUp, FadeOutUp, FadeIn } from "react-native-reanimated";
import { S, R, F, Palette } from "../theme";
import { useTheme } from "../ThemeProvider";
import { Icon, IconName } from "./Icon";

/* ------------------------------- Chip ---------------------------------- */
export function Chip({ label, active, onPress, icon, testID }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName; testID?: string }) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} testID={testID} style={({ pressed }) => [{
      flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: R.pill, backgroundColor: active ? C.brand : C.surface2,
      borderWidth: active ? 0 : 1, borderColor: C.border, opacity: pressed ? 0.9 : 1,
    }]}>
      {icon ? <Icon name={icon} size={14} color={active ? C.onBrand : C.onSurface2} strokeWidth={2} /> : null}
      <Text style={{ color: active ? C.onBrand : C.onSurface2, fontFamily: F.text, fontSize: 12.5, fontWeight: active ? "600" : "500" }}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------- Tabs ---------------------------------- */
export function Tabs({ tabs, value, onChange, testID }: { tabs: { key: string; label: string; icon?: IconName }[]; value: string; onChange: (k: string) => void; testID?: string }) {
  const { C } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} testID={testID}
      contentContainerStyle={{ gap: S.xl, paddingHorizontal: 2 }}
      style={{ borderBottomWidth: 1, borderBottomColor: C.border }}>
      {tabs.map((tb) => {
        const on = tb.key === value;
        return (
          <Pressable key={tb.key} onPress={() => onChange(tb.key)} testID={`tab-${tb.key}`}
            style={{ paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 6, borderBottomWidth: 2, borderBottomColor: on ? C.brand : "transparent" }}>
            {tb.icon ? <Icon name={tb.icon} size={15} color={on ? C.brand : C.onSurface2} /> : null}
            <Text style={{ color: on ? C.onSurface : C.onSurface2, fontFamily: F.text, fontSize: 14, fontWeight: on ? "600" : "500" }}>{tb.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------ Table ---------------------------------- */
type Col = { key: string; label: string; flex?: number; align?: "left" | "right" | "center" };
export function Table({ columns, rows, renderCell, onRowPress, testID }: {
  columns: Col[]; rows: any[]; renderCell?: (row: any, col: Col) => React.ReactNode; onRowPress?: (row: any) => void; testID?: string;
}) {
  const { C } = useTheme();
  const align = (a?: string) => (a === "right" ? "flex-end" : a === "center" ? "center" : "flex-start");
  const txtAlign = (a?: string): any => a || "left";
  return (
    <View testID={testID} style={{ borderRadius: R.lg, overflow: "hidden", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border }}>
      <View style={{ flexDirection: "row", paddingHorizontal: S.lg, paddingVertical: 12, backgroundColor: C.surface3 }}>
        {columns.map((c) => (
          <View key={c.key} style={{ flex: c.flex || 1, alignItems: align(c.align) }}>
            <Text style={{ color: C.onSurface2, fontFamily: F.text, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" }}>{c.label}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, i) => (
        <Pressable key={row.id || i} onPress={onRowPress ? () => onRowPress(row) : undefined}
          style={({ pressed }) => [{ flexDirection: "row", paddingHorizontal: S.lg, paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border, backgroundColor: pressed ? C.surface3 : "transparent" }]}>
          {columns.map((c) => (
            <View key={c.key} style={{ flex: c.flex || 1, alignItems: align(c.align), justifyContent: "center" }}>
              {renderCell ? renderCell(row, c) : <Text numberOfLines={1} style={{ color: C.onSurface, fontFamily: F.text, fontSize: 13.5, textAlign: txtAlign(c.align) }}>{String(row[c.key] ?? "—")}</Text>}
            </View>
          ))}
        </Pressable>
      ))}
    </View>
  );
}

/* ------------------------------ Modal ---------------------------------- */
export function Modal({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title?: string; children?: React.ReactNode; footer?: React.ReactNode }) {
  const { C } = useTheme();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: C.overlay, justifyContent: "center", padding: S.xl }} onPress={onClose}>
        <Animated.View entering={FadeIn.duration(160)}>
          <Pressable onPress={(e) => e.stopPropagation?.()} style={{ backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xl, maxWidth: 460, width: "100%", alignSelf: "center" }}>
            {title ? <Text style={{ color: C.onSurface, fontFamily: F.display, fontSize: 22, fontWeight: "500", marginBottom: S.md }}>{title}</Text> : null}
            {children}
            {footer ? <View style={{ marginTop: S.lg }}>{footer}</View> : null}
          </Pressable>
        </Animated.View>
      </Pressable>
    </RNModal>
  );
}

/* ----------------------------- Tooltip --------------------------------- */
export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const { C } = useTheme();
  const [show, setShow] = useState(false);
  return (
    <View style={{ position: "relative" }}>
      <Pressable onPressIn={() => setShow(true)} onPressOut={() => setShow(false)} onHoverIn={() => setShow(true)} onHoverOut={() => setShow(false)}>
        {children}
      </Pressable>
      {show && (
        <Animated.View entering={FadeIn.duration(120)} style={{ position: "absolute", bottom: "110%", alignSelf: "center", backgroundColor: C.onSurface, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6, zIndex: 50 }}>
          <Text style={{ color: C.surface, fontFamily: F.text, fontSize: 11.5 }}>{label}</Text>
        </Animated.View>
      )}
    </View>
  );
}

/* ------------------------------ Toast ---------------------------------- */
type ToastItem = { id: number; message: string; type: "info" | "success" | "error" };
const ToastCtx = createContext<{ show: (m: string, t?: ToastItem["type"]) => void }>({ show: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { C } = useTheme();
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, message, type }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  const color = (t: string) => (t === "success" ? C.success : t === "error" ? C.error : C.brand);
  const icon = (t: string): IconName => (t === "success" ? "check" : t === "error" ? "alert" : "info");
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={{ position: "absolute", top: 54, left: 0, right: 0, alignItems: "center", zIndex: 1000 }}>
        {items.map((it) => (
          <Animated.View key={it.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, maxWidth: 440, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
            <Icon name={icon(it.type)} size={17} color={color(it.type)} strokeWidth={2} />
            <Text style={{ color: C.onSurface, fontFamily: F.text, fontSize: 13.5, flexShrink: 1 }}>{it.message}</Text>
          </Animated.View>
        ))}
      </View>
    </ToastCtx.Provider>
  );
}

export const DS_TOKENS = { S, R };
export type { Palette };
