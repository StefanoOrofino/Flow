import React, { useMemo, useState } from "react";
import { View, Pressable, Modal, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/ThemeProvider";
import { R } from "@/src/theme";
import { AssistantChat } from "@/src/components/AssistantChat";

/** Floating assistant button + bottom-sheet chat. Available across the app. */
export function AssistantFab({ projectId, bottomOffset = 24 }: { projectId?: string | null; bottomOffset?: number }) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <>
      <Pressable
        style={[styles.fab, { bottom: bottomOffset + (Platform.OS === "web" ? 0 : insets.bottom / 2) }]}
        onPress={() => setOpen(true)}
        testID="assistant-fab"
        accessibilityLabel="Open AI assistant"
      >
        <Ionicons name="chatbubbles" size={24} color={C.onBrand} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.sheetBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} testID="assistant-backdrop" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.grabber} />
            <AssistantChat projectId={projectId} onClose={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  fab: {
    position: "absolute", right: 18, width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  sheetBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { height: "86%", backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, overflow: "hidden" },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 8, marginBottom: 2 },
});
