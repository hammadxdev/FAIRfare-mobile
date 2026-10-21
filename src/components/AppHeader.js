import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoMark from "./LogoMark";
import colors, { spacing } from "../constants/colors";

export default function AppHeader({
  title = "FareRide",
  subtitle = "Compare fares. Choose fair.",
  showLogo = true,
  compact = false,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, compact && styles.compactContainer, { paddingTop: (compact ? spacing.sm : spacing.lg) + insets.top }]}>
      {showLogo && <LogoMark size={compact ? 34 : 42} style={[styles.logo, compact && styles.compactLogo]} />}
      <View>
        <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>{subtitle}</Text> : null}
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
  compactContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  compactLogo: {
    marginRight: spacing.sm,
  },
  compactTitle: {
    fontSize: 18,
  },
  compactSubtitle: {
    fontSize: 11,
  },
});
