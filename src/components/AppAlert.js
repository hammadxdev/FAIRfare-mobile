import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import colors, { radius, spacing } from "../constants/colors";

export default function AppAlert({ visible, title, message, actionLabel = "OK", onClose }) {
  if (!visible) return null;
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.icon}><Text style={styles.iconText}>i</Text></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><Text style={styles.buttonText}>{actionLabel}</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.52)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 360, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", elevation: 8, shadowColor: "#000", shadowOpacity: .18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  iconText: { color: colors.onPrimaryContainer, fontSize: 24, fontWeight: "900" },
  title: { color: colors.primary, fontSize: 18, fontWeight: "900", textAlign: "center" },
  message: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: spacing.sm },
  button: { minWidth: 110, minHeight: 44, borderRadius: radius.full, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: "900" },
});
