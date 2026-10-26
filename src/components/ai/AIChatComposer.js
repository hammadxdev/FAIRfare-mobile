import React from "react";
import { ActivityIndicator, TextInput, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { radius, spacing } from "../../constants/colors";

export default function AIChatComposer({ value, onChangeText, onSend, loading, onLayout }) {
  const insets = useSafeAreaInsets();
  const disabled = !value.trim() || loading;
  return <View
    onLayout={onLayout}
    style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}
  >
    <View style={styles.composer}>
      <TextInput value={value} onChangeText={onChangeText} placeholder="Ask about your ride…" placeholderTextColor={colors.muted} multiline maxLength={1000} editable={!loading} style={styles.input} blurOnSubmit={false} scrollEnabled accessibilityLabel="Ride question" accessibilityHint="Type a question for FareRide AI" />
      <TouchableOpacity accessibilityLabel="Send message" accessibilityRole="button" accessibilityState={{ disabled }} style={[styles.send, disabled && styles.disabled]} onPress={onSend} disabled={disabled}>
        {loading ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.sendIcon}>↑</Text>}
      </TouchableOpacity>
    </View>
    <Text style={styles.hint}>FareRide AI uses your ride data to help you decide.</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.background },
  composer: { minHeight: 56, maxHeight: 122, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.outlineVariant },
  input: { flex: 1, minHeight: 40, maxHeight: 104, paddingHorizontal: spacing.xs, paddingVertical: 9, color: colors.primary, fontSize: 15, backgroundColor: "transparent", borderWidth: 0, outlineStyle: "none", textAlignVertical: "top" },
  send: { width: 44, height: 44, borderRadius: 22, padding: 0, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent },
  disabled: { opacity: 0.45 },
  sendIcon: { color: colors.white, fontSize: 22, lineHeight: 22, includeFontPadding: false, fontWeight: "800", textAlign: "center" },
  hint: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 5, marginBottom: 2 },
});
