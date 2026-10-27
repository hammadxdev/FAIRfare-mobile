import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoMark from "./LogoMark";
import colors, { spacing } from "../constants/colors";

export default function AppHeader({
  title = "FareRide",
  subtitle = "Compare fares. Choose fair.",
  showLogo = true,
  compact = false,
  onBack = null,
  actionLabel = null,
  onAction = null,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, compact && styles.compactContainer, { paddingTop: (compact ? spacing.sm : spacing.lg) + insets.top }]}>
      {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable> : null}
      {showLogo && <LogoMark size={compact ? 34 : 42} style={[styles.logo, compact && styles.compactLogo]} />}
      <View style={styles.titleWrap}>
        <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>{subtitle}</Text> : null}
      </View>
      {onAction && actionLabel ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={styles.action}><Text style={styles.actionText}>⌕</Text></Pressable> : null}
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  logo: {
    marginRight: spacing.md,
  },
  back: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center", marginRight: spacing.sm },
  backText: { color: colors.primary, fontSize: 36, lineHeight: 38, fontWeight: "300" },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: "600",
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
  titleWrap: { flex: 1, minWidth: 0 },
  action: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceContainer },
  actionText: { color: colors.forest, fontSize: 25, lineHeight: 28, fontWeight: "800" },
});
