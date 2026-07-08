import React from "react";
import { View, Text, StyleSheet } from "react-native";
import LogoMark from "./LogoMark";
import colors, { spacing } from "../constants/colors";

export default function AppHeader({
  title = "FAIRfair",
  subtitle = "Compare fares. Choose fair.",
  showLogo = true,
}) {
  return (
    <View style={styles.container}>
      {showLogo && <LogoMark size={42} style={styles.logo} />}
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  logo: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
});
