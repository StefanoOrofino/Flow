import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { S, F, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { Field, Btn } from "@/src/components";
import AuthShell from "@/src/AuthShell";

export default function Signup() {
  const { register, loginWithGoogle } = useAuth();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email || !password) return setErr("Email and password are required.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Start building cinematic productions with AI.">
      {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}

      <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" testID="signup-name" />
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@studio.com"
        keyboardType="email-address" testID="signup-email" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters"
        secureTextEntry testID="signup-password" />

      <Btn title="Create Account" onPress={submit} loading={loading} testID="signup-submit" style={{ marginTop: S.md }} />

      <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>OR</Text><View style={styles.line} /></View>
      <Btn title="Sign in with Google" variant="ghost" icon="logo-google" onPress={loginWithGoogle} testID="google-signup" />

      <View style={styles.footer}>
        <Text style={styles.muted}>Already have an account? </Text>
        <Pressable onPress={() => router.replace("/login")} testID="goto-login">
          <Text style={styles.link}>Sign in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  link: { color: C.brand, fontFamily: F.text, fontSize: 14 },
  muted: { color: C.onSurface2, fontFamily: F.text, fontSize: 14 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: S.lg },
  line: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, letterSpacing: 2 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: S.xl },
  errBox: { backgroundColor: C.errorTint, borderWidth: 1, borderColor: C.error, borderRadius: 10, padding: S.md, marginBottom: S.md },
  errText: { color: C.onErrorTint, fontFamily: F.text, fontSize: 13 },
});
