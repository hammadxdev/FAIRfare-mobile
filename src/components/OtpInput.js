import React, { useEffect, useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import colors, { radius, spacing } from "../constants/colors";

export default function OtpInput({ value, onChangeText, disabled = false, autoFocus = true, accessibilityLabel = "One-time code" }) {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) ref.current?.focus?.(); }, [autoFocus]);
  return <TextInput ref={ref} value={value} onChangeText={(text) => onChangeText(String(text).replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" inputMode="numeric" maxLength={6} editable={!disabled} autoFocus={autoFocus} textContentType="oneTimeCode" autoComplete="sms-otp" accessibilityLabel={accessibilityLabel} style={styles.input} placeholder="______" placeholderTextColor={colors.border} />;
}

const styles = StyleSheet.create({ input: { alignSelf: "stretch", minHeight: 62, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card, color: colors.primary, fontSize: 28, fontWeight: "800", letterSpacing: 12, textAlign: "center", paddingHorizontal: spacing.md, paddingVertical: 12 } });
