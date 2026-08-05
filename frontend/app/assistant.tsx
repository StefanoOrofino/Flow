import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/ThemeProvider";
import { S } from "@/src/theme";
import { AssistantChat } from "@/src/components/AssistantChat";

export default function AssistantScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.top, { paddingTop: insets.top + S.sm, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="assistant-back">
          <Ionicons name="arrow-back" size={22} color={C.onSurface} />
        </Pressable>
      </View>
      <AssistantChat projectId={projectId || null} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: S.lg, paddingBottom: S.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
