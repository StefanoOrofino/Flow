import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { useTheme } from "@/src/ThemeProvider";

export default function Index() {
  const { user, loading } = useAuth();
  const { C } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
    else router.replace("/login");
  }, [user, loading]);

  return (
    <View style={[styles.c, { backgroundColor: C.surface }]} testID="splash-screen">
      <ActivityIndicator color={C.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center" },
});
