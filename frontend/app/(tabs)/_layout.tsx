import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { F } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { useTranslation } from "react-i18next";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { C } = useTheme();
  const { t } = useTranslation("navigation");
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading]);

  if (loading || !user) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.onSurface2,
        tabBarStyle: {
          backgroundColor: C.surface2,
          borderTopColor: C.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: F.text, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: t("dashboard"), tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="projects" options={{ title: t("projects"), tabBarIcon: ({ color, size }) => <Ionicons name="folder-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="new" options={{ title: t("new"), tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 6} color={color} /> }} />
      <Tabs.Screen name="templates" options={{ title: t("templates"), tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: t("account"), tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
