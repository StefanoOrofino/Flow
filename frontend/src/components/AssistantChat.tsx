import React, { useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { api } from "@/src/api";
import { useTheme } from "@/src/ThemeProvider";
import { useLanguage } from "@/src/LanguageProvider";
import { LogoMark } from "@/src/brand/FrameFlowLogo";
import { S, R, F } from "@/src/theme";

type Msg = { role: "user" | "assistant"; content: string };

export function AssistantChat({ projectId, onClose }: { projectId?: string | null; onClose?: () => void }) {
  const { C } = useTheme();
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation("assistant");
  const styles = useMemo(() => createStyles(C), [C]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const suggestions = (t("suggestions", { returnObjects: true }) as unknown as string[]) || [];

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const r = await api.assistantChat({ messages: next, project_id: projectId || null, language: currentLanguage });
      setMessages((m) => [...m, { role: "assistant", content: r?.reply || t("error") }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: t("error") }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}><LogoMark color={C.brand} size={20} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("title")}</Text>
          <Text style={styles.headerSub}>{projectId ? t("subtitleProject") : t("subtitle")}</Text>
        </View>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={10} testID="assistant-close" style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={C.onSurface2} />
          </Pressable>
        ) : null}
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><LogoMark color={C.brand} size={34} gradient /></View>
            <Text style={styles.emptyTitle}>{t("greeting")}</Text>
            <Text style={styles.emptyBody}>{t("greetingBody")}</Text>
            <View style={styles.suggWrap}>
              {suggestions.map((s, i) => (
                <Pressable key={i} style={styles.sugg} onPress={() => send(s)} testID={`assistant-sugg-${i}`}>
                  <Ionicons name="sparkles-outline" size={13} color={C.brand} />
                  <Text style={styles.suggText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.role === "user" ? styles.rowUser : styles.rowBot]}>
            <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={[styles.bubbleText, item.role === "user" && { color: C.onBrand }]}>{item.content}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={[styles.bubbleRow, styles.rowBot]}>
              <View style={[styles.bubble, styles.bubbleBot, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <ActivityIndicator size="small" color={C.brand} />
                <Text style={styles.bubbleText}>{t("thinking")}</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t("placeholder")}
          placeholderTextColor={C.onSurface3}
          multiline
          testID="assistant-input"
          onSubmitEditing={() => send()}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
          testID="assistant-send"
        >
          <Ionicons name="arrow-up" size={20} color={C.onBrand} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: S.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  headerBadge: { width: 38, height: 38, borderRadius: R.md, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 18 },
  headerSub: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: R.pill, alignItems: "center", justifyContent: "center", backgroundColor: C.surface3 },

  listContent: { padding: S.lg, gap: S.sm, flexGrow: 1 },
  empty: { alignItems: "center", paddingVertical: S.xl, gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#171310", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 20, textAlign: "center" },
  emptyBody: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5, lineHeight: 20, textAlign: "center", maxWidth: 320, marginBottom: 6 },
  suggWrap: { gap: 8, width: "100%", marginTop: 4 },
  sugg: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44 },
  suggText: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, flex: 1 },

  bubbleRow: { flexDirection: "row" },
  rowUser: { justifyContent: "flex-end" },
  rowBot: { justifyContent: "flex-start" },
  bubble: { maxWidth: "86%", borderRadius: R.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: C.brand, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleText: { color: C.onSurface, fontFamily: F.text, fontSize: 14, lineHeight: 20 },

  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.surface },
  input: { flex: 1, color: C.onSurface, fontFamily: F.text, fontSize: 14.5, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, paddingHorizontal: 14, paddingVertical: Platform.OS === "web" ? 12 : 10, maxHeight: 120, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
});
