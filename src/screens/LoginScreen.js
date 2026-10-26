import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import colors, { radius, spacing } from "../constants/colors";
import LogoMark from "../components/LogoMark";
import OtpInput from "../components/OtpInput";

const validEmail = (value) => /^\S+@\S+\.\S+$/.test(value.trim());
export default function LoginScreen() {
  const { requestEmailOtp, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState("EMAIL");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setTimeout(
      () => setCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  const send = async () => {
    const normalized = email.trim().toLowerCase();
    if (!validEmail(normalized) || normalized.length > 254) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await requestEmailOtp(normalized);
      setEmail(normalized);
      setCode("");
      setPhase("OTP");
      setCooldown(Math.max(30, Number(result.cooldownSeconds) || 60));
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "We could not send a code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await verifyEmailOtp(email, code);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "That code could not be verified. Check it and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <LogoMark size={54} />
            </View>
            <Text style={styles.title}>FARERIDE</Text>
            <Text style={styles.subtitle}>Compare fares. Choose fair.</Text>
          </View>
          <Text style={styles.heading}>
            {phase === "EMAIL" ? "Continue with email" : "Check your email"}
          </Text>
          <Text style={styles.description}>
            {phase === "EMAIL"
              ? "Enter your email and we’ll send a one-time verification code."
              : `Enter the 6-digit code sent to ${email}.`}
          </Text>
          {phase === "EMAIL" ? (
            <>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                editable={!busy}
                returnKeyType="send"
                onSubmitEditing={send}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.button, busy && styles.disabled]}
                onPress={send}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Send verification code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Verification code</Text>
              <OtpInput
                value={code}
                onChangeText={setCode}
                disabled={busy}
                accessibilityLabel="Email verification code"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.button, busy && styles.disabled]}
                onPress={verify}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Verify and continue</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={send} disabled={busy || cooldown > 0}>
                <Text
                  style={[styles.link, (busy || cooldown > 0) && styles.muted]}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPhase("EMAIL");
                  setCode("");
                  setError("");
                }}
                disabled={busy}
              >
                <Text style={styles.changeEmail}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: "center", padding: spacing.lg },
  brand: { alignItems: "center", marginBottom: spacing.xl },
  logo: { backgroundColor: colors.white, borderRadius: 40, padding: 10 },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 2,
    marginTop: spacing.md,
  },
  subtitle: { color: colors.muted, marginTop: 4 },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.muted,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 15,
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  error: { color: colors.danger, marginTop: spacing.sm },
  link: {
    color: colors.navy,
    textAlign: "center",
    fontWeight: "700",
    marginTop: spacing.lg,
  },
  muted: { opacity: 0.45 },
  changeEmail: {
    color: colors.muted,
    textAlign: "center",
    fontWeight: "700",
    marginTop: spacing.md,
  },
});
