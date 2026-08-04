import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { S, F, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { Field, Btn } from "@/src/components";
import AuthShell from "@/src/AuthShell";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
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
    <AuthShell title="Welcome back" subtitle="Sign in to your production suite.">
      {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}
      {notice ? <View style={styles.noticeBox}><Text style={styles.noticeText}>{notice}</Text></View> : null}

      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@studio.com"
        keyboardType="email-address" testID="login-email" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••"
        secureTextEntry testID="login-password" />

      <Pressable onPress={() => router.push("/reset")} testID="forgot-link" style={{ alignSelf: "flex-end" }}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>

      <Btn title="Continue" onPress={submit} loading={loading} testID="login-submit" style={{ marginTop: S.md }} />

      <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>OR</Text><View style={styles.line} /></View>

      <Btn title="Sign in with Google" variant="ghost" icon="logo-google" onPress={loginWithGoogle} testID="google-login" style={{ marginBottom: S.sm }} />
      <Btn title="Sign in with Apple" variant="ghost" icon="logo-apple"
        onPress={() => setNotice("Apple Sign-In is coming soon — please continue with email or Google.")} testID="apple-login" />

      <View style={styles.footer}>
        <Text style={styles.muted}>New here? </Text>
        <Pressable onPress={() => router.push("/signup")} testID="goto-signup">
          <Text style={styles.link}>Create account</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  link: { color: C.brand, fontFamily: F.text, fontSize: 14, marginTop: 4 },
  muted: { color: C.onSurface2, fontFamily: F.text, fontSize: 14 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: S.lg },
  line: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, letterSpacing: 2 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: S.xl },
  errBox: { backgroundColor: C.errorTint, borderWidth: 1, borderColor: C.error, borderRadius: 10, padding: S.md, marginBottom: S.md },
  errText: { color: C.onErrorTint, fontFamily: F.text, fontSize: 13 },
  noticeBox: { backgroundColor: C.brandTint, borderWidth: 1, borderColor: C.focus, borderRadius: 10, padding: S.md, marginBottom: S.md },
  noticeText: { color: C.onBrandTint, fontFamily: F.text, fontSize: 13 },
});
