import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PrimaryButton from "./PrimaryButton";
import colors, { spacing } from "../constants/colors";

export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try Again",
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry && <PrimaryButton title={retryLabel} onPress={onRetry} style={styles.button} />}
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
    fontSize: 44,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.danger,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  button: {
    marginTop: spacing.lg,
    minWidth: 160,
  },
});
