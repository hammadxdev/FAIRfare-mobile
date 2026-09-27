import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { radius, spacing } from "../constants/colors";

export default function AuthDialog({ visible, title, message, actionLabel = "Continue", onAction }) {
  const insets = useSafeAreaInsets();
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onAction}>
    <View style={styles.backdrop}><View style={[styles.dialog, { marginTop: insets.top, marginBottom: insets.bottom }]}>
      <Text style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onAction}><Text style={styles.buttonText}>{actionLabel}</Text></TouchableOpacity>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.46)", alignItems: "center", justifyContent: "center", padding: spacing.lg }, dialog: { width: "100%", backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg }, title: { color: colors.primary, fontSize: 20, fontWeight: "800" }, message: { color: colors.muted, lineHeight: 21, marginVertical: spacing.md }, button: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 15, alignItems: "center" }, buttonText: { color: colors.white, fontWeight: "800" } });
