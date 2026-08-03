import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { C, S, F } from "@/src/theme";
import { Field, Btn } from "@/src/components";
import AuthShell from "@/src/AuthShell";

export default function Reset() {
  const router = useRouter();
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
    <AuthShell title="Reset password" subtitle="Recover access to your account.">
      {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}
      {msg ? <View style={styles.okBox}><Text style={styles.okText}>{msg}</Text></View> : null}

      {step === 1 && (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@studio.com"
            keyboardType="email-address" testID="reset-email" />
          <Btn title="Send reset token" onPress={request} loading={loading} testID="reset-request" style={{ marginTop: S.md }} />
        </>
      )}
      {step === 2 && (
        <>
          <Field label="Reset token" value={token} onChangeText={setToken} placeholder="Paste token" testID="reset-token" />
          <Field label="New password" value={pw} onChangeText={setPw} placeholder="New password" secureTextEntry testID="reset-newpw" />
          <Btn title="Update password" onPress={confirm} loading={loading} testID="reset-confirm" style={{ marginTop: S.md }} />
        </>
      )}
      {step === 3 && (
        <Btn title="Back to sign in" onPress={() => router.replace("/login")} testID="reset-done" />
      )}

      <Pressable onPress={() => router.replace("/login")} style={{ marginTop: S.xl, alignItems: "center" }}>
        <Text style={styles.link}>Back to sign in</Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { color: C.brand, fontFamily: F.text, fontSize: 14 },
  errBox: { backgroundColor: "rgba(139,43,43,0.18)", borderWidth: 1, borderColor: C.error, borderRadius: 10, padding: S.md, marginBottom: S.md },
  errText: { color: "#F2C9C9", fontFamily: F.text, fontSize: 13 },
  okBox: { backgroundColor: "rgba(62,102,70,0.2)", borderWidth: 1, borderColor: C.success, borderRadius: 10, padding: S.md, marginBottom: S.md },
  okText: { color: "#BFE3C7", fontFamily: F.text, fontSize: 13 },
});
