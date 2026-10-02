import React from "react";
import { Modal, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import colors, { radius, spacing } from "../constants/colors";

export default function LoadingOverlay({ visible }) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Comparing fares</Text>
          <Text style={styles.subtitle}>Finding the fairest price</Text>
          <ActivityIndicator accessibilityLabel="Comparing fares" color={colors.accent} size="small" style={styles.loader} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    width: "80%",
    maxWidth: 320,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  loader: { marginTop: spacing.lg },
});
