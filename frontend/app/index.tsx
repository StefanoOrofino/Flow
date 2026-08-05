import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { useTheme } from "@/src/ThemeProvider";
import Landing from "./landing";

export default function Index() {
  const { user, loading } = useAuth();
  const { C } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
  }, [user, loading]);

  // While auth is resolving, or once a user is present (redirecting to dashboard),
  // show a splash. Logged-out visitors see the public marketing landing page.
  if (loading || user) {
    return (
      <View style={[styles.c, { backgroundColor: C.surface }]} testID="splash-screen">
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }

  return <Landing />;
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center" },
});
