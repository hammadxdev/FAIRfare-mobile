import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoMark from "./LogoMark";
import colors, { spacing } from "../constants/colors";

export default function AppHeader({
  title = "FairFare",
  subtitle = "Compare fares. Choose fair.",
  showLogo = true,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: spacing.lg + insets.top }]}>
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
