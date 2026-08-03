import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { C, S, R, F, MAX_W } from "@/src/theme";
import { H1, H2, Body, Btn, Card } from "@/src/components";

export default function Settings() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + S.lg }]}>
        <H1>Account</H1>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingTop: S.md, paddingBottom: S.xxxl, maxWidth: MAX_W, alignSelf: "center", width: "100%" }}>
        <Card style={{ marginBottom: S.lg }}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}><Ionicons name="person" size={26} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <H2>{user?.name || "Director"}</H2>
              <Body muted>{user?.email}</Body>
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom: S.lg }}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <Row icon="color-palette-outline" label="Theme" value="Cinematic Dark" />
          <Row icon="language-outline" label="Default language" value="English" />
          <Row icon="film-outline" label="Default aspect ratio" value="16:9" />
        </Card>

        <Card style={{ marginBottom: S.lg }}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <Row icon="sparkles-outline" label="AI engine" value="Modular provider" />
          <Row icon="shield-checkmark-outline" label="Data" value="Private to your account" />
        </Card>

        <Btn title="Log out" variant="ghost" icon="log-out-outline" onPress={logout} testID="logout-btn" />
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value }: any) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={C.onSurface2} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: S.xl, paddingBottom: S.sm },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  avatar: { width: 54, height: 54, borderRadius: R.pill, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  sectionLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, letterSpacing: 2, marginBottom: S.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: S.md, borderTopWidth: 1, borderTopColor: C.border, gap: S.md },
  rowLabel: { color: C.onSurface, fontFamily: F.text, fontSize: 14, flex: 1 },
  rowValue: { color: C.onSurface2, fontFamily: F.text, fontSize: 13 },
});
