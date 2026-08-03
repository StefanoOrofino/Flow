import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { C, S, F, MAX_W } from "@/src/theme";
import { Field, Btn, H1, Body } from "@/src/components";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email || !password) return setErr("Enter your email and password.");
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + S.xxxl }]}>
        <View style={styles.inner}>
          <View style={styles.brandRow}>
            <Ionicons name="film-outline" size={24} color={C.brand} />
            <Text style={styles.brandText}>STORYBOARD AI</Text>
          </View>
          <H1 style={{ marginBottom: S.sm }}>Welcome back</H1>
          <Body muted style={{ marginBottom: S.xl }}>Sign in to your production suite.</Body>

          {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}

          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@studio.com"
            keyboardType="email-address" testID="login-email" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••"
            secureTextEntry testID="login-password" />

          <Pressable onPress={() => router.push("/reset")} testID="forgot-link">
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>

          <Btn title="Sign In" onPress={submit} loading={loading} testID="login-submit" style={{ marginTop: S.lg }} />

          <View style={styles.divider}><Text style={styles.dividerText}>OR</Text></View>

          <Btn title="Continue with Google" variant="ghost" icon="logo-google"
            onPress={loginWithGoogle} testID="google-login" />

          <View style={styles.footer}>
            <Body muted>New here? </Body>
            <Pressable onPress={() => router.push("/signup")} testID="goto-signup">
              <Text style={styles.link}>Create an account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: "center", padding: S.xl },
  inner: { width: "100%", maxWidth: 440 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: S.xxl },
  brandText: { color: C.brand, fontFamily: F.text, fontSize: 14, letterSpacing: 3, marginLeft: 8, fontWeight: "600" },
  link: { color: C.brand, fontFamily: F.text, fontSize: 14, marginTop: 4 },
  divider: { alignItems: "center", marginVertical: S.lg },
  dividerText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, letterSpacing: 2 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: S.xl },
  errBox: { backgroundColor: C.error, borderRadius: 8, padding: S.md, marginBottom: S.lg },
  errText: { color: "#fff", fontFamily: F.text, fontSize: 13 },
});
