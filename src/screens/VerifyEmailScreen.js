import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendVerificationEmail, verifyEmail } from "../services/api";
import AuthDialog from "../components/AuthDialog";
import OtpInput from "../components/OtpInput";
import colors, { radius, spacing } from "../constants/colors";

function friendlyError(error) {
  const code = error.response?.data?.errorCode;
  if (code === "EMAIL_OTP_EXPIRED") return "This code has expired. Request a new one.";
  if (code === "EMAIL_OTP_ATTEMPTS_EXCEEDED") return "Too many attempts. Request a new code.";
  if (code === "EMAIL_OTP_COOLDOWN") return "Please wait before requesting another code.";
  return error.response?.data?.message || "We couldn't verify that code. Please try again.";
}

export default function VerifyEmailScreen({ navigation, route }) {
  const email = route?.params?.email || "";
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [resending, setResending] = useState(false); const [cooldown, setCooldown] = useState(60); const [error, setError] = useState(""); const [dialog, setDialog] = useState(false);
  useEffect(() => { if (cooldown <= 0) return undefined; const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000); return () => clearInterval(timer); }, [cooldown]);
  const submit = async () => { if (code.length !== 6 || busy) { setError("Enter the 6-digit code from your email."); return; } setBusy(true); setError(""); try { await verifyEmail(email, code); setDialog(true); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } };
  const resend = async () => { if (cooldown > 0 || resending) return; setResending(true); setError(""); try { await sendVerificationEmail(email); setCooldown(60); } catch (e) { setError(friendlyError(e)); } finally { setResending(false); } };
  const masked = email ? `${email.slice(0, 1)}***${email.includes("@") ? email.slice(email.indexOf("@")) : ""}` : "your email";
  return <SafeAreaView style={styles.flex} edges={["top", "bottom"]}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}><View style={styles.container}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Verify Email</Text></TouchableOpacity><View style={styles.content}><Text style={styles.title}>Check your email</Text><Text style={styles.subtitle}>We sent a 6-digit verification code to:</Text><Text style={styles.email}>{masked}</Text><OtpInput value={code} onChangeText={setCode} disabled={busy} accessibilityLabel="Email verification code"/><TouchableOpacity style={[styles.button, busy && styles.disabled]} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Verify Email</Text>}</TouchableOpacity><TouchableOpacity onPress={resend} disabled={cooldown > 0 || resending}><Text style={[styles.resend, (cooldown > 0 || resending) && styles.muted]}>{resending ? "Sending..." : cooldown > 0 ? `Resend code in 00:${String(cooldown).padStart(2, "0")}` : "Resend code"}</Text></TouchableOpacity>{error ? <Text style={styles.error}>{error}</Text> : null}</View></View></KeyboardAvoidingView><AuthDialog visible={dialog} title="Email verified ✓" message="Your account is ready. Sign in to continue." actionLabel="Go to Login" onAction={() => { setDialog(false); navigation.navigate("Auth", { email }); }} /></SafeAreaView>;
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.background }, container: { flex: 1, padding: spacing.lg }, back: { color: colors.navy, fontSize: 16, fontWeight: "800" }, content: { flex: 1, justifyContent: "center" }, title: { color: colors.primary, fontSize: 28, fontWeight: "900" }, subtitle: { color: colors.muted, lineHeight: 21, marginTop: spacing.md }, email: { color: colors.primary, fontWeight: "800", marginTop: 4, marginBottom: spacing.lg }, button: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 16, alignItems: "center", marginTop: spacing.lg }, disabled: { opacity: .6 }, buttonText: { color: colors.white, fontWeight: "800", fontSize: 16 }, resend: { color: colors.navy, textAlign: "center", fontWeight: "800", marginTop: spacing.lg }, muted: { color: colors.muted }, error: { color: colors.danger, textAlign: "center", marginTop: spacing.md } });
