import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { C, S, F } from "@/src/theme";
import { Field, Btn, H1, Body } from "@/src/components";

export default function Reset() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const request = async () => {
    setErr(""); setMsg("");
    if (!email) return setErr("Enter your email.");
    setLoading(true);
    try {
      const res = await api.resetRequest(email.trim());
      setMsg("If that email exists, a reset token was created. Enter it below.");
      if (res?.dev_token) setToken(res.dev_token);
      setStep(2);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  const confirm = async () => {
    setErr(""); setMsg("");
    if (!token || !pw) return setErr("Enter the token and a new password.");
    setLoading(true);
    try {
      await api.resetConfirm(token.trim(), pw);
      setMsg("Password updated. You can sign in now.");
      setStep(3);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + S.xxxl }]}>
        <View style={styles.inner}>
          <H1 style={{ marginBottom: S.sm }}>Reset password</H1>
          <Body muted style={{ marginBottom: S.xl }}>Recover access to your account.</Body>

          {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}
          {msg ? <View style={styles.okBox}><Text style={styles.okText}>{msg}</Text></View> : null}

          {step === 1 && (
            <>
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@studio.com"
                keyboardType="email-address" testID="reset-email" />
              <Btn title="Send reset token" onPress={request} loading={loading} testID="reset-request" />
            </>
          )}
          {step === 2 && (
            <>
              <Field label="Reset token" value={token} onChangeText={setToken} placeholder="Paste token" testID="reset-token" />
              <Field label="New password" value={pw} onChangeText={setPw} placeholder="New password" secureTextEntry testID="reset-newpw" />
              <Btn title="Update password" onPress={confirm} loading={loading} testID="reset-confirm" />
            </>
          )}
          {step === 3 && (
            <Btn title="Back to sign in" onPress={() => router.replace("/login")} testID="reset-done" />
          )}

          <Pressable onPress={() => router.replace("/login")} style={{ marginTop: S.xl, alignItems: "center" }}>
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: "center", padding: S.xl },
  inner: { width: "100%", maxWidth: 440 },
  link: { color: C.brand, fontFamily: F.text, fontSize: 14 },
  errBox: { backgroundColor: C.error, borderRadius: 8, padding: S.md, marginBottom: S.lg },
  errText: { color: "#fff", fontFamily: F.text, fontSize: 13 },
  okBox: { backgroundColor: C.success, borderRadius: 8, padding: S.md, marginBottom: S.lg },
  okText: { color: "#fff", fontFamily: F.text, fontSize: 13 },
});
