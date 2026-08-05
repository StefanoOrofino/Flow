import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { F } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { useTranslation } from "react-i18next";
import { storage } from "@/src/utils/storage";
import { AssistantFab } from "@/src/components/AssistantFab";
import { ONBOARDING_KEY } from "@/app/onboarding";

const ICON = 25; // 24–26px per spec

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { C } = useTheme();
  const { t } = useTranslation("navigation");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading]);

  useEffect(() => {
    if (loading || !user) return;
    storage.getItem<boolean>(ONBOARDING_KEY, false).then((done) => {
      if (!done) router.replace("/onboarding");
    });
  }, [user, loading]);

  if (loading || !user) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }

  // Respect the home-indicator / gesture inset; keep a comfortable minimum on
  // devices that report 0 (older iPhones with a home button, Android, web).
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 10);
  const paddingTop = 8;
  const contentHeight = 60; // icon + label; keeps every touch target >= 44pt

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.brand,
          tabBarInactiveTintColor: C.onSurface2,
          tabBarStyle: {
            backgroundColor: C.surface2,
            borderTopColor: C.border,
            borderTopWidth: 1,
            // Reserve top padding + bottom inset ON TOP of the content height so
            // the label is never clipped (web uses border-box sizing).
            height: contentHeight + paddingTop + bottomInset,
            paddingBottom: bottomInset,
            paddingTop,
          },
          tabBarItemStyle: { minHeight: 44, paddingVertical: 2 },
          tabBarIconStyle: { marginTop: 1 },
          tabBarLabelStyle: { fontFamily: F.text, fontSize: 12, fontWeight: "500", marginTop: 1, marginBottom: 0 },
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: t("dashboard"), tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={ICON} color={color} /> }} />
        <Tabs.Screen name="projects" options={{ title: t("projects"), tabBarIcon: ({ color }) => <Ionicons name="folder-outline" size={ICON} color={color} /> }} />
        <Tabs.Screen name="new" options={{ title: t("new"), tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={ICON + 6} color={color} /> }} />
        <Tabs.Screen name="templates" options={{ title: t("templates"), tabBarIcon: ({ color }) => <Ionicons name="albums-outline" size={ICON} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: t("account"), tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={ICON} color={color} /> }} />
      </Tabs>
      <AssistantFab bottomOffset={contentHeight + paddingTop + bottomInset + 14} />
    </View>
  );
}
