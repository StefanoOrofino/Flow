import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { api } from "@/src/api";
import { S, F, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { Field, Btn } from "@/src/components";
import AuthShell from "@/src/AuthShell";

export default function Reset() {
  const router = useRouter();
  const { C } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(C), [C]);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const request = async () => {
    setErr(""); setMsg("");
    if (!email) return setErr(t("validation:emailRequired"));
    setLoading(true);
    try {
      const res = await api.resetRequest(email.trim());
      setMsg(t("auth:resetSent"));
      if (res?.dev_token) setToken(res.dev_token);
      setStep(2);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  const confirm = async () => {
    setErr(""); setMsg("");
    if (!token || !pw) return setErr(t("validation:tokenPasswordRequired"));
    setLoading(true);
    try {
      await api.resetConfirm(token.trim(), pw);
      setMsg(t("auth:resetDone"));
      setStep(3);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <AuthShell title={t("auth:resetTitle")} subtitle={t("auth:resetSubtitle")}>
      {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}
      {msg ? <View style={styles.okBox}><Text style={styles.okText}>{msg}</Text></View> : null}

      {step === 1 && (
        <>
          <Field label={t("auth:email")} value={email} onChangeText={setEmail} placeholder={t("auth:emailPlaceholder")}
            keyboardType="email-address" testID="reset-email" />
          <Btn title={t("auth:sendResetToken")} onPress={request} loading={loading} testID="reset-request" style={{ marginTop: S.md }} />
        </>
      )}
      {step === 2 && (
        <>
          <Field label={t("auth:resetTokenLabel")} value={token} onChangeText={setToken} placeholder={t("auth:resetTokenPlaceholder")} testID="reset-token" />
          <Field label={t("auth:newPassword")} value={pw} onChangeText={setPw} placeholder={t("auth:newPassword")} secureTextEntry testID="reset-newpw" />
          <Btn title={t("auth:updatePassword")} onPress={confirm} loading={loading} testID="reset-confirm" style={{ marginTop: S.md }} />
        </>
      )}
      {step === 3 && (
        <Btn title={t("auth:backToSignIn")} onPress={() => router.replace("/login")} testID="reset-done" />
      )}

      <Pressable onPress={() => router.replace("/login")} style={{ marginTop: S.xl, alignItems: "center" }}>
        <Text style={styles.link}>{t("auth:backToSignIn")}</Text>
      </Pressable>
    </AuthShell>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  link: { color: C.brand, fontFamily: F.text, fontSize: 14 },
  errBox: { backgroundColor: C.errorTint, borderWidth: 1, borderColor: C.error, borderRadius: 10, padding: S.md, marginBottom: S.md },
  errText: { color: C.onErrorTint, fontFamily: F.text, fontSize: 13 },
  okBox: { backgroundColor: C.successTint, borderWidth: 1, borderColor: C.success, borderRadius: 10, padding: S.md, marginBottom: S.md },
  okText: { color: C.onSuccessTint, fontFamily: F.text, fontSize: 13 },
});
