import React from "react";
import { StyleSheet, Text } from "react-native";
import colors, { spacing } from "../../constants/colors";

export default function SettingsSection({ children }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  section: { color: colors.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1.2, marginTop: spacing.lg, marginBottom: spacing.sm },
});
