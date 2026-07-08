import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors, { spacing } from "../constants/colors";

export default function EmptyState({ icon = "🗺️", title, message }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 19,
  },
});
