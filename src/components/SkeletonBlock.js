import React from "react";
import { View, StyleSheet } from "react-native";
import colors, { radius, spacing } from "../constants/colors";

export function SkeletonBlock({ width = "100%", height = 16, radiusValue = radius.sm, style }) {
  return <View accessibilityLabel="Loading" style={[styles.block, { width, height, borderRadius: radiusValue }, style]} />;
}

export function FareResultsSkeleton() {
  return <View style={styles.container}>{[1, 2, 3].map((item) => <View key={item} style={styles.row}><SkeletonBlock width={34} height={34} radiusValue={17} /><View style={styles.copy}><SkeletonBlock width="58%" /><SkeletonBlock width="76%" height={12} style={styles.line} /></View><View style={styles.price}><SkeletonBlock width={58} /><SkeletonBlock width={42} height={11} style={styles.line} /></View></View>)}</View>;
}

const styles = StyleSheet.create({ block: { backgroundColor: colors.surfaceContainerHigh, overflow: "hidden" }, container: { gap: spacing.sm, paddingVertical: spacing.sm }, row: { minHeight: 72, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: "row", alignItems: "center", gap: spacing.sm }, copy: { flex: 1, gap: spacing.xs }, price: { alignItems: "flex-end" }, line: { marginTop: spacing.xs } });
